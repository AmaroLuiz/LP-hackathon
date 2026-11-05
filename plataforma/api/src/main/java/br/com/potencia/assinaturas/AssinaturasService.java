package br.com.potencia.assinaturas;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.persistence.criteria.Predicate;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.compartilhado.Pagina;
import br.com.potencia.compartilhado.SiteDesatualizado;
import br.com.potencia.contas.ContaService;

/**
 * API pública do módulo de assinaturas: quais cursos cada aluno pode assistir,
 * a contratação no gateway, troca de plano, cancelamento e reativação.
 */
@Service
@Transactional(readOnly = true)
public class AssinaturasService {

	/** De onde vem o acesso a um curso. */
	public enum Origem {

		ASSINATURA, ACESSO_MANUAL

	}

	/** Checkout aberto há menos que isso é reaproveitado (a página do gateway vale 60 min). */
	static final Duration REAPROVEITAR_CHECKOUT = Duration.ofMinutes(50);

	public record AssinaturaResposta(UUID id, String planoId, String planoNome, StatusAssinatura status,
			boolean daAcesso, Instant inicio, Instant fimPeriodoAtual) {
	}

	/** Resposta do "Assinar": aprovada na hora (local) ou com a página de pagamento do gateway. */
	public record AssinaturaIniciada(UUID id, String planoId, String planoNome, StatusAssinatura status,
			boolean daAcesso, boolean fundador, String urlPagamento) {
	}

	public record PlanoResumo(String id, String nome, int precoCentavos, int maxPessoas) {

		static PlanoResumo de(Plano p) {
			return new PlanoResumo(p.getId(), p.getNome(), p.getPrecoCentavos(), p.getMaxPessoas());
		}

	}

	public record PagamentoResposta(UUID id, int valorCentavos, String metodo, String status, LocalDate vencimento,
			Instant pagoEm, String urlFatura) {

		static PagamentoResposta de(Pagamento p) {
			return new PagamentoResposta(p.getId(), p.getValorCentavos(), p.getMetodo(), p.getStatus().name(),
					p.getVencimento(), p.getPagoEm(), p.getUrlFatura());
		}

	}

	public record ProximaCobranca(LocalDate data, int valorCentavos) {
	}

	/**
	 * Tudo o que "Minha assinatura" mostra.
	 * @param mesesComDesconto cobranças que ainda saem com desconto (fundador ou cupom)
	 * @param cupom código do cupom que deu o desconto (nulo: sem cupom)
	 * @param urlPagamento checkout ainda aberto (assinatura esperando o primeiro pagamento)
	 */
	public record MinhaAssinatura(UUID id, PlanoResumo plano, StatusAssinatura status, boolean daAcesso,
			Instant inicio, Instant fimPeriodoAtual, Instant fimCarencia, ProximaCobranca proximaCobranca,
			String metodo, boolean fundador, int descontoPercentual, int mesesComDesconto, Instant precoTravadoAte,
			PlanoResumo planoAgendado, Instant canceladaEm, String motivoCancelamento, boolean podeReativar,
			String urlPagamento, List<PagamentoResposta> pagamentos, String cupom) {
	}

	public record CondicaoPublica(int descontoPercentual, int mesesDesconto, int mesesPrecoTravado, Instant validaAte) {
	}

	/** Se a pessoa tem direito à condição de fundador agora. */
	public record CondicaoParaVoce(boolean elegivel, int descontoPercentual, int mesesDesconto, int mesesPrecoTravado) {
	}

	/** Um plano visto da edição de um curso: se o curso está nele. */
	public record PlanoDoCurso(String id, String nome, int precoCentavos, boolean incluido) {
	}

	public record AcessoManualResposta(UUID id, Long cursoId, String planoId, String planoNome, String motivo,
			UUID concedidoPor, Instant expiraEm, Instant criadoEm, boolean vigente) {
	}

	public record PlanoAtivo(String planoId, String nome, int precoCentavos, long assinaturas) {
	}

	public record ReceitaDoMes(String mes, long centavos) {
	}

	/**
	 * @param receitaMensalCentavos MRR: soma do valor da próxima cobrança das assinaturas ativas
	 * (já com o desconto de fundador)
	 * @param receitaConfirmadaNoMesCentavos pagamentos confirmados desde o dia 1º
	 */
	public record Metricas(List<PlanoAtivo> ativasPorPlano, long assinaturasAtivas, long receitaMensalCentavos,
			long receitaConfirmadaNoMesCentavos, long emAtraso, long cancelamentosNoMes, long fundadores,
			List<ReceitaDoMes> receitaPorMes) {
	}

	// --- Painel: lista e detalhe ------------------------------------------------

