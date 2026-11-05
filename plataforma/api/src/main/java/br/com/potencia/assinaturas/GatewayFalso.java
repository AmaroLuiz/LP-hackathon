package br.com.potencia.assinaturas;

import java.time.LocalDate;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * SÓ PARA DESENVOLVIMENTO: aprova toda assinatura na hora, sem cobrar nada.
 * Os ids imitam os do Asaas; o webhook /api/webhooks/falso aceita eventos no
 * formato do Asaas, para testar atraso, recusa e renovação sem conta no gateway.
 */
@Component
@ConditionalOnProperty(name = "potencia.pagamentos.gateway", havingValue = "falso")
class GatewayFalso implements GatewayPagamento {

	private static final Logger log = LoggerFactory.getLogger(GatewayFalso.class);

	@Override
	public String nome() {
		return "falso";
	}

	@Override
	public Checkout iniciar(PedidoCheckout pedido) {
		log.warn("Gateway FALSO: assinatura {} aprovada sem cobrança (ambiente de desenvolvimento).", pedido.planoNome());
		var sufixo = UUID.randomUUID().toString();
		return new Checkout("chk_falso_" + sufixo, null, true, "sub_falso_" + sufixo, "cus_falso_" + sufixo);
	}

	@Override
	public void alterarValor(String gatewayId, int valorCentavos) {
		log.info("Gateway FALSO: {} passa a cobrar {} centavos.", gatewayId, valorCentavos);
	}

	@Override
	public void suspender(String gatewayId) {
		log.info("Gateway FALSO: {} suspensa.", gatewayId);
	}

	@Override
	public void reativar(String gatewayId, LocalDate proximoVencimento) {
		log.info("Gateway FALSO: {} reativada, próxima cobrança em {}.", gatewayId, proximoVencimento);
	}

}
