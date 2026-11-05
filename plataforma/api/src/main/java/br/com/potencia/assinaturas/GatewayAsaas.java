package br.com.potencia.assinaturas;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import br.com.potencia.compartilhado.ErroApi;

/**
 * Asaas (sandbox ou produção, conforme ASAAS_URL). A cobrança usa o Checkout
 * do Asaas com recorrência mensal: o aluno digita o cartão (ou paga o Pix) na
 * página do Asaas; a PotencIA só recebe os eventos pelo webhook.
 *
 * Documentação: https://docs.asaas.com/reference/create-new-checkout e
 * https://docs.asaas.com/reference/atualizar-assinatura-existente
 */
@Component
@ConditionalOnProperty(name = "potencia.pagamentos.gateway", havingValue = "asaas")
class GatewayAsaas implements GatewayPagamento {

	private static final Logger log = LoggerFactory.getLogger(GatewayAsaas.class);

	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private final RestClient cliente;

	private final String webUrl;

	private final List<String> formas;

	private final String linkAssinatura;

	private final String imagem;

	private final Clock relogio;

	GatewayAsaas(@Value("${potencia.asaas.url}") String url, @Value("${potencia.asaas.chave}") String chave,
			@Value("${potencia.asaas.formas:CREDIT_CARD,PIX}") String formas,
			@Value("${potencia.asaas.link-assinatura:}") String linkAssinatura,
			@Value("${potencia.asaas.imagem-item:}") String imagem, @Value("${potencia.web-url}") String webUrl,
			Clock relogio) {
		if (chave == null || chave.isBlank()) {
			throw new IllegalStateException("PAGAMENTOS_GATEWAY=asaas precisa de ASAAS_CHAVE.");
		}
		var http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();
		var fabrica = new JdkClientHttpRequestFactory(http);
		fabrica.setReadTimeout(Duration.ofSeconds(20));
		this.cliente = RestClient.builder()
			.baseUrl(url.replaceAll("/+$", "") + "/v3")
			.requestFactory(fabrica)
			.defaultHeader("access_token", chave)
			.defaultHeader("User-Agent", "PotencIA/1.0")
			.build();
		this.webUrl = webUrl.replaceAll("/+$", "");
		this.formas = Arrays.stream(formas.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList();
		this.linkAssinatura = linkAssinatura;
		this.imagem = imagem == null || imagem.isBlank() ? expoente() : imagem;
		this.relogio = relogio;
	}

	@Override
	public String nome() {
		return "asaas";
	}

	record RespostaCheckout(String id, String link, String status) {
	}

	@Override
	public Checkout iniciar(PedidoCheckout p) {
		var item = new LinkedHashMap<String, Object>();
		item.put("name", cortar("PotencIA " + p.planoNome(), 30));
		item.put("description", cortar("Assinatura mensal do plano " + p.planoNome(), 150));
		item.put("quantity", 1);
		item.put("value", reais(p.valorCentavos()));
		item.put("imageBase64", imagem);

		var corpo = new LinkedHashMap<String, Object>();
		corpo.put("billingTypes", formas);
		corpo.put("chargeTypes", List.of("RECURRENT"));
		corpo.put("minutesToExpire", 60);
		corpo.put("externalReference", p.assinaturaId().toString());
		corpo.put("callback", Map.of("successUrl", webUrl + "/minha-conta/assinatura?checkout=ok", "cancelUrl",
				webUrl + "/planos?checkout=cancelado", "expiredUrl", webUrl + "/planos?checkout=expirado"));
		corpo.put("items", List.of(item));
		corpo.put("customerData", Map.of("name", p.nomeCliente(), "email", p.emailCliente()));
		corpo.put("subscription", Map.of("cycle", "MONTHLY", "nextDueDate", hoje().toString()));

		var r = chamar(() -> cliente.post()
			.uri("/checkouts")
			.contentType(MediaType.APPLICATION_JSON)
			.body(corpo)
			.retrieve()
			.body(RespostaCheckout.class));
		if (r == null || r.link() == null) {
			throw ErroApi.indisponivel("O Asaas não devolveu a página de pagamento. Tente de novo em instantes.");
		}
		return new Checkout(r.id(), r.link(), false, null, null);
	}

	@Override
	public void alterarValor(String gatewayId, int valorCentavos) {
		atualizar(gatewayId, Map.of("value", reais(valorCentavos), "updatePendingPayments", true));
	}

	@Override
	public void suspender(String gatewayId) {
		atualizar(gatewayId, Map.of("status", "INACTIVE"));
	}

	@Override
	public void reativar(String gatewayId, LocalDate proximoVencimento) {
		atualizar(gatewayId, Map.of("status", "ACTIVE", "nextDueDate", proximoVencimento.toString()));
	}

	@Override
	public String linkNoPainel(String gatewayId) {
		return linkAssinatura.isBlank() || gatewayId == null ? null : linkAssinatura.replace("{id}", gatewayId);
	}

	private void atualizar(String gatewayId, Map<String, Object> corpo) {
		if (gatewayId == null) {
			throw ErroApi.indisponivel("Esta assinatura ainda não foi confirmada pelo Asaas. Tente de novo em alguns minutos.");
		}
		chamar(() -> cliente.put()
			.uri("/subscriptions/{id}", gatewayId)
			.contentType(MediaType.APPLICATION_JSON)
			.body(corpo)
			.retrieve()
			.toBodilessEntity());
	}

	private <T> T chamar(java.util.function.Supplier<T> chamada) {
		try {
			return chamada.get();
		}
		catch (RestClientResponseException e) {
			log.error("Asaas respondeu {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
			throw ErroApi.indisponivel("O pagamento está indisponível agora. Tente de novo em instantes.");
		}
		catch (RestClientException e) {
			log.error("Sem resposta do Asaas: {}", e.getMessage());
			throw ErroApi.indisponivel("O pagamento está indisponível agora. Tente de novo em instantes.");
		}
	}

	/** Imagem do item no checkout (obrigatória no Asaas): o quadrado dourado da marca, em PNG. */
	static String expoente() {
		var imagem = new java.awt.image.BufferedImage(96, 96, java.awt.image.BufferedImage.TYPE_INT_RGB);
		var g = imagem.createGraphics();
		g.setColor(new java.awt.Color(0x17, 0x1E, 0x19));
		g.fillRect(0, 0, 96, 96);
		g.setColor(new java.awt.Color(0xF2, 0xB7, 0x05));
		g.fillRect(56, 8, 32, 32);
		g.dispose();
		try (var saida = new java.io.ByteArrayOutputStream()) {
			javax.imageio.ImageIO.write(imagem, "png", saida);
			return java.util.Base64.getEncoder().encodeToString(saida.toByteArray());
		}
		catch (java.io.IOException e) {
			throw new java.io.UncheckedIOException(e);
		}
	}

	private LocalDate hoje() {
		return LocalDate.ofInstant(relogio.instant(), FUSO);
	}

	private static BigDecimal reais(int centavos) {
		return BigDecimal.valueOf(centavos).divide(BigDecimal.valueOf(100), 2, RoundingMode.UNNECESSARY);
	}

	private static String cortar(String s, int max) {
		return s.length() <= max ? s : s.substring(0, max);
	}

}
