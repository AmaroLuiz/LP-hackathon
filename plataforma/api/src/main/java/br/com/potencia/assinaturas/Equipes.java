package br.com.potencia.assinaturas;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.contas.ContaService;
import br.com.potencia.contas.UsuarioSessao;

/**
 * Equipe do plano Negócio: o titular convida até (máximo de pessoas − 1)
 * pessoas por e-mail. O convite é um link de uso único (só o hash fica no
 * banco). Quem aceita passa a ver os cursos do plano enquanto a assinatura do
 * titular der acesso.
 */
@Service
@Transactional
class Equipes {

	static final Duration VALIDADE_CONVITE = Duration.ofDays(7);

	private static final SecureRandom ALEATORIO = new SecureRandom();

	record MembroItem(UUID id, String email, String nome, String status, Instant convidadoEm, Instant entrouEm,
			Instant conviteExpiraEm) {
	}

	record EquipeResposta(String plano, int maxPessoas, int vagas, List<MembroItem> membros) {
	}

	record ConviteResposta(String titular, String plano, String email, boolean valido) {
	}

	record Participacao(UUID membroId, String titular, String plano, boolean daAcesso) {
	}

	private final AssinaturaRepository assinaturas;

	private final MembroEquipeRepository membros;

	private final PlanoRepository planos;

	private final ContaService contas;

	private final Notificacoes notificacoes;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	Equipes(AssinaturaRepository assinaturas, MembroEquipeRepository membros, PlanoRepository planos,
			ContaService contas, Notificacoes notificacoes, ApplicationEventPublisher eventos, Clock relogio) {
		this.assinaturas = assinaturas;
		this.membros = membros;
		this.planos = planos;
		this.contas = contas;
		this.notificacoes = notificacoes;
		this.eventos = eventos;
		this.relogio = relogio;
	}

	@Transactional(readOnly = true)
	Optional<EquipeResposta> equipe(UUID titularId) {
		var agora = relogio.instant();
		return assinaturaComEquipe(titularId, agora).map(a -> resposta(a, plano(a), agora));
	}

	EquipeResposta convidar(UUID titularId, String emailInformado, Autor autor) {
		var agora = relogio.instant();
		var a = assinaturaComEquipe(titularId, agora).orElseThrow(() -> ErroApi.conflito(null,
				"Convidar a equipe é do plano Negócio. Troque de plano em \"Minha assinatura\"."));
		var plano = plano(a);
		var email = emailInformado.strip().toLowerCase(Locale.ROOT);
		var titular = contas.buscar(titularId).orElseThrow();
		if (email.equals(titular.email())) {
			throw ErroApi.invalido("email", "Você já faz parte da assinatura. Convide outra pessoa.");
		}
		var lista = membros.findByAssinaturaIdOrderByConvidadoEm(a.getId());
		if (lista.stream().anyMatch(m -> m.getEmail().equals(email) && m.ocupaVaga(agora))) {
			throw ErroApi.conflito("email", "Esta pessoa já está na equipe ou tem um convite em aberto.");
		}
		if (vagas(plano, lista, agora) <= 0) {
			throw ErroApi.conflito("email", "Não há vagas. Remova alguém da equipe para convidar outra pessoa.");
		}
		var token = gerarToken();
		var expira = agora.plus(VALIDADE_CONVITE);
		membros.save(MembroEquipe.convite(a.getId(), email, hash(token), agora, expira));
		notificacoes.convite(email, titular.nome(), plano.getNome(), token, expira);
		eventos.publishEvent(EventoAuditoria.de(autor, "equipe.convite", "usuario", titularId, "Convidou " + email + " para a equipe"));
		return resposta(a, plano, agora);
	}

	/** Remove alguém da equipe (ou cancela um convite). */
	EquipeResposta remover(UUID titularId, UUID membroId, Autor autor) {
		var agora = relogio.instant();
		var a = assinaturaComEquipe(titularId, agora)
			.orElseThrow(() -> ErroApi.naoEncontrado("Você não tem uma equipe."));
		var m = membros.findById(membroId)
			.filter(x -> x.getAssinaturaId().equals(a.getId()) && x.getStatus() != MembroEquipe.Status.REMOVIDO)
			.orElseThrow(() -> ErroApi.naoEncontrado("Pessoa não encontrada na equipe."));
		m.remover(agora);
		eventos.publishEvent(EventoAuditoria.de(autor, "equipe.remocao", "usuario", titularId, "Tirou " + m.getEmail() + " da equipe"));
		return resposta(a, plano(a), agora);
	}

	@Transactional(readOnly = true)
	ConviteResposta verConvite(String token) {
		var agora = relogio.instant();
		var m = convite(token);
		var a = assinaturas.findById(m.getAssinaturaId()).orElseThrow();
		var titular = contas.buscar(a.getUsuarioId()).map(u -> u.nome()).orElse("Alguém");
		return new ConviteResposta(titular, plano(a).getNome(), mascarar(m.getEmail()),
				m.isConviteValido(agora) && a.daAcesso(agora));
	}