	public record FiltroAssinaturas(StatusAssinatura status, String planoId, Boolean fundador, Set<UUID> usuarios) {
	}

	public record AssinaturaLinha(UUID id, UUID usuarioId, String planoId, String planoNome, StatusAssinatura status,
			boolean daAcesso, int precoCentavos, int valorProximaCobranca, boolean fundador, String gateway,
			String gatewayId, Instant inicio, Instant fimPeriodoAtual, Instant canceladaEm) {
	}

	public record EventoResposta(String id, String tipo, Instant recebidoEm, Instant processadoEm, int tentativas,
			String erro) {

		static EventoResposta de(EventoGateway e) {
			return new EventoResposta(e.getId(), e.getTipo(), e.getRecebidoEm(), e.getProcessadoEm(), e.getTentativas(),
					e.getErro());
		}

	}

	public record MembroResposta(UUID id, String email, UUID usuarioId, String status, Instant convidadoEm,
			Instant entrouEm, Instant conviteExpiraEm) {

		static MembroResposta de(MembroEquipe m) {
			return new MembroResposta(m.getId(), m.getEmail(), m.getUsuarioId(), m.getStatus().name(),
					m.getConvidadoEm(), m.getEntrouEm(), m.getConviteExpiraEm());
		}

	}

	public record AssinaturaAdmin(AssinaturaLinha assinatura, String gatewayCliente, String checkoutId,
			String motivoCancelamento, PlanoResumo planoAgendado, int descontoPercentual, int mesesDesconto,
			Instant precoTravadoAte, int pagamentosConfirmados, String linkNoGateway, List<PagamentoResposta> pagamentos,
			List<EventoResposta> eventos, List<MembroResposta> equipe) {
	}

	private final AssinaturaRepository assinaturas;

	private final AcessoManualRepository acessosManuais;

	private final PlanoRepository planos;

	private final PagamentoRepository pagamentos;

	private final MembroEquipeRepository membros;

	private final EventoGatewayRepository eventosGateway;

	private final CondicaoFundadorRepository condicao;

	private final FundadorEmailRepository listaDeEspera;

	private final ObjectProvider<GatewayPagamento> gateway;

	private final Cobrancas cobrancas;

	private final Cupons cupons;

	private final Notificacoes notificacoes;

	private final ContaService contas;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	AssinaturasService(AssinaturaRepository assinaturas, AcessoManualRepository acessosManuais, PlanoRepository planos,
			PagamentoRepository pagamentos, MembroEquipeRepository membros, EventoGatewayRepository eventosGateway,
			CondicaoFundadorRepository condicao, FundadorEmailRepository listaDeEspera,
			ObjectProvider<GatewayPagamento> gateway, Cobrancas cobrancas, Cupons cupons, Notificacoes notificacoes,
			ContaService contas, ApplicationEventPublisher eventos, Clock relogio) {
		this.assinaturas = assinaturas;
		this.acessosManuais = acessosManuais;
		this.planos = planos;
		this.pagamentos = pagamentos;
		this.membros = membros;
		this.eventosGateway = eventosGateway;
		this.condicao = condicao;
		this.listaDeEspera = listaDeEspera;
		this.gateway = gateway;
		this.cobrancas = cobrancas;
		this.cupons = cupons;
		this.notificacoes = notificacoes;
		this.contas = contas;
		this.eventos = eventos;
		this.relogio = relogio;
	}

	// --- Acesso -------------------------------------------------------------------

	/**
	 * Cursos liberados para o aluno agora, com a origem (assinatura tem
	 * prioridade). Conta a assinatura própria e a equipe do plano Negócio de que
	 * a pessoa participa.
	 */
	public Map<Long, Origem> cursosLiberados(UUID usuarioId) {
		var agora = relogio.instant();
		var liberados = new HashMap<Long, Origem>();
		acessosManuais.findByUsuarioId(usuarioId).stream().filter(a -> a.isVigente(agora)).forEach(a -> {
			if (a.getCursoId() != null) {
				liberados.put(a.getCursoId(), Origem.ACESSO_MANUAL);
			}
			if (a.getPlanoId() != null) {
				planos.findById(a.getPlanoId())
					.ifPresent(p -> p.getCursos().forEach(c -> liberados.put(c, Origem.ACESSO_MANUAL)));
			}
		});
		for (var m : membros.findByUsuarioIdAndStatus(usuarioId, MembroEquipe.Status.ATIVO)) {
			assinaturas.findById(m.getAssinaturaId())
				.filter(a -> a.daAcesso(agora))
				.flatMap(a -> planos.findById(a.getPlanoId()))
				.filter(Plano::temEquipe)
				.ifPresent(p -> p.getCursos().forEach(c -> liberados.put(c, Origem.ASSINATURA)));
		}
		assinaturaQueDaAcesso(usuarioId, agora).flatMap(a -> planos.findById(a.getPlanoId()))
			.ifPresent(p -> p.getCursos().forEach(c -> liberados.put(c, Origem.ASSINATURA)));
		return liberados;
	}

