package br.com.potencia.assinaturas;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.assinaturas.LeitorAsaas.Categoria;
import br.com.potencia.assinaturas.LeitorAsaas.DadosPagamento;
import br.com.potencia.assinaturas.LeitorAsaas.Evento;

/**
 * Aplica à assinatura o que o gateway informou (checkout pago, cobrança
 * confirmada, atrasada, recusada...). Idempotente: o mesmo evento, ou eventos
 * em outra ordem, levam ao mesmo estado.
 */
@Service
@Transactional
class Cobrancas {

	private static final Logger log = LoggerFactory.getLogger(Cobrancas.class);

	static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	/** Evento que não achou a assinatura: fica com erro, para reprocessar depois. */
	static class AssinaturaNaoEncontrada extends RuntimeException {

		AssinaturaNaoEncontrada(String mensagem) {
			super(mensagem);
		}

	}

	private final AssinaturaRepository assinaturas;

	private final PagamentoRepository pagamentos;

	private final PlanoRepository planos;

	private final CupomRepository cupons;

	private final ObjectProvider<GatewayPagamento> gateway;

	private final Notificacoes notificacoes;

	private final Clock relogio;

	Cobrancas(AssinaturaRepository assinaturas, PagamentoRepository pagamentos, PlanoRepository planos, CupomRepository cupons,
			ObjectProvider<GatewayPagamento> gateway, Notificacoes notificacoes, Clock relogio) {
		this.assinaturas = assinaturas;
		this.pagamentos = pagamentos;
		this.planos = planos;
		this.cupons = cupons;
		this.gateway = gateway;
		this.notificacoes = notificacoes;
		this.relogio = relogio;
	}

	/** @return a assinatura afetada (nula para eventos ignorados) */
	UUID aplicar(Evento e) {
		if (e.categoria() == Categoria.IGNORADO) {
			return null;
		}
		var agora = relogio.instant();
		var a = localizar(e).orElseThrow(() -> new AssinaturaNaoEncontrada(
				"Nenhuma assinatura para " + e.tipo() + " (assinatura " + e.assinaturaGateway() + ", cliente "
						+ e.cliente() + ", checkout " + e.checkoutId() + ")."));
		a.ligarAoGateway(e.assinaturaGateway(), e.cliente(), agora);
		var antes = a.getStatus();
		switch (e.categoria()) {
			case CHECKOUT_PAGO -> a.ativar(agora);
			case CHECKOUT_ENCERRADO -> {
				if (a.getStatus() == StatusAssinatura.PENDENTE) {
					a.expirar(agora);
				}
			}
			case ASSINATURA_CRIADA -> {
				// Só liga os ids (feito acima).
			}
			case ASSINATURA_ENCERRADA -> {
				if (a.getStatus() != StatusAssinatura.CANCELADA && a.getStatus() != StatusAssinatura.EXPIRADA) {
					a.cancelar("Encerrada no gateway de pagamento", agora);
				}
			}
			case PAGAMENTO_CRIADO -> pagamento(a, e.pagamento(), agora);
			case PAGAMENTO_CONFIRMADO -> confirmar(a, e.pagamento(), agora);
			case PAGAMENTO_ATRASADO -> {
				var p = pagamento(a, e.pagamento(), agora);
				p.mudarStatus(Pagamento.Status.ATRASADO, agora);
				if (a.getStatus() == StatusAssinatura.ATIVA) {
					a.atrasou(agora);
					notificacoes.emAtraso(a.getUsuarioId(), p.getUrlFatura(), a.getFimPeriodoAtual().plus(Assinatura.CARENCIA));
				}
			}
			case PAGAMENTO_RECUSADO -> {
				var p = pagamento(a, e.pagamento(), agora);
				p.mudarStatus(Pagamento.Status.RECUSADO, agora);
				notificacoes.pagamentoRecusado(a.getUsuarioId(), p.getUrlFatura());
			}
			case PAGAMENTO_ESTORNADO -> pagamento(a, e.pagamento(), agora).mudarStatus(Pagamento.Status.ESTORNADO, agora);
			case IGNORADO -> throw new IllegalStateException();
		}
		if (antes != StatusAssinatura.ATIVA && a.getStatus() == StatusAssinatura.ATIVA
				&& (antes == StatusAssinatura.PENDENTE || antes == StatusAssinatura.EXPIRADA)) {
			notificacoes.ativada(a.getUsuarioId(), nomeDoPlano(a.getPlanoId()));
		}
		return a.getId();
	}

