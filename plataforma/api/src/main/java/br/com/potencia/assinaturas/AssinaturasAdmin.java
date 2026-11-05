package br.com.potencia.assinaturas;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.assinaturas.AssinaturasService.EventoResposta;
import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.compartilhado.SiteDesatualizado;

/**
 * Painel: planos (preço, itens, cursos, fora de venda), condição de fundador
 * com a lista de espera, e os eventos do gateway que falharam.
 */
@Service
@Transactional
class AssinaturasAdmin {

	private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

	static final int MAX_EMAILS = 20_000;

	record PlanoAdmin(String id, String nome, int precoCentavos, int maxPessoas, List<String> itens, boolean ativo,
			List<Long> cursos, long assinantes) {
	}

	record PlanoPedido(String nome, Integer precoCentavos, Integer maxPessoas, List<String> itens, Boolean ativo,
			Set<Long> cursos) {
	}

	record FundadorAdmin(boolean ativa, int descontoPercentual, int mesesDesconto, int mesesPrecoTravado,
			Instant validaAte, long emails, long assinantesFundadores) {
	}

	record FundadorPedido(Boolean ativa, Integer descontoPercentual, Integer mesesDesconto, Integer mesesPrecoTravado,
			Instant validaAte) {
	}

	record ListaImportada(int validos, int invalidos, List<String> exemplosInvalidos, long total) {
	}

	private final PlanoRepository planos;

	private final AssinaturaRepository assinaturas;

	private final CondicaoFundadorRepository condicao;

	private final FundadorEmailRepository listaDeEspera;

	private final Webhooks webhooks;

	private final Cobrancas cobrancas;

	private final ApplicationEventPublisher eventos;

	private final Clock relogio;

	AssinaturasAdmin(PlanoRepository planos, AssinaturaRepository assinaturas, CondicaoFundadorRepository condicao,
			FundadorEmailRepository listaDeEspera, Webhooks webhooks, Cobrancas cobrancas,
			ApplicationEventPublisher eventos, Clock relogio) {
		this.planos = planos;
		this.assinaturas = assinaturas;
		this.condicao = condicao;
		this.listaDeEspera = listaDeEspera;
		this.webhooks = webhooks;
		this.cobrancas = cobrancas;
		this.eventos = eventos;
		this.relogio = relogio;
	}

	// --- Planos -------------------------------------------------------------------

	@Transactional(readOnly = true)
	List<PlanoAdmin> planos() {
		var agora = relogio.instant();
		var vivas = assinaturas.findByStatusIn(List.of(StatusAssinatura.ATIVA, StatusAssinatura.EM_ATRASO,
				StatusAssinatura.CANCELADA));
		return planos.findAllByOrderByOrdem()
			.stream()
			.map(p -> new PlanoAdmin(p.getId(), p.getNome(), p.getPrecoCentavos(), p.getMaxPessoas(),
					List.copyOf(p.getItens()), p.isAtivo(), p.getCursos().stream().sorted().toList(),
					vivas.stream().filter(a -> a.getPlanoId().equals(p.getId()) && a.daAcesso(agora)).count()))
			.toList();
	}

	/**
	 * Preço novo: vale para quem assinar daqui em diante e, para quem já assina,
	 * a partir da próxima cobrança. Fundador com o preço travado continua com o
	 * preço antigo até a trava acabar (a manutenção aplica depois).
	 */
	List<PlanoAdmin> editarPlano(String id, PlanoPedido p, Autor autor) {
		var plano = planos.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Plano não encontrado."));
		if (p.nome() == null || p.nome().isBlank() || p.nome().length() > 60) {
			throw ErroApi.invalido("nome", "Dê um nome ao plano (até 60 caracteres).");
		}
		if (p.precoCentavos() == null || p.precoCentavos() < 100 || p.precoCentavos() > 1_000_000) {
			throw ErroApi.invalido("precoCentavos", "Informe um preço entre R$ 1 e R$ 10.000.");
		}
		if (p.maxPessoas() == null || p.maxPessoas() < 1 || p.maxPessoas() > 50) {
			throw ErroApi.invalido("maxPessoas", "Informe de 1 a 50 pessoas.");
		}
		var itens = p.itens() == null ? List.<String>of()
				: p.itens().stream().filter(Objects::nonNull).map(String::strip).filter(s -> !s.isEmpty()).toList();
		if (itens.size() > 12 || itens.stream().anyMatch(s -> s.length() > 120)) {
			throw ErroApi.invalido("itens", "Use até 12 itens, de até 120 caracteres.");
		}
		var antes = retrato(plano);
		int precoAntigo = plano.getPrecoCentavos();
		plano.editar(p.nome(), p.precoCentavos(), p.maxPessoas(), itens, !Boolean.FALSE.equals(p.ativo()),
				p.cursos() == null ? Set.of() : new HashSet<>(p.cursos()));
		var agora = relogio.instant();
		int reajustadas = 0;
		if (precoAntigo != p.precoCentavos()) {
			for (var a : assinaturas.findByPlanoIdAndStatusIn(id, List.of(StatusAssinatura.ATIVA, StatusAssinatura.EM_ATRASO))) {
				if (!a.isPrecoTravado(agora)) {
					a.reajustarPreco(p.precoCentavos(), agora);
					cobrancas.cobrarNoGateway(a, a.valorDaProximaCobranca());
					reajustadas++;
				}
			}
		}
		eventos.publishEvent(EventoAuditoria.alteracao(autor, "plano.editado", "plano", id,
				"Editou o plano " + plano.getNome() + (reajustadas > 0 ? " (" + reajustadas + " assinaturas reajustadas)" : ""),
				antes, retrato(plano)));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return planos();
	}