	/** A assinatura mais relevante do aluno: a que dá acesso, senão a mais recente. */
	public Optional<AssinaturaResposta> atual(UUID usuarioId) {
		var agora = relogio.instant();
		return maisRelevante(usuarioId, agora).map(a -> resposta(a, agora));
	}

	public Optional<MinhaAssinatura> detalhe(UUID usuarioId) {
		var agora = relogio.instant();
		return maisRelevante(usuarioId, agora).map(a -> minha(a, agora));
	}

	/** A condição de fundador em vigor (página de planos). Nula se não está valendo. */
	public Optional<CondicaoPublica> condicaoFundador() {
		var c = condicao.findById(1).orElseThrow();
		if (!c.isVigente(relogio.instant())) {
			return Optional.empty();
		}
		return Optional.of(new CondicaoPublica(c.getDescontoPercentual(), c.getMesesDesconto(), c.getMesesPrecoTravado(),
				c.getValidaAte()));
	}

	public CondicaoParaVoce condicaoFundadorPara(UUID usuarioId) {
		var c = condicao.findById(1).orElseThrow();
		var email = contas.buscar(usuarioId).map(u -> u.email()).orElse("");
		return new CondicaoParaVoce(elegivel(c, usuarioId, email), c.getDescontoPercentual(), c.getMesesDesconto(),
				c.getMesesPrecoTravado());
	}

	// --- Contratar, trocar, cancelar, reativar --------------------------------------

	@Transactional
	public AssinaturaIniciada assinar(UUID usuarioId, String planoId) {
		return assinar(usuarioId, planoId, null);
	}

