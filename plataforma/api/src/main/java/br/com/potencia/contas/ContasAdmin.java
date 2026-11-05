package br.com.potencia.contas;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.persistence.criteria.Predicate;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.compartilhado.Pagina;

/**
 * Contas vistas do painel admin: busca, detalhe e as ações de suporte (papel,
 * bloqueio, e-mails, sessões). Toda ação vai para a auditoria. Mudar papel,
 * bloquear ou forçar nova senha derruba as sessões da pessoa, para valer na hora.
 */
@Service
@Transactional
public class ContasAdmin {

	static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	public record UsuarioLinha(UUID id, String nome, String email, Papel papel, boolean emailVerificado,
			boolean bloqueado, Instant criadoEm, Instant ultimoAcessoEm) {

		static UsuarioLinha de(Usuario u) {
			return new UsuarioLinha(u.getId(), u.getNome(), u.getEmail(), u.getPapel(), u.isEmailVerificado(),
					u.isBloqueado(), u.getCriadoEm(), u.getUltimoAcessoEm());
		}

	}

	/** Uma sessão aberta. O id da sessão não sai: ele vale como senha. */
	public record SessaoResumo(Instant criadaEm, Instant ultimoUso) {
	}

	public record UsuarioDetalhe(UUID id, String nome, String email, Papel papel, Instant emailVerificadoEm,
			Instant bloqueadoEm, boolean deveTrocarSenha, String segmentoNegocio, String nomeNegocio, Objetivo objetivo,
			Familiaridade familiaridade, boolean aceitouMarketing, Instant aceitouTermosEm, Instant criadoEm,
			Instant ultimoAcessoEm, List<SessaoResumo> sessoes) {
	}

	/**
	 * @param somente se não for nulo, restringe a esses ids (ex.: assinantes de um plano)
	 */
	public record Filtro(String busca, Papel papel, Boolean verificado, Boolean bloqueado, Set<UUID> somente) {
	}

	public record CadastrosNoDia(LocalDate dia, long cadastros) {
	}

	public record Metricas(long alunos, long verificados, long novos7, long novos30, List<CadastrosNoDia> porDia) {
	}

	private final UsuarioRepository usuarios;

	private final ContaService contas;

	private final Sessoes sessoes;

	private final PasswordEncoder senhas;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	ContasAdmin(UsuarioRepository usuarios, ContaService contas, Sessoes sessoes, PasswordEncoder senhas,
			ApplicationEventPublisher eventos, Clock relogio) {
		this.usuarios = usuarios;
		this.contas = contas;
		this.sessoes = sessoes;
		this.senhas = senhas;
		this.eventos = eventos;
		this.relogio = relogio;
	}

	@Transactional(readOnly = true)
	public Pagina<UsuarioLinha> buscar(Filtro f, Integer pagina, Integer tamanho) {
		var pedido = Pagina.pedido(pagina, tamanho, Sort.by(Sort.Direction.DESC, "criadoEm"));
		if (f.somente() != null && f.somente().isEmpty()) {
			return new Pagina<>(List.of(), pedido.getPageNumber() + 1, pedido.getPageSize(), 0);
		}
		return Pagina.de(usuarios.findAll(especificacao(f), pedido), UsuarioLinha::de);
	}

	/** Para exportar (CSV): até 10 mil linhas, das mais novas para as mais antigas. */
	@Transactional(readOnly = true)
	public List<UsuarioLinha> todos(Filtro f) {
		if (f.somente() != null && f.somente().isEmpty()) {
			return List.of();
		}
		return usuarios.findAll(especificacao(f), PageRequest.of(0, 10_000, Sort.by(Sort.Direction.DESC, "criadoEm")))
			.map(UsuarioLinha::de)
			.getContent();
	}

	@Transactional(readOnly = true)
	public Optional<UsuarioDetalhe> detalhe(UUID id) {
		return usuarios.findById(id).filter(Usuario::isAtivo).map(u -> new UsuarioDetalhe(u.getId(), u.getNome(),
				u.getEmail(), u.getPapel(), u.getEmailVerificadoEm(), u.getBloqueadoEm(), u.isDeveTrocarSenha(),
				u.getSegmentoNegocio(), u.getNomeNegocio(), u.getObjetivo(), u.getFamiliaridade(), u.isAceitouMarketing(),
				u.getAceitouTermosEm(), u.getCriadoEm(), u.getUltimoAcessoEm(),
				sessoes.ativas(u.getId())
					.stream()
					.map(s -> new SessaoResumo(s.getCreationTime(), s.getLastAccessedTime()))
					.sorted((a, b) -> b.ultimoUso().compareTo(a.ultimoUso()))
					.toList()));
	}