	// --- Fundador -----------------------------------------------------------------

	@Transactional(readOnly = true)
	FundadorAdmin fundador() {
		var c = condicao.findById(1).orElseThrow();
		var agora = relogio.instant();
		long fundadores = assinaturas.findByStatusIn(List.of(StatusAssinatura.ATIVA, StatusAssinatura.EM_ATRASO,
				StatusAssinatura.CANCELADA))
			.stream()
			.filter(a -> a.isFundador() && a.daAcesso(agora))
			.count();
		return new FundadorAdmin(c.isAtiva(), c.getDescontoPercentual(), c.getMesesDesconto(), c.getMesesPrecoTravado(),
				c.getValidaAte(), listaDeEspera.count(), fundadores);
	}

	/** Vale para quem assinar daqui em diante; quem já é fundador mantém a condição de quando assinou. */
	FundadorAdmin editarFundador(FundadorPedido p, Autor autor) {
		if (p.descontoPercentual() == null || p.descontoPercentual() < 0 || p.descontoPercentual() > 90) {
			throw ErroApi.invalido("descontoPercentual", "Use um desconto de 0% a 90%.");
		}
		if (p.mesesDesconto() == null || p.mesesDesconto() < 0 || p.mesesDesconto() > 24) {
			throw ErroApi.invalido("mesesDesconto", "Use de 0 a 24 meses.");
		}
		if (p.mesesPrecoTravado() == null || p.mesesPrecoTravado() < 0 || p.mesesPrecoTravado() > 60) {
			throw ErroApi.invalido("mesesPrecoTravado", "Use de 0 a 60 meses.");
		}
		var c = condicao.findById(1).orElseThrow();
		var antes = retrato(c);
		c.editar(Boolean.TRUE.equals(p.ativa()), p.descontoPercentual(), p.mesesDesconto(), p.mesesPrecoTravado(),
				p.validaAte());
		eventos.publishEvent(EventoAuditoria.alteracao(autor, "fundador.editado", "fundador", "condicao",
				"Editou a condição de fundador", antes, retrato(c)));
		eventos.publishEvent(SiteDesatualizado.catalogo());
		return fundador();
	}

	@Transactional(readOnly = true)
	List<String> listaDeEspera() {
		return listaDeEspera.findAllByOrderByEmail().stream().map(FundadorEmail::getEmail).toList();
	}

	/**
	 * Troca a lista inteira pelo texto colado (um e-mail por linha, ou separados
	 * por vírgula, ponto e vírgula ou espaço — como sai de uma planilha).
	 */
	ListaImportada importarLista(String texto, Autor autor) {
		var validos = new LinkedHashSet<String>();
		var invalidos = new ArrayList<String>();
		for (var parte : (texto == null ? "" : texto).split("[\\s,;]+")) {
			var email = parte.strip().toLowerCase(Locale.ROOT).replaceAll("^[<\"']+|[>\"']+$", "");
			if (email.isEmpty()) {
				continue;
			}
			if (EMAIL.matcher(email).matches() && email.length() <= 254) {
				validos.add(email);
			}
			else {
				invalidos.add(parte);
			}
		}
		if (validos.size() > MAX_EMAILS) {
			throw ErroApi.invalido("emails", "Lista grande demais (máximo " + MAX_EMAILS + " e-mails).");
		}
		long antes = listaDeEspera.count();
		listaDeEspera.deleteAllInBatch();
		var agora = relogio.instant();
		listaDeEspera.saveAll(validos.stream().map(e -> new FundadorEmail(e, agora)).toList());
		eventos.publishEvent(EventoAuditoria.alteracao(autor, "fundador.lista", "fundador", "lista",
				"Atualizou a lista de espera", Map.of("emails", antes), Map.of("emails", (long) validos.size())));
		return new ListaImportada(validos.size(), invalidos.size(), invalidos.stream().limit(5).toList(), validos.size());
	}

	// --- Eventos do gateway ---------------------------------------------------------

	@Transactional(readOnly = true)
	List<EventoResposta> eventosPendentes() {
		return webhooks.pendentes().stream().map(EventoResposta::de).toList();
	}

	@Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
	EventoResposta reprocessar(String id, Autor autor) {
		var resultado = webhooks.processar(id);
		eventos.publishEvent(EventoAuditoria.de(autor, "gateway.reprocessado", "evento", id,
				"Reprocessou o evento " + id + ": " + (resultado == Webhooks.Resultado.FALHOU ? "falhou de novo" : "ok")));
		return webhooks.pendentes()
			.stream()
			.filter(e -> e.getId().equals(id))
			.findFirst()
			.map(EventoResposta::de)
			.orElse(new EventoResposta(id, null, null, relogio.instant(), 0, null));
	}

	private static Map<String, Object> retrato(Plano p) {
		var m = new LinkedHashMap<String, Object>();
		m.put("nome", p.getNome());
		m.put("precoCentavos", p.getPrecoCentavos());
		m.put("maxPessoas", p.getMaxPessoas());
		m.put("itens", List.copyOf(p.getItens()));
		m.put("ativo", p.isAtivo());
		m.put("cursos", p.getCursos().stream().sorted().toList());
		return m;
	}

	private static Map<String, Object> retrato(CondicaoFundador c) {
		var m = new LinkedHashMap<String, Object>();
		m.put("ativa", c.isAtiva());
		m.put("descontoPercentual", c.getDescontoPercentual());
		m.put("mesesDesconto", c.getMesesDesconto());
		m.put("mesesPrecoTravado", c.getMesesPrecoTravado());
		m.put("validaAte", c.getValidaAte() == null ? null : c.getValidaAte().toString());
		return m;
	}

}