	/** @param codigoCupom opcional; não soma com a condição de fundador (vale o maior desconto) */
	@Transactional
	public AssinaturaIniciada assinar(UUID usuarioId, String planoId, String codigoCupom) {
		var cobrador = gateway.getIfAvailable();
		if (cobrador == null) {
			throw ErroApi.indisponivel("As assinaturas abrem no lançamento. Entre na lista de espera para garantir a condição de fundador.");
		}
		var plano = planos.findById(planoId)
			.filter(Plano::isAtivo)
			.orElseThrow(() -> ErroApi.naoEncontrado("Plano não encontrado."));
		var agora = relogio.instant();
		var cupom = codigoCupom == null || codigoCupom.isBlank() ? null : cupons.valido(codigoCupom, planoId);
		if (assinaturaQueDaAcesso(usuarioId, agora).isPresent()) {
			throw ErroApi.conflito("planoId",
					"Você já tem uma assinatura ativa. Para mudar de plano, use \"Minha assinatura\".");
		}
		// Voltou do checkout sem pagar: reaproveita a mesma página, se ainda vale.
		var aberta = assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId)
			.stream()
			.filter(a -> a.getStatus() == StatusAssinatura.PENDENTE && a.getPlanoId().equals(planoId)
					&& a.getCheckoutUrl() != null && a.getCriadaEm().isAfter(agora.minus(REAPROVEITAR_CHECKOUT))
					&& java.util.Objects.equals(a.getCupomCodigo(), cupom == null ? null : cupom.getCodigo()))
			.findFirst();
		if (aberta.isPresent()) {
			return iniciada(aberta.get(), plano, agora);
		}
		var conta = contas.buscar(usuarioId).orElseThrow(() -> ErroApi.naoAutenticado("Entre de novo para assinar."));
		var c = condicao.findById(1).orElseThrow();
		Assinatura.Fundador fundador = null;
		if (elegivel(c, usuarioId, conta.email())) {
			fundador = new Assinatura.Fundador(c.getDescontoPercentual(), c.getMesesDesconto(),
					agora.atOffset(ZoneOffset.UTC).plusMonths(c.getMesesPrecoTravado()).toInstant());
		}
		var nova = Assinatura.nova(usuarioId, plano, cobrador.nome(), fundador, agora);
		if (cupom != null) {
			nova.aplicarCupom(cupom.getCodigo(), cupom.getPercentual(), cupom.getMeses());
		}
		var a = assinaturas.save(nova);
		var checkout = cobrador.iniciar(new GatewayPagamento.PedidoCheckout(a.getId(), plano.getNome(),
				a.valorDoCiclo(1), conta.nome(), conta.email()));
		a.checkoutCriado(checkout.checkoutId(), checkout.url(), agora);
		a.ligarAoGateway(checkout.gatewayId(), checkout.cliente(), agora);
		if (checkout.aprovadoNaHora()) {
			cobrancas.aprovarNaHora(a);
		}
		return iniciada(a, plano, agora);
	}

	/**
	 * Plano mais caro: vale na hora. Mais barato: no próximo ciclo (até lá, a
	 * pessoa continua com o plano atual). Escolher o plano atual desfaz uma troca agendada.
	 */
	@Transactional
	public MinhaAssinatura trocarPlano(UUID usuarioId, String planoId, Autor autor) {
		var agora = relogio.instant();
		var a = assinaturaQueDaAcesso(usuarioId, agora)
			.orElseThrow(() -> ErroApi.conflito(null, "Você não tem uma assinatura ativa. Escolha um plano em Planos."));
		if (a.getStatus() == StatusAssinatura.EM_ATRASO) {
			throw ErroApi.conflito(null, "Há uma cobrança em aberto. Pague a fatura antes de trocar de plano.");
		}
		if (a.getStatus() == StatusAssinatura.CANCELADA) {
			throw ErroApi.conflito(null, "A assinatura está cancelada. Reative antes de trocar de plano.");
		}
		var novo = planos.findById(planoId)
			.filter(Plano::isAtivo)
			.orElseThrow(() -> ErroApi.naoEncontrado("Plano não encontrado."));
		var atual = plano(a.getPlanoId());
		if (novo.getId().equals(atual.getId())) {
			if (a.getPlanoAgendadoId() == null) {
				throw ErroApi.invalido("planoId", "Você já está neste plano.");
			}
			a.agendarPlano(null, agora);
			cobrancas.cobrarNoGateway(a, a.valorDaProximaCobranca());
		}
		else if (novo.getPrecoCentavos() > a.getPrecoCentavos()) {
			a.trocarPlanoAgora(novo, agora);
			cobrancas.cobrarNoGateway(a, a.valorDaProximaCobranca());
		}
		else {
			a.agendarPlano(novo.getId(), agora);
			cobrancas.cobrarNoGateway(a, a.valorComPreco(novo.getPrecoCentavos(), a.getPagamentosConfirmados() + 1));
		}
		eventos.publishEvent(EventoAuditoria.alteracao(autor, "assinatura.plano", "usuario", usuarioId,
				"Trocou de plano: " + atual.getNome() + " → " + novo.getNome(),
				Map.of("plano", atual.getId()), Map.of("plano", novo.getId())));
		return minha(a, agora);
	}

	@Transactional
	public MinhaAssinatura cancelar(UUID usuarioId, String motivo, Autor autor) {
		var agora = relogio.instant();
		var a = assinaturaQueDaAcesso(usuarioId, agora)
			.filter(x -> x.getStatus() == StatusAssinatura.ATIVA || x.getStatus() == StatusAssinatura.EM_ATRASO)
			.orElseThrow(() -> ErroApi.conflito(null, "Não há assinatura ativa para cancelar."));
		var g = gateway.getIfAvailable();
		if (g != null && a.getGatewayId() != null) {
			g.suspender(a.getGatewayId());
		}
		a.cancelar(motivo == null || motivo.isBlank() ? null : motivo.strip(), agora);
		var plano = plano(a.getPlanoId());
		notificacoes.cancelada(usuarioId, plano.getNome(), a.getFimPeriodoAtual());
		eventos.publishEvent(EventoAuditoria.de(autor, "assinatura.cancelada", "usuario", usuarioId,
				"Cancelou o plano " + plano.getNome() + (a.getMotivoCancelamento() == null ? "" : " (" + a.getMotivoCancelamento() + ")")));
		return minha(a, agora);
	}

	/** Cancelou e mudou de ideia antes do fim do período pago: volta a cobrar no fim do período. */
	@Transactional
	public MinhaAssinatura reativar(UUID usuarioId, Autor autor) {
		var agora = relogio.instant();
		var a = assinaturaQueDaAcesso(usuarioId, agora)
			.filter(x -> x.getStatus() == StatusAssinatura.CANCELADA)
			.orElseThrow(() -> ErroApi.conflito(null,
					"Não há assinatura cancelada para reativar. Se o acesso já acabou, assine de novo em Planos."));
		var g = gateway.getIfAvailable();
		if (g != null && a.getGatewayId() != null) {
			g.reativar(a.getGatewayId(), LocalDate.ofInstant(a.getFimPeriodoAtual(), Cobrancas.FUSO));
		}
		a.reativar(agora);
		eventos.publishEvent(EventoAuditoria.de(autor, "assinatura.reativada", "usuario", usuarioId,
				"Reativou a assinatura"));
		return minha(a, agora);
	}

	// --- Acessos manuais -----------------------------------------------------------

	/** Acesso concedido por um admin a um curso ou a um plano inteiro. */
	@Transactional
	public void concederAcesso(UUID usuarioId, Long cursoId, String planoId, String motivo, Autor admin,
			Instant expiraEm) {
		if ((cursoId == null) == (planoId == null)) {
			throw ErroApi.invalido("Informe um curso ou um plano (só um dos dois).");
		}
		if (planoId != null && planos.findById(planoId).isEmpty()) {
			throw ErroApi.naoEncontrado("Plano não encontrado.");
		}
		var agora = relogio.instant();
		if (expiraEm != null && !expiraEm.isAfter(agora)) {
			throw ErroApi.invalido("expiraEm", "A validade precisa ser uma data futura.");
		}
		acessosManuais.save(AcessoManual.novo(usuarioId, cursoId, planoId, motivo, admin.id(), expiraEm, agora));
		var depois = new LinkedHashMap<String, Object>();
		depois.put("curso", cursoId);
		depois.put("plano", planoId);
		depois.put("motivo", motivo.strip());
		depois.put("expiraEm", expiraEm == null ? null : expiraEm.toString());
		eventos.publishEvent(new EventoAuditoria(admin, "acesso.concedido", "usuario", usuarioId.toString(),
				"Concedeu acesso manual (" + (planoId != null ? "plano " + planoId : "curso " + cursoId) + ")", Map.of(),
				depois));
	}

	public List<AcessoManualResposta> acessosManuais(UUID usuarioId) {
		var agora = relogio.instant();
		var nomes = planos.findAll().stream().collect(Collectors.toMap(Plano::getId, Plano::getNome));
		return acessosManuais.findByUsuarioIdOrderByCriadoEmDesc(usuarioId)
			.stream()
			.map(a -> new AcessoManualResposta(a.getId(), a.getCursoId(), a.getPlanoId(),
					a.getPlanoId() == null ? null : nomes.get(a.getPlanoId()), a.getMotivo(), a.getConcedidoPor(),
					a.getExpiraEm(), a.getCriadoEm(), a.isVigente(agora)))
			.toList();
	}

	@Transactional
	public void revogarAcesso(UUID usuarioId, UUID acessoId, Autor admin) {
		var acesso = acessosManuais.findById(acessoId)
			.filter(a -> a.getUsuarioId().equals(usuarioId))
			.orElseThrow(() -> ErroApi.naoEncontrado("Acesso não encontrado."));
		acessosManuais.delete(acesso);
		var antes = new LinkedHashMap<String, Object>();
		antes.put("curso", acesso.getCursoId());
		antes.put("plano", acesso.getPlanoId());
		antes.put("motivo", acesso.getMotivo());
		eventos.publishEvent(new EventoAuditoria(admin, "acesso.revogado", "usuario", usuarioId.toString(),
				"Revogou um acesso manual", antes, Map.of()));
	}

	// --- Planos x cursos (painel) ---------------------------------------------

	public List<PlanoDoCurso> planosDoCurso(long cursoId) {
		return planos.findAllByOrderByOrdem()
			.stream()
			.map(p -> new PlanoDoCurso(p.getId(), p.getNome(), p.getPrecoCentavos(), p.liberaCurso(cursoId)))
			.toList();
	}

	/** Em quais planos o curso entra. Muda o que cada plano libera e o "a partir de" dos cards. */
	@Transactional
	public List<PlanoDoCurso> definirPlanosDoCurso(long cursoId, String cursoTitulo, Set<String> planoIds,
			Autor admin) {
		var todos = planos.findAllByOrderByOrdem();
		var conhecidos = todos.stream().map(Plano::getId).collect(Collectors.toSet());
		if (!conhecidos.containsAll(planoIds)) {
			throw ErroApi.invalido("planos", "Plano não encontrado.");
		}
		var antes = todos.stream().filter(p -> p.liberaCurso(cursoId)).map(Plano::getId).sorted().toList();
		todos.forEach(p -> p.definirCurso(cursoId, planoIds.contains(p.getId())));
		var depois = planoIds.stream().sorted().toList();
		eventos.publishEvent(EventoAuditoria.alteracao(admin, "curso.planos", "curso", cursoId,
				"Planos de \"" + cursoTitulo + "\"", Map.of("planos", antes), Map.of("planos", depois)));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return planosDoCurso(cursoId);
	}

	// --- Painel: usuários, assinaturas e métricas ---------------------------------

	/** Quem tem, agora, uma assinatura do plano que dá acesso. */
	public Set<UUID> assinantesDoPlano(String planoId) {
		var agora = relogio.instant();
		return assinaturas.findByStatusIn(List.of(StatusAssinatura.ATIVA, StatusAssinatura.EM_ATRASO,
				StatusAssinatura.CANCELADA))
			.stream()
			.filter(a -> a.getPlanoId().equals(planoId) && a.daAcesso(agora))
			.map(Assinatura::getUsuarioId)
			.collect(Collectors.toSet());
	}

	/** Nome do plano que dá acesso agora, por usuário (quem não tem fica de fora). */
	public Map<UUID, String> planoAtual(Collection<UUID> usuarioIds) {
		if (usuarioIds.isEmpty()) {
			return Map.of();
		}
		var agora = relogio.instant();
		var nomes = planos.findAll().stream().collect(Collectors.toMap(Plano::getId, Plano::getNome));
		var resultado = new HashMap<UUID, String>();
		assinaturas.findByUsuarioIdIn(usuarioIds)
			.stream()
			.filter(a -> a.daAcesso(agora))
			.forEach(a -> resultado.put(a.getUsuarioId(), nomes.getOrDefault(a.getPlanoId(), a.getPlanoId())));
		return resultado;
	}

	public Pagina<AssinaturaLinha> buscar(FiltroAssinaturas f, Integer pagina, Integer tamanho) {
		var pedido = Pagina.pedido(pagina, tamanho, Sort.by(Sort.Direction.DESC, "criadaEm"));
		if (f.usuarios() != null && f.usuarios().isEmpty()) {
			return new Pagina<>(List.of(), pedido.getPageNumber() + 1, pedido.getPageSize(), 0);
		}
		Specification<Assinatura> spec = (raiz, consulta, cb) -> {
			var condicoes = new ArrayList<Predicate>();
			if (f.status() != null) {
				condicoes.add(cb.equal(raiz.get("status"), f.status()));
			}
			if (f.planoId() != null && !f.planoId().isBlank()) {
				condicoes.add(cb.equal(raiz.get("planoId"), f.planoId()));
			}
			if (f.fundador() != null) {
				condicoes.add(cb.equal(raiz.get("fundador"), f.fundador()));
			}
			if (f.usuarios() != null) {
				condicoes.add(raiz.get("usuarioId").in(f.usuarios()));
			}
			return cb.and(condicoes.toArray(Predicate[]::new));
		};
		var agora = relogio.instant();
		var nomes = planos.findAll().stream().collect(Collectors.toMap(Plano::getId, Plano::getNome));
		return Pagina.de(assinaturas.findAll(spec, pedido), a -> linha(a, nomes, agora));
	}

	public Optional<AssinaturaAdmin> detalheAdmin(UUID id) {
		var agora = relogio.instant();
		var nomes = planos.findAll().stream().collect(Collectors.toMap(Plano::getId, Plano::getNome));
		var g = gateway.getIfAvailable();
		return assinaturas.findById(id)
			.map(a -> new AssinaturaAdmin(linha(a, nomes, agora), a.getGatewayCliente(), a.getCheckoutId(),
					a.getMotivoCancelamento(),
					a.getPlanoAgendadoId() == null ? null : PlanoResumo.de(plano(a.getPlanoAgendadoId())),
					a.getDescontoPercentual(), a.getMesesDesconto(), a.getPrecoTravadoAte(),
					a.getPagamentosConfirmados(), g == null ? null : g.linkNoPainel(a.getGatewayId()),
					pagamentos.findByAssinaturaIdOrderByCriadoEmDesc(a.getId())
						.stream()
						.map(PagamentoResposta::de)
						.toList(),
					eventosGateway.findTop30ByAssinaturaIdOrderByRecebidoEmDesc(a.getId())
						.stream()
						.map(EventoResposta::de)
						.toList(),
					membros.findByAssinaturaIdOrderByConvidadoEm(a.getId()).stream().map(MembroResposta::de).toList()));
	}

	public Metricas metricas(Instant inicioDoMes) {
		var agora = relogio.instant();
		var todos = planos.findAllByOrderByOrdem();
		var ativas = assinaturas
			.findByStatusIn(List.of(StatusAssinatura.ATIVA, StatusAssinatura.EM_ATRASO, StatusAssinatura.CANCELADA))
			.stream()
			.filter(a -> a.daAcesso(agora))
			.toList();
		var porPlano = ativas.stream().collect(Collectors.groupingBy(Assinatura::getPlanoId, Collectors.counting()));
		var linhas = todos.stream()
			.map(p -> new PlanoAtivo(p.getId(), p.getNome(), p.getPrecoCentavos(), porPlano.getOrDefault(p.getId(), 0L)))
			.toList();
		// Cancelada continua dando acesso até o fim do período, mas não gera receita no mês seguinte.
		long mrr = ativas.stream()
			.filter(a -> a.getStatus() != StatusAssinatura.CANCELADA)
			.mapToLong(Assinatura::valorDaProximaCobranca)
			.sum();
		var seisMeses = YearMonth.from(inicioDoMes.atZone(Cobrancas.FUSO)).minusMonths(5);
		var confirmados = pagamentos.findByStatusAndPagoEmGreaterThanEqual(Pagamento.Status.CONFIRMADO,
				seisMeses.atDay(1).atStartOfDay(Cobrancas.FUSO).toInstant());
		var porMes = new LinkedHashMap<YearMonth, Long>();
		for (int i = 0; i < 6; i++) {
			porMes.put(seisMeses.plusMonths(i), 0L);
		}
		confirmados.forEach(p -> porMes.merge(YearMonth.from(p.getPagoEm().atZone(Cobrancas.FUSO)),
				(long) p.getValorCentavos(), Long::sum));
		long doMes = confirmados.stream()
			.filter(p -> !p.getPagoEm().isBefore(inicioDoMes))
			.mapToLong(Pagamento::getValorCentavos)
			.sum();
		long cancelamentos = assinaturas.findByStatusIn(List.of(StatusAssinatura.CANCELADA, StatusAssinatura.EXPIRADA))
			.stream()
			.filter(a -> a.getCanceladaEm() != null && !a.getCanceladaEm().isBefore(inicioDoMes))
			.count();
		long atraso = ativas.stream().filter(a -> a.getStatus() == StatusAssinatura.EM_ATRASO).count();
		long fundadores = ativas.stream().filter(Assinatura::isFundador).count();
		return new Metricas(linhas, ativas.size(), mrr, doMes, atraso, cancelamentos, fundadores,
				porMes.entrySet().stream().map(e -> new ReceitaDoMes(e.getKey().toString(), e.getValue())).toList());
	}

	// -------------------------------------------------------------------------

	private boolean elegivel(CondicaoFundador c, UUID usuarioId, String email) {
		return c.isVigente(relogio.instant()) && email != null && listaDeEspera.existsById(email.toLowerCase())
				&& !assinaturas.existsByUsuarioIdAndFundadorTrue(usuarioId);
	}

	private Optional<Assinatura> assinaturaQueDaAcesso(UUID usuarioId, Instant agora) {
		return assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId).stream().filter(a -> a.daAcesso(agora)).findFirst();
	}

	private Optional<Assinatura> maisRelevante(UUID usuarioId, Instant agora) {
		return assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId)
			.stream()
			.max(Comparator.comparing((Assinatura a) -> a.daAcesso(agora)).thenComparing(Assinatura::getCriadaEm));
	}

	private Plano plano(String id) {
		return planos.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Plano não encontrado."));
	}

	private AssinaturaIniciada iniciada(Assinatura a, Plano plano, Instant agora) {
		return new AssinaturaIniciada(a.getId(), plano.getId(), plano.getNome(), a.getStatus(), a.daAcesso(agora),
				a.isFundador(), a.getStatus() == StatusAssinatura.PENDENTE ? a.getCheckoutUrl() : null);
	}

	private AssinaturaResposta resposta(Assinatura a, Instant agora) {
		var nome = planos.findById(a.getPlanoId()).map(Plano::getNome).orElse(a.getPlanoId());
		return new AssinaturaResposta(a.getId(), a.getPlanoId(), nome, a.getStatus(), a.daAcesso(agora), a.getInicio(),
				a.getFimPeriodoAtual());
	}

	private AssinaturaLinha linha(Assinatura a, Map<String, String> nomes, Instant agora) {
		return new AssinaturaLinha(a.getId(), a.getUsuarioId(), a.getPlanoId(),
				nomes.getOrDefault(a.getPlanoId(), a.getPlanoId()), a.getStatus(), a.daAcesso(agora),
				a.getPrecoCentavos(), a.valorDaProximaCobranca(), a.isFundador(), a.getGateway(), a.getGatewayId(),
				a.getInicio(), a.getFimPeriodoAtual(), a.getCanceladaEm());
	}

	private MinhaAssinatura minha(Assinatura a, Instant agora) {
		var plano = plano(a.getPlanoId());
		var lista = pagamentos.findByAssinaturaIdOrderByCriadoEmDesc(a.getId());
		var metodo = lista.stream()
			.filter(p -> p.getStatus() == Pagamento.Status.CONFIRMADO && p.getMetodo() != null)
			.findFirst()
			.map(Pagamento::getMetodo)
			.orElse(null);
		boolean cobra = a.getStatus() == StatusAssinatura.ATIVA || a.getStatus() == StatusAssinatura.EM_ATRASO;
		Plano agendado = a.getPlanoAgendadoId() == null ? null : plano(a.getPlanoAgendadoId());
		int valorProximo = agendado != null
				? a.valorComPreco(agendado.getPrecoCentavos(), a.getPagamentosConfirmados() + 1)
				: a.valorDaProximaCobranca();
		var proxima = cobra
				? new ProximaCobranca(LocalDate.ofInstant(a.getFimPeriodoAtual(), Cobrancas.FUSO), valorProximo) : null;
		int restantes = a.getDescontoPercentual() > 0 ? Math.max(0, a.getMesesDesconto() - a.getPagamentosConfirmados()) : 0;
		return new MinhaAssinatura(a.getId(), PlanoResumo.de(plano), a.getStatus(), a.daAcesso(agora), a.getInicio(),
				a.getFimPeriodoAtual(),
				a.getStatus() == StatusAssinatura.EM_ATRASO ? a.getFimPeriodoAtual().plus(Assinatura.CARENCIA) : null,
				proxima, metodo, a.isFundador(), a.getDescontoPercentual(), restantes, a.getPrecoTravadoAte(),
				agendado == null ? null : PlanoResumo.de(agendado), a.getCanceladaEm(), a.getMotivoCancelamento(),
				a.getStatus() == StatusAssinatura.CANCELADA && a.daAcesso(agora),
				a.getStatus() == StatusAssinatura.PENDENTE ? a.getCheckoutUrl() : null,
				lista.stream().map(PagamentoResposta::de).toList(), a.getCupomCodigo());
	}

	// --- LGPD ------------------------------------------------------------------------

	/** Assinaturas, pagamentos e equipes da pessoa (para "Baixar meus dados"). */
	@Transactional(readOnly = true)
	public Map<String, Object> exportar(UUID usuarioId) {
		var dados = new LinkedHashMap<String, Object>();
		dados.put("assinaturas", assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId).stream().map(a -> {
			var item = new LinkedHashMap<String, Object>();
			item.put("plano", plano(a.getPlanoId()).getNome());
			item.put("status", a.getStatus());
			item.put("inicio", a.getInicio());
			item.put("fimPeriodoAtual", a.getFimPeriodoAtual());
			item.put("canceladaEm", a.getCanceladaEm());
			item.put("motivoCancelamento", a.getMotivoCancelamento());
			item.put("fundador", a.isFundador());
			item.put("cupom", a.getCupomCodigo());
			item.put("pagamentos", pagamentos.findByAssinaturaIdOrderByCriadoEmDesc(a.getId()).stream().map(p -> {
				var pg = new LinkedHashMap<String, Object>();
				pg.put("valorCentavos", p.getValorCentavos());
				pg.put("metodo", p.getMetodo());
				pg.put("status", p.getStatus());
				pg.put("vencimento", p.getVencimento());
				pg.put("pagoEm", p.getPagoEm());
				return pg;
			}).toList());
			item.put("equipe", membros.findByAssinaturaIdOrderByConvidadoEm(a.getId())
				.stream()
				.map(m -> Map.of("email", m.getEmail(), "status", m.getStatus()))
				.toList());
			return item;
		}).toList());
		dados.put("equipesDeQueParticipa", membros.findByUsuarioIdAndStatus(usuarioId, MembroEquipe.Status.ATIVO)
			.stream()
			.map(m -> Map.of("assinatura", m.getAssinaturaId(), "entrouEm", m.getEntrouEm()))
			.toList());
		return dados;
	}

	/**
	 * Conta excluída: para de cobrar na hora, encerra o acesso, desfaz a equipe e
	 * tira a pessoa das equipes dos outros. Os pagamentos ficam (obrigação fiscal),
	 * ligados a uma conta já anonimizada.
	 */
	@Transactional
	public void encerrarPorExclusao(UUID usuarioId) {
		var agora = relogio.instant();
		var g = gateway.getIfAvailable();
		for (var a : assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId)) {
			boolean cobrando = a.getStatus() == StatusAssinatura.ATIVA || a.getStatus() == StatusAssinatura.EM_ATRASO;
			if (cobrando && g != null && a.getGatewayId() != null) {
				g.suspender(a.getGatewayId());
			}
			if (cobrando) {
				a.cancelar("conta excluída", agora);
			}
			if (a.getStatus() != StatusAssinatura.EXPIRADA) {
				a.expirar(agora);
			}
			membros.findByAssinaturaIdOrderByConvidadoEm(a.getId()).forEach(m -> m.remover(agora));
		}
		membros.findByUsuarioIdAndStatus(usuarioId, MembroEquipe.Status.ATIVO).forEach(m -> m.esquecer(agora));
		acessosManuais.deleteAll(acessosManuais.findByUsuarioId(usuarioId));
	}

}
