package br.com.potencia.assinaturas;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Quem cobra a assinatura. Escolhido por {@code potencia.pagamentos.gateway}:
 * "falso" (local, aprova na hora) ou "asaas". Sem nenhum configurado, a
 * assinatura responde que ainda não abriu.
 *
 * O dado do cartão nunca passa pela PotencIA: o aluno paga na página do gateway
 * e o resultado chega pelo webhook.
 */
interface GatewayPagamento {

	String nome();

	/** Abre a página de pagamento (ou aprova na hora, no gateway falso). */
	Checkout iniciar(PedidoCheckout pedido);

	/** Valor das próximas cobranças (troca de plano, fim do desconto de fundador, reajuste). */
	void alterarValor(String gatewayId, int valorCentavos);

	/** Cancelamento: para de cobrar, sem apagar a assinatura no gateway (dá para reativar). */
	void suspender(String gatewayId);

	/** Volta a cobrar a partir de {@code proximoVencimento}. */
	void reativar(String gatewayId, LocalDate proximoVencimento);

	/** Endereço da assinatura no painel do gateway, para o admin (nulo se não houver). */
	default String linkNoPainel(String gatewayId) {
		return null;
	}

	/**
	 * @param assinaturaId vai como referência externa (reconciliação dos eventos)
	 * @param valorCentavos valor da primeira cobrança (já com desconto de fundador)
	 */
	record PedidoCheckout(UUID assinaturaId, String planoNome, int valorCentavos, String nomeCliente,
			String emailCliente) {
	}

	/**
	 * @param url página de pagamento (nula quando aprovado na hora)
	 * @param gatewayId id da assinatura no gateway, quando já se sabe
	 */
	record Checkout(String checkoutId, String url, boolean aprovadoNaHora, String gatewayId, String cliente) {
	}

}
