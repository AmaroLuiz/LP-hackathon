package br.com.potencia.contas;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/**
 * Login com Google (OAuth 2.0 com PKCE). Fica desligado enquanto
 * {@code GOOGLE_CLIENT_ID} não estiver configurado. Interface separada para os
 * testes simularem o Google.
 */
interface ProvedorGoogle {

	/** O que interessa da conta Google. */
	record PerfilGoogle(String sub, String email, boolean emailVerificado, String nome) {
	}

	boolean isAtivo();

	/** Endereço da tela de consentimento do Google. */
	String urlAutorizacao(String estado, String desafioPkce, String retorno);

	/** Troca o código devolvido pelo Google pelo perfil da pessoa. */
	PerfilGoogle perfil(String codigo, String verificadorPkce, String retorno);

}

@Component
class GoogleOAuth implements ProvedorGoogle {

	private static final String AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth";

	private static final String TOKEN = "https://oauth2.googleapis.com/token";

	private static final String PERFIL = "https://openidconnect.googleapis.com/v1/userinfo";

	private final String clienteId;

	private final String segredo;

	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

	private final JsonMapper json = JsonMapper.builder().build();

	GoogleOAuth(@Value("${potencia.google.client-id:}") String clienteId,
			@Value("${potencia.google.client-secret:}") String segredo) {
		this.clienteId = clienteId;
		this.segredo = segredo;
	}

	@Override
	public boolean isAtivo() {
		return !clienteId.isBlank() && !segredo.isBlank();
	}

	@Override
	public String urlAutorizacao(String estado, String desafioPkce, String retorno) {
		var p = new LinkedHashMap<String, String>();
		p.put("client_id", clienteId);
		p.put("redirect_uri", retorno);
		p.put("response_type", "code");
		p.put("scope", "openid email profile");
		p.put("state", estado);
		p.put("code_challenge", desafioPkce);
		p.put("code_challenge_method", "S256");
		p.put("prompt", "select_account");
		return AUTORIZACAO + "?" + formulario(p);
	}

	@Override
	public PerfilGoogle perfil(String codigo, String verificadorPkce, String retorno) {
		try {
			var p = new LinkedHashMap<String, String>();
			p.put("code", codigo);
			p.put("client_id", clienteId);
			p.put("client_secret", segredo);
			p.put("redirect_uri", retorno);
			p.put("grant_type", "authorization_code");
			p.put("code_verifier", verificadorPkce);
			var token = http.send(HttpRequest.newBuilder(URI.create(TOKEN))
				.timeout(Duration.ofSeconds(15))
				.header("Content-Type", "application/x-www-form-urlencoded")
				.POST(HttpRequest.BodyPublishers.ofString(formulario(p)))
				.build(), HttpResponse.BodyHandlers.ofString());
			if (token.statusCode() != 200) {
				throw new IllegalStateException("Google recusou o código (HTTP " + token.statusCode() + ")");
			}
			var acesso = json.readTree(token.body()).path("access_token").asString();
			var perfil = http.send(HttpRequest.newBuilder(URI.create(PERFIL))
				.timeout(Duration.ofSeconds(15))
				.header("Authorization", "Bearer " + acesso)
				.GET()
				.build(), HttpResponse.BodyHandlers.ofString());
			if (perfil.statusCode() != 200) {
				throw new IllegalStateException("Google não devolveu o perfil (HTTP " + perfil.statusCode() + ")");
			}
			var n = json.readTree(perfil.body());
			return new PerfilGoogle(n.path("sub").asString(), n.path("email").asString(),
					n.path("email_verified").asBoolean(false), n.path("name").asString(""));
		}
		catch (IOException e) {
			throw new IllegalStateException("Falha ao falar com o Google", e);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Interrompido ao falar com o Google", e);
		}
	}

	private static String formulario(Map<String, String> campos) {
		return campos.entrySet()
			.stream()
			.map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
			.collect(Collectors.joining("&"));
	}

}
