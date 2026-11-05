package br.com.potencia.email;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Produção: envio pela API da Resend (https://resend.com/docs/api-reference/emails/send-email). */
@Component
@ConditionalOnProperty(name = "potencia.email.provedor", havingValue = "resend")
class EmailResend implements EnviadorEmail {

	private final RestClient http;

	private final String remetente;

	EmailResend(@Value("${potencia.email.resend-chave}") String chave,
			@Value("${potencia.email.remetente}") String remetente) {
		this.http = RestClient.builder()
			.baseUrl("https://api.resend.com")
			.defaultHeader("Authorization", "Bearer " + chave)
			.build();
		this.remetente = remetente;
	}

	@Override
	public void enviar(Email email) {
		http.post()
			.uri("/emails")
			.contentType(MediaType.APPLICATION_JSON)
			.body(Map.of("from", remetente, "to", List.of(email.para()), "subject", email.assunto(), "text",
					email.texto()))
			.retrieve()
			.toBodilessEntity();
	}

}