	/** Gateway falso: a primeira cobrança é aprovada na hora, como se o webhook tivesse chegado. */
	void aprovarNaHora(Assinatura a) {
		var agora = relogio.instant();
		var dados = new DadosPagamento("pay_falso_" + UUID.randomUUID(), a.valorDaProximaCobranca(), "FALSO",
				LocalDate.ofInstant(agora, FUSO), agora, null);
		confirmar(a, dados, agora);
		notificacoes.ativada(a.getUsuarioId(), nomeDoPlano(a.getPlanoId()));
	}

	/** Gateway falso: renova sozinho quando o período acaba (o real avisaria pelo webhook). */
	void renovarNoFalso(Assinatura a, Instant agora) {
		var dados = new DadosPagamento("pay_falso_" + UUID.randomUUID(), a.valorDaProximaCobranca(), "FALSO",
				LocalDate.ofInstant(a.getFimPeriodoAtual(), FUSO), agora, null);
		confirmar(a, dados, agora);
	}

	// -------------------------------------------------------------------------

	private void confirmar(Assinatura a, DadosPagamento dados, Instant agora) {
		var p = pagamento(a, dados, agora);
		if (!p.confirmar(dados.pagoEm(), agora)) {
			return;
		}
		boolean renovacao = a.getPagamentosConfirmados() > 0;
		// Ciclo novo: a troca para um plano mais barato passa a valer.
		if (renovacao && a.getPlanoAgendadoId() != null) {
			planos.findById(a.getPlanoAgendadoId()).ifPresent(novo -> a.aplicarPlanoAgendado(novo, agora));
		}
		a.pagamentoConfirmado(dados.vencimento(), true, agora);
		// Primeira cobrança paga com cupom: conta um uso.
		if (a.getPagamentosConfirmados() == 1 && a.getCupomCodigo() != null) {
			cupons.findByCodigo(a.getCupomCodigo()).ifPresent(Cupom::registrarUso);
		}
		// Fim do desconto (fundador ou cupom): a próxima cobrança já vem no preço cheio.
		if (a.descontoAcabouAgora()) {
			cobrarNoGateway(a, a.valorDaProximaCobranca());
		}
		if (renovacao) {
			notificacoes.pagamentoConfirmado(a.getUsuarioId(), nomeDoPlano(a.getPlanoId()), p.getValorCentavos(),
					a.getFimPeriodoAtual());
		}
	}

	private Pagamento pagamento(Assinatura a, DadosPagamento dados, Instant agora) {
		if (dados == null || dados.id() == null) {
			throw new IllegalArgumentException("Evento de cobrança sem o id da cobrança.");
		}
		var p = pagamentos.findByGatewayId(dados.id())
			.orElseGet(() -> pagamentos.save(Pagamento.novo(a.getId(), dados.id(), agora)));
		p.atualizar(dados.valorCentavos(), dados.metodo(), dados.vencimento(), dados.urlFatura(), agora);
		return p;
	}

	/** Acha a assinatura pelo id no gateway, pelo checkout, pela referência ou pelo cliente. */
	private Optional<Assinatura> localizar(Evento e) {
		if (e.assinaturaGateway() != null) {
			var porId = assinaturas.findFirstByGatewayId(e.assinaturaGateway());
			if (porId.isPresent()) {
				return porId;
			}
		}
		if (e.checkoutId() != null) {
			var porCheckout = assinaturas.findFirstByCheckoutId(e.checkoutId());
			if (porCheckout.isPresent()) {
				return porCheckout;
			}
		}
		if (e.referencia() != null) {
			try {
				var porReferencia = assinaturas.findById(UUID.fromString(e.referencia()));
				if (porReferencia.isPresent()) {
					return porReferencia;
				}
			}
			catch (IllegalArgumentException naoEhNossa) {
				log.debug("Referência externa que não é uma assinatura: {}", e.referencia());
			}
		}
		if (e.cliente() != null) {
			return assinaturas.findFirstByGatewayClienteOrderByCriadaEmDesc(e.cliente());
		}
		return Optional.empty();
	}

	void cobrarNoGateway(Assinatura a, int valorCentavos) {
		var g = gateway.getIfAvailable();
		if (g == null || a.getGatewayId() == null) {
			log.warn("Não foi possível ajustar o valor de {} no gateway (sem gateway ou sem id).", a.getId());
			return;
		}
		g.alterarValor(a.getGatewayId(), valorCentavos);
	}

	private String nomeDoPlano(String planoId) {
		return planos.findById(planoId).map(Plano::getNome).orElse(planoId);
	}

}
