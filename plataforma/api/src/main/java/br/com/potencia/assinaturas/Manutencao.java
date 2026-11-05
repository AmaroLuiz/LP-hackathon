package br.com.potencia.assinaturas;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rotina de hora em hora: o que depende só da passagem do tempo (o gateway
 * avisa pagamentos, mas não avisa que um prazo nosso acabou).
 *
 * - Em atraso depois da carência e cancelada depois do período pago: EXPIRADA.
 * - Checkout abandonado há mais de 2 dias: EXPIRADA.
 * - Troca para plano mais barato: vale quando o período atual acaba.
 * - Fundador com a trava de preço vencida: passa a pagar o preço atual do plano.
 * - Gateway falso (local): renova sozinho no fim do período.
 */
@Service
@Transactional
class Manutencao {

	private static final Logger log = LoggerFactory.getLogger(Manutencao.class);

	static final Duration CHECKOUT_ABANDONADO = Duration.ofDays(2);

	private final AssinaturaRepository assinaturas;

	private final PlanoRepository planos;

	private final Cobrancas cobrancas;

	private final Clock relogio;

	Manutencao(AssinaturaRepository assinaturas, PlanoRepository planos, Cobrancas cobrancas, Clock relogio) {
		this.assinaturas = assinaturas;
		this.planos = planos;
		this.cobrancas = cobrancas;
		this.relogio = relogio;
	}

	@Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT2M")
	void agendada() {
		executar(relogio.instant());
	}

	/** @return quantas assinaturas mudaram */
	int executar(Instant agora) {
		int mudancas = 0;
		var vivas = assinaturas.findByStatusIn(List.of(StatusAssinatura.PENDENTE, StatusAssinatura.ATIVA,
				StatusAssinatura.EM_ATRASO, StatusAssinatura.CANCELADA));
		for (var a : vivas) {
			switch (a.getStatus()) {
				case PENDENTE -> {
					if (a.getCriadaEm().isBefore(agora.minus(CHECKOUT_ABANDONADO))) {
						a.expirar(agora);
						mudancas++;
					}
				}
				case EM_ATRASO, CANCELADA -> {
					if (!a.daAcesso(agora)) {
						a.expirar(agora);
						mudancas++;
					}
				}
				case ATIVA -> mudancas += ativa(a, agora);
				default -> {
				}
			}
		}
		if (mudancas > 0) {
			log.info("Manutenção das assinaturas: {} mudança(s).", mudancas);
		}
		return mudancas;
	}

	private int ativa(Assinatura a, Instant agora) {
		int mudancas = 0;
		boolean periodoAcabou = !agora.isBefore(a.getFimPeriodoAtual());
		if (periodoAcabou && a.getPlanoAgendadoId() != null) {
			var novo = planos.findById(a.getPlanoAgendadoId());
			if (novo.isPresent() && a.aplicarPlanoAgendado(novo.get(), agora)) {
				mudancas++;
			}
		}
		if (periodoAcabou && "falso".equals(a.getGateway())) {
			cobrancas.renovarNoFalso(a, agora);
			mudancas++;
		}
		if (a.isFundador() && a.getPrecoTravadoAte() != null && !a.isPrecoTravado(agora)) {
			var preco = planos.findById(a.getPlanoId()).map(Plano::getPrecoCentavos).orElse(a.getPrecoCentavos());
			if (preco != a.getPrecoCentavos()) {
				a.reajustarPreco(preco, agora);
				cobrancas.cobrarNoGateway(a, a.valorDaProximaCobranca());
				mudancas++;
			}
		}
		return mudancas;
	}

}

@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "potencia.manutencao.agendada", havingValue = "true", matchIfMissing = true)
class AgendamentoConfig {

}
