package br.com.potencia.assinaturas;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Traduz o corpo do webhook do Asaas para um evento da PotencIA. O gateway
 * falso usa o mesmo formato, para os testes passarem pelo mesmo caminho.
 *
 * Eventos: https://docs.asaas.com/docs/webhook-para-cobrancas,
 * https://docs.asaas.com/docs/eventos-para-checkout e
 * https://docs.asaas.com/docs/eventos-para-assinaturas
 */
final class LeitorAsaas {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private LeitorAsaas() {
	}

	enum Categoria {

		CHECKOUT_PAGO, CHECKOUT_ENCERRADO, ASSINATURA_CRIADA, ASSINATURA_ENCERRADA, PAGAMENTO_CRIADO,
		PAGAMENTO_CONFIRMADO, PAGAMENTO_ATRASADO, PAGAMENTO_RECUSADO, PAGAMENTO_ESTORNADO, IGNORADO

	}

	record DadosPagamento(String id, Integer valorCentavos, String metodo, LocalDate vencimento, Instant pagoEm,
			String urlFatura) {
	}

	/**
	 * @param assinaturaGateway id da assinatura no gateway (sub_...)
	 * @param referencia externalReference (o id da assinatura na PotencIA, quando o gateway repassa)
	 */
	record Evento(String id, String tipo, Categoria categoria, String checkoutId, String assinaturaGateway,
			String cliente, String referencia, DadosPagamento pagamento) {
	}

	/** Só o id e o tipo, para guardar antes de processar. */
	record Cabecalho(String id, String tipo) {
	}

	static Cabecalho cabecalho(String corpo) {
		var raiz = ler(corpo);
		var id = texto(raiz, "id");
		var tipo = texto(raiz, "event");
		if (id == null || tipo == null) {
			throw new IllegalArgumentException("Evento sem id ou sem tipo.");
		}
		return new Cabecalho(id, tipo);
	}

	static Evento ler(String corpo, String id) {
		var raiz = ler(corpo);
		var tipo = texto(raiz, "event");
		var categoria = categoria(tipo);
		var checkout = raiz.path("checkout");
		var assinatura = raiz.path("subscription");
		var pagamento = raiz.path("payment");
		return switch (categoria) {
			case CHECKOUT_PAGO, CHECKOUT_ENCERRADO -> new Evento(id, tipo, categoria, texto(checkout, "id"), null,
					texto(checkout, "customer"), texto(checkout, "externalReference"), null);
			case ASSINATURA_CRIADA, ASSINATURA_ENCERRADA -> new Evento(id, tipo, categoria, null,
					texto(assinatura, "id"), texto(assinatura, "customer"), texto(assinatura, "externalReference"), null);
			case PAGAMENTO_CRIADO, PAGAMENTO_CONFIRMADO, PAGAMENTO_ATRASADO, PAGAMENTO_RECUSADO, PAGAMENTO_ESTORNADO ->
				new Evento(id, tipo, categoria, texto(pagamento, "checkoutSession"), texto(pagamento, "subscription"),
						texto(pagamento, "customer"), texto(pagamento, "externalReference"),
						new DadosPagamento(texto(pagamento, "id"), centavos(pagamento.path("value")),
								texto(pagamento, "billingType"), data(texto(pagamento, "dueDate")),
								pagoEm(pagamento), texto(pagamento, "invoiceUrl")));
			case IGNORADO -> new Evento(id, tipo, categoria, null, null, null, null, null);
		};
	}

	static Categoria categoria(String tipo) {
		return switch (tipo == null ? "" : tipo) {
			case "CHECKOUT_PAID" -> Categoria.CHECKOUT_PAGO;
			case "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED" -> Categoria.CHECKOUT_ENCERRADO;
			case "SUBSCRIPTION_CREATED" -> Categoria.ASSINATURA_CRIADA;
			case "SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED" -> Categoria.ASSINATURA_ENCERRADA;
			case "PAYMENT_CREATED", "PAYMENT_UPDATED" -> Categoria.PAGAMENTO_CRIADO;
			case "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED" -> Categoria.PAGAMENTO_CONFIRMADO;
			case "PAYMENT_OVERDUE" -> Categoria.PAGAMENTO_ATRASADO;
			case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "PAYMENT_REPROVED_BY_RISK_ANALYSIS" -> Categoria.PAGAMENTO_RECUSADO;
			case "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED" -> Categoria.PAGAMENTO_ESTORNADO;
			default -> Categoria.IGNORADO;
		};
	}

	private static JsonNode ler(String corpo) {
		try {
			return JSON.readTree(corpo);
		}
		catch (RuntimeException e) {
			throw new IllegalArgumentException("Corpo do evento não é JSON.");
		}
	}

	private static String texto(JsonNode no, String campo) {
		var v = no.path(campo);
		if (v.isMissingNode() || v.isNull()) {
			return null;
		}
		var s = v.asString();
		return s == null || s.isBlank() ? null : s;
	}

	private static Integer centavos(JsonNode valor) {
		if (valor.isMissingNode() || valor.isNull()) {
			return null;
		}
		return new BigDecimal(valor.asString()).movePointRight(2).intValue();
	}

	private static LocalDate data(String texto) {
		if (texto == null) {
			return null;
		}
		try {
			return LocalDate.parse(texto.length() > 10 ? texto.substring(0, 10) : texto);
		}
		catch (DateTimeParseException e) {
			return null;
		}
	}

	/** Data do pagamento (o Asaas manda só o dia): meio-dia no horário de Brasília. */
	private static Instant pagoEm(JsonNode pagamento) {
		var dia = data(texto(pagamento, "paymentDate"));
		if (dia == null) {
			dia = data(texto(pagamento, "clientPaymentDate"));
		}
		return dia == null ? null : dia.atTime(12, 0).atZone(FUSO).toInstant();
	}

}
