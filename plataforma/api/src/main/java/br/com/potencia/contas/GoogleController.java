package br.com.potencia.contas;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.compartilhado.ErroApi;

/**
 * "Continuar com o Google". O Google devolve a pessoa para
 * {@code WEB_URL/api/auth/google/retorno} (mesmo domínio do site, pelo rewrite
 * do Next), onde a sessão é aberta como num login comum.
 */
@RestController
class GoogleController {

	private static final Logger log = LoggerFactory.getLogger(GoogleController.class);

	private static final String ESTADO = "potencia.google.estado";

	private static final String VERIFICADOR = "potencia.google.verificador";

	private static final String VOLTAR = "potencia.google.voltar";

	private final SecureRandom aleatorio = new SecureRandom();

	private final ProvedorGoogle google;

	private final ContaService contas;

	private final Sessoes sessoes;

	private final String webUrl;

	GoogleController(ProvedorGoogle google, ContaService contas, Sessoes sessoes,
			@Value("${potencia.web-url}") String webUrl) {
		this.google = google;
		this.contas = contas;
		this.sessoes = sessoes;
		this.webUrl = webUrl;
	}

	/** Quais botões de "entrar com" o site mostra. */
	@GetMapping("/api/auth/provedores")
	Map<String, Boolean> provedores() {
		return Map.of("google", google.isAtivo());
	}

	@GetMapping("/api/auth/google")
	void iniciar(@RequestParam(required = false) String voltar, HttpServletRequest req, HttpServletResponse res)
			throws IOException {
		if (!google.isAtivo()) {
			throw ErroApi.indisponivel("O login com Google não está disponível agora.");
		}
		var estado = aleatorio(24);
		var verificador = aleatorio(48);
		var sessao = req.getSession(true);
		sessao.setAttribute(ESTADO, estado);
		sessao.setAttribute(VERIFICADOR, verificador);
		sessao.setAttribute(VOLTAR, destinoSeguro(voltar));
		res.sendRedirect(google.urlAutorizacao(estado, desafio(verificador), retorno()));
	}

	@GetMapping("/api/auth/google/retorno")
	void retorno(@RequestParam(required = false) String code, @RequestParam(required = false) String state,
			@RequestParam(required = false) String error, HttpServletRequest req, HttpServletResponse res)
			throws IOException {
		var sessao = req.getSession(false);
		var estado = sessao == null ? null : (String) sessao.getAttribute(ESTADO);
		var verificador = sessao == null ? null : (String) sessao.getAttribute(VERIFICADOR);
		var voltar = sessao == null ? "/" : (String) sessao.getAttribute(VOLTAR);
		if (sessao != null) {
			sessao.removeAttribute(ESTADO);
			sessao.removeAttribute(VERIFICADOR);
			sessao.removeAttribute(VOLTAR);
		}
		if (error != null) {
			// A pessoa desistiu na tela do Google.
			res.sendRedirect(webUrl + "/entrar?voltar=" + URLEncoder.encode(voltar, StandardCharsets.UTF_8));
			return;
		}
		if (code == null || estado == null || verificador == null || !MessageDigest.isEqual(
				estado.getBytes(StandardCharsets.UTF_8), String.valueOf(state).getBytes(StandardCharsets.UTF_8))) {
			res.sendRedirect(webUrl + "/entrar?erro=google");
			return;
		}
		try {
			var perfil = google.perfil(code, verificador, retorno());
			var usuario = contas.entrarComGoogle(perfil.sub(), perfil.email(), perfil.emailVerificado(), perfil.nome());
			sessoes.iniciar(usuario, true, req, res);
			res.sendRedirect(webUrl + voltar);
		}
		catch (ErroApi e) {
			res.sendRedirect(webUrl + "/entrar?erro=" + (e.getStatus().value() == 403 ? "google-bloqueado" : "google"));
		}
		catch (RuntimeException e) {
			log.warn("Login com Google falhou: {}", e.getMessage());
			res.sendRedirect(webUrl + "/entrar?erro=google");
		}
	}

	private String retorno() {
		return webUrl + "/api/auth/google/retorno";
	}

	/** Só caminhos do próprio site (nada de "//outro-site" ou "https://..."). */
	static String destinoSeguro(String voltar) {
		if (voltar == null || !voltar.startsWith("/") || voltar.startsWith("//") || voltar.contains("\\")) {
			return "/";
		}
		return voltar;
	}

	private String aleatorio(int bytes) {
		var b = new byte[bytes];
		aleatorio.nextBytes(b);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
	}

	private static String desafio(String verificador) {
		try {
			var hash = MessageDigest.getInstance("SHA-256").digest(verificador.getBytes(StandardCharsets.US_ASCII));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