	Participacao aceitar(UsuarioSessao usuario, String token) {
		var agora = relogio.instant();
		var m = convite(token);
		var a = assinaturas.findById(m.getAssinaturaId()).orElseThrow();
		if (!m.isConviteValido(agora) || !a.daAcesso(agora)) {
			throw ErroApi.invalido("Este convite expirou. Peça um novo para quem convidou você.");
		}
		if (!m.getEmail().equals(usuario.email())) {
			throw ErroApi.proibido("CONVITE_OUTRO_EMAIL",
					"Este convite foi enviado para " + mascarar(m.getEmail()) + ". Entre com a conta desse e-mail.");
		}
		if (a.getUsuarioId().equals(usuario.id())) {
			throw ErroApi.invalido("Você é o titular desta assinatura.");
		}
		m.aceitar(usuario.id(), agora);
		// O convite chegou neste e-mail: abrir o link prova que ele é da pessoa.
		contas.confirmarEmailPorLink(usuario.id());
		var titular = contas.buscar(a.getUsuarioId()).map(u -> u.nome()).orElse("Titular");
		return new Participacao(m.getId(), titular, plano(a).getNome(), true);
	}

	@Transactional(readOnly = true)
	List<Participacao> participacoes(UUID usuarioId) {
		var agora = relogio.instant();
		return membros.findByUsuarioIdAndStatus(usuarioId, MembroEquipe.Status.ATIVO)
			.stream()
			.flatMap(m -> assinaturas.findById(m.getAssinaturaId()).stream().map(a -> {
				var p = plano(a);
				return new Participacao(m.getId(), contas.buscar(a.getUsuarioId()).map(u -> u.nome()).orElse("Titular"),
						p.getNome(), a.daAcesso(agora) && p.temEquipe());
			}))
			.toList();
	}

	/** A própria pessoa sai da equipe. */
	void sair(UUID usuarioId, UUID membroId) {
		var m = membros.findById(membroId)
			.filter(x -> usuarioId.equals(x.getUsuarioId()) && x.getStatus() == MembroEquipe.Status.ATIVO)
			.orElseThrow(() -> ErroApi.naoEncontrado("Você não está nesta equipe."));
		m.remover(relogio.instant());
	}

	// -------------------------------------------------------------------------

	private Optional<Assinatura> assinaturaComEquipe(UUID titularId, Instant agora) {
		return assinaturas.findByUsuarioIdOrderByCriadaEmDesc(titularId)
			.stream()
			.filter(a -> a.daAcesso(agora))
			.filter(a -> plano(a).temEquipe())
			.findFirst();
	}

	private EquipeResposta resposta(Assinatura a, Plano plano, Instant agora) {
		var lista = membros.findByAssinaturaIdOrderByConvidadoEm(a.getId())
			.stream()
			.filter(m -> m.ocupaVaga(agora))
			.toList();
		var itens = lista.stream()
			.map(m -> new MembroItem(m.getId(), m.getEmail(),
					m.getUsuarioId() == null ? null : contas.buscar(m.getUsuarioId()).map(u -> u.nome()).orElse(null),
					m.getStatus().name(), m.getConvidadoEm(), m.getEntrouEm(), m.getConviteExpiraEm()))
			.toList();
		return new EquipeResposta(plano.getNome(), plano.getMaxPessoas(), vagas(plano, lista, agora), itens);
	}

	private static int vagas(Plano plano, List<MembroEquipe> lista, Instant agora) {
		long ocupadas = lista.stream().filter(m -> m.ocupaVaga(agora)).count();
		return (int) Math.max(0, plano.getMaxPessoas() - 1 - ocupadas);
	}

	private MembroEquipe convite(String token) {
		if (token == null || token.isBlank()) {
			throw ErroApi.naoEncontrado("Convite não encontrado.");
		}
		return membros.findByTokenHash(hash(token)).orElseThrow(() -> ErroApi.naoEncontrado("Convite não encontrado ou já usado."));
	}

	private Plano plano(Assinatura a) {
		return planos.findById(a.getPlanoId()).orElseThrow();
	}

	/** "maria.silva@gmail.com" → "ma•••@gmail.com" (a página pública não mostra o e-mail inteiro). */
	static String mascarar(String email) {
		int arroba = email.indexOf('@');
		if (arroba <= 0) {
			return "•••";
		}
		return email.substring(0, Math.min(2, arroba)) + "•••" + email.substring(arroba);
	}

	private static String gerarToken() {
		byte[] bytes = new byte[32];
		ALEATORIO.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static String hash(String token) {
		try {
			return HexFormat.of()
				.formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