	/** Nome de cada conta (para mostrar quem concedeu um acesso, por exemplo). */
	@Transactional(readOnly = true)
	public Map<UUID, String> nomes(Collection<UUID> ids) {
		return usuarios.findAllById(ids).stream().collect(Collectors.toMap(Usuario::getId, Usuario::getNome));
	}

	public record Pessoa(UUID id, String nome, String email) {
	}

	/** Nome e e-mail de cada conta (listas do painel). */
	@Transactional(readOnly = true)
	public Map<UUID, Pessoa> pessoas(Collection<UUID> ids) {
		return usuarios.findAllById(ids)
			.stream()
			.collect(Collectors.toMap(Usuario::getId, u -> new Pessoa(u.getId(), u.getNome(), u.getEmail())));
	}

	/** Ids das contas cujo nome ou e-mail contém o texto (até 10 mil). */
	@Transactional(readOnly = true)
	public Set<UUID> idsPorBusca(String busca) {
		return todos(new Filtro(busca, null, null, null, null)).stream()
			.map(UsuarioLinha::id)
			.collect(Collectors.toSet());
	}

	public void alterarPapel(UUID id, Papel novo, Autor admin) {
		var u = alvo(id, admin, "mudar o seu próprio papel");
		if (u.getPapel() == novo) {
			return;
		}
		if (u.getPapel() == Papel.ADMIN && !u.isBloqueado() && adminsAtivos() <= 1) {
			throw ErroApi.conflito("papel", "Esta é a única conta de admin. Promova outra pessoa antes.");
		}
		var antes = u.getPapel();
		u.alterarPapel(novo, agora());
		sessoes.encerrarTodas(id);
		eventos.publishEvent(EventoAuditoria.alteracao(admin, "usuario.papel", "usuario", id,
				(novo == Papel.ADMIN ? "Promoveu " : "Rebaixou ") + u.getEmail() + (novo == Papel.ADMIN ? " a admin" : " a aluno"),
				Map.of("papel", antes.name()), Map.of("papel", novo.name())));
	}

	public void bloquear(UUID id, boolean bloquear, String motivo, Autor admin) {
		var u = alvo(id, admin, "bloquear a sua própria conta");
		if (bloquear == u.isBloqueado()) {
			return;
		}
		if (bloquear && u.getPapel() == Papel.ADMIN && adminsAtivos() <= 1) {
			throw ErroApi.conflito(null, "Esta é a única conta de admin ativa. Ela não pode ser bloqueada.");
		}
		if (bloquear) {
			u.bloquear(agora());
			sessoes.encerrarTodas(id);
		}
		else {
			u.desbloquear(agora());
		}
		var texto = motivo == null || motivo.isBlank() ? "" : " (" + motivo.strip() + ")";
		eventos.publishEvent(EventoAuditoria.alteracao(admin, bloquear ? "usuario.bloqueado" : "usuario.desbloqueado",
				"usuario", id, (bloquear ? "Bloqueou " : "Desbloqueou ") + u.getEmail() + texto,
				Map.of("bloqueado", !bloquear), Map.of("bloqueado", bloquear)));
	}

	public void reenviarVerificacao(UUID id, Autor admin) {
		var u = ativo(id);
		if (u.isEmailVerificado()) {
			throw ErroApi.conflito(null, "Este e-mail já está confirmado.");
		}
		contas.reenviarVerificacao(id);
		eventos.publishEvent(EventoAuditoria.de(admin, "usuario.verificacao_reenviada", "usuario", id,
				"Reenviou a confirmação de e-mail para " + u.getEmail()));
	}

	/** A senha atual deixa de valer, as sessões caem e a pessoa recebe o link para criar outra. */
	public void forcarRedefinicao(UUID id, Autor admin) {
		var u = alvo(id, admin, "forçar a troca da sua própria senha (use \"Trocar senha\")");
		// Senha aleatória que ninguém conhece (32 bytes: cabe no limite de 72 do bcrypt).
		u.invalidarSenha(senhas.encode(Tokens.gerar().puro()), agora());
		sessoes.encerrarTodas(id);
		contas.enviarLinkDeRedefinicao(u, true);
		eventos.publishEvent(EventoAuditoria.de(admin, "usuario.redefinicao_forcada", "usuario", id,
				"Forçou a redefinição de senha de " + u.getEmail()));
	}

	public void encerrarSessoes(UUID id, Autor admin) {
		var u = ativo(id);
		sessoes.encerrarTodas(id);
		eventos.publishEvent(EventoAuditoria.de(admin, "usuario.sessoes_encerradas", "usuario", id,
				"Encerrou as sessões de " + u.getEmail()));
	}

	@Transactional(readOnly = true)
	public Metricas metricas() {
		var agora = agora();
		var hoje = LocalDate.ofInstant(agora, FUSO);
		var inicio = hoje.minusDays(29);
		var cadastros = usuarios.cadastrosDesde(Papel.USUARIO, inicio.atStartOfDay(FUSO).toInstant());
		var porDia = new TreeMap<LocalDate, Long>();
		for (var d = inicio; !d.isAfter(hoje); d = d.plusDays(1)) {
			porDia.put(d, 0L);
		}
		cadastros.forEach(c -> porDia.merge(LocalDate.ofInstant(c, FUSO), 1L, Long::sum));
		long novos7 = cadastros.stream().filter(c -> !c.isBefore(agora.minus(Duration.ofDays(7)))).count();
		long novos30 = cadastros.stream().filter(c -> !c.isBefore(agora.minus(Duration.ofDays(30)))).count();
		var serie = new ArrayList<CadastrosNoDia>();
		porDia.forEach((dia, n) -> serie.add(new CadastrosNoDia(dia, n)));
		return new Metricas(usuarios.countByPapelAndExcluidoEmIsNull(Papel.USUARIO),
				usuarios.countByPapelAndExcluidoEmIsNullAndEmailVerificadoEmIsNotNull(Papel.USUARIO), novos7, novos30,
				serie);
	}

	// -------------------------------------------------------------------------

	private static Specification<Usuario> especificacao(Filtro f) {
		return (raiz, consulta, cb) -> {
			var condicoes = new ArrayList<Predicate>();
			condicoes.add(cb.isNull(raiz.get("excluidoEm")));
			if (f.busca() != null && !f.busca().isBlank()) {
				var termo = "%" + f.busca().strip().toLowerCase().replace("%", "").replace("_", "") + "%";
				condicoes.add(cb.or(cb.like(cb.lower(raiz.get("nome")), termo), cb.like(raiz.get("email"), termo)));
			}
			if (f.papel() != null) {
				condicoes.add(cb.equal(raiz.get("papel"), f.papel()));
			}
			if (f.verificado() != null) {
				condicoes.add(f.verificado() ? cb.isNotNull(raiz.get("emailVerificadoEm"))
						: cb.isNull(raiz.get("emailVerificadoEm")));
			}
			if (f.bloqueado() != null) {
				condicoes.add(f.bloqueado() ? cb.isNotNull(raiz.get("bloqueadoEm")) : cb.isNull(raiz.get("bloqueadoEm")));
			}
			if (f.somente() != null) {
				condicoes.add(raiz.get("id").in(f.somente()));
			}
			return cb.and(condicoes.toArray(Predicate[]::new));
		};
	}

	/** Conta que o admin pode alterar: existe e não é a dele (evita se trancar do lado de fora). */
	private Usuario alvo(UUID id, Autor admin, String oQue) {
		if (id.equals(admin.id())) {
			throw ErroApi.proibido("Por segurança, não é possível " + oQue + " pelo painel.");
		}
		return ativo(id);
	}

	private Usuario ativo(UUID id) {
		return usuarios.findById(id)
			.filter(Usuario::isAtivo)
			.orElseThrow(() -> ErroApi.naoEncontrado("Conta não encontrada."));
	}

	private long adminsAtivos() {
		return usuarios.countByPapelAndExcluidoEmIsNullAndBloqueadoEmIsNull(Papel.ADMIN);
	}

	private Instant agora() {
		return relogio.instant();
	}

}
