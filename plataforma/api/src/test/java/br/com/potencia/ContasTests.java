package br.com.potencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import br.com.potencia.email.EnviadorEmail;

@SpringBootTest
@AutoConfigureMockMvc
class ContasTests {

	static final String SESSAO = "POTENCIA_SESSAO";

	static final String SENHA = "pao-de-queijo-quente-42";

	@Autowired
	MockMvcTester mvc;

	@Autowired
	EmailsCapturados emails;

	@Value("${potencia.admin.email}")
	String adminEmail;

	@Value("${potencia.admin.senha-inicial}")
	String adminSenha;

	// --- cadastro ------------------------------------------------------------

	@Test
	void cadastroCriaAContaEJaEntra() {
		var email = novoEmail();
		var resposta = cadastrar("Maria da Padaria", email.toUpperCase(), SENHA);
		assertThat(resposta).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.email").isEqualTo(email);
		assertThat(resposta).bodyJson().extractingPath("$.papel").isEqualTo("USUARIO");
		assertThat(resposta).bodyJson().extractingPath("$.emailVerificado").isEqualTo(false);

		var sessao = sessao(resposta);
		assertThat(mvc.get().uri("/api/me").cookie(sessao)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.nome")
			.isEqualTo("Maria da Padaria");
		assertThat(emails.para(email)).hasSize(1);
	}

	@Test
	void cadastroSemTokenCsrfEhRecusado() {
		assertThat(mvc.post()
			.uri("/api/auth/cadastro")
			.contentType(MediaType.APPLICATION_JSON)
			.content(cadastroJson("Sem Csrf", novoEmail(), SENHA, true))).hasStatus(HttpStatus.FORBIDDEN);
	}

	@Test
	void emailRepetidoResponde409() {
		var email = novoEmail();
		cadastrar("Primeira", email, SENHA);
		assertThat(cadastrar("Segunda", email, SENHA)).hasStatus(HttpStatus.CONFLICT)
			.bodyJson()
			.extractingPath("$.campos.email")
			.asString()
			.contains("Já existe uma conta");
	}

	@Test
	void senhaFracaETermosNaoAceitosSaoRecusados() {
		assertThat(cadastrar("Curta", novoEmail(), "123")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.campos.senha")
			.isEqualTo("A senha precisa ter de 10 a 128 caracteres.");
		assertThat(cadastrar("Obvia", novoEmail(), "1234567890")).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.campos.senha")
			.asString()
			.contains("fácil de adivinhar");
		assertThat(post("/api/auth/cadastro", cadastroJson("Sem termos", novoEmail(), SENHA, false), null))
			.hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.campos.aceitouTermos")
			.isEqualTo("Para criar a conta, aceite os termos de uso.");
	}

	// --- login ---------------------------------------------------------------

	@Test
	void senhaErradaEEmailInexistenteDaoAMesmaResposta() {
		var email = novoEmail();
		cadastrar("Joana", email, SENHA);
		assertThat(entrar(email, "senha-errada-123")).hasStatus(HttpStatus.UNAUTHORIZED)
			.bodyJson()
			.extractingPath("$.detail")
			.isEqualTo("E-mail ou senha incorretos.");
		assertThat(entrar(novoEmail(), SENHA)).hasStatus(HttpStatus.UNAUTHORIZED)
			.bodyJson()
			.extractingPath("$.detail")
			.isEqualTo("E-mail ou senha incorretos.");
	}

	@Test
	void cincoErrosSeguidosBloqueiamPorUmTempo() {
		var email = novoEmail();
		cadastrar("Pedro", email, SENHA);
		for (int i = 0; i < 5; i++) {
			assertThat(entrar(email, "senha-errada-" + i)).hasStatus(HttpStatus.UNAUTHORIZED);
		}
		var bloqueado = entrar(email, SENHA);
		assertThat(bloqueado).hasStatus(HttpStatus.TOO_MANY_REQUESTS).containsHeader("Retry-After");
	}

	@Test
	void sairEncerraASessao() {
		var email = novoEmail();
		cadastrar("Ana", email, SENHA);
		var sessao = sessao(entrar(email, SENHA));
		assertThat(post("/api/auth/sair", "{}", sessao)).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/me").cookie(sessao)).hasStatus(HttpStatus.UNAUTHORIZED);
	}

	// --- e-mail e senha ------------------------------------------------------

	@Test
	void linkDoEmailVerificaAContaUmaVezSo() {
		var email = novoEmail();
		var sessao = sessao(cadastrar("Lia", email, SENHA));
		var token = token(emails.para(email).getLast());

		assertThat(post("/api/auth/verificar-email", "{\"token\":\"" + token + "\"}", null))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/me").cookie(sessao)).bodyJson()
			.extractingPath("$.emailVerificado")
			.isEqualTo(true);
		assertThat(post("/api/auth/verificar-email", "{\"token\":\"" + token + "\"}", null))
			.hasStatus(HttpStatus.BAD_REQUEST);
	}

	@Test
	void redefinirSenhaTrocaASenhaEDerrubaAsSessoes() {
		var email = novoEmail();
		var sessaoAntiga = sessao(cadastrar("Rita", email, SENHA));

		assertThat(post("/api/auth/esqueci-senha", "{\"email\":\"" + email + "\"}", null))
			.hasStatus(HttpStatus.ACCEPTED);
		var token = token(emails.para(email).getLast());
		var novaSenha = "bolo-de-fuba-cremoso-7";
		assertThat(post("/api/auth/redefinir-senha",
				"{\"token\":\"" + token + "\",\"novaSenha\":\"" + novaSenha + "\"}", null))
			.hasStatus(HttpStatus.NO_CONTENT);

		assertThat(mvc.get().uri("/api/me").cookie(sessaoAntiga)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(entrar(email, SENHA)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(entrar(email, novaSenha)).hasStatusOk();
	}

	@Test
	void esqueciSenhaDeEmailInexistenteNaoRevelaNada() {
		var email = novoEmail();
		assertThat(post("/api/auth/esqueci-senha", "{\"email\":\"" + email + "\"}", null))
			.hasStatus(HttpStatus.ACCEPTED);
		assertThat(emails.para(email)).isEmpty();
	}

	@Test
	void trocarSenhaExigeASenhaAtual() {
		var email = novoEmail();
		var sessao = sessao(cadastrar("Caio", email, SENHA));
		assertThat(post("/api/me/senha", "{\"senhaAtual\":\"errada-errada\",\"novaSenha\":\"outra-senha-boa-9\"}",
				sessao))
			.hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.campos.senhaAtual")
			.isEqualTo("A senha atual não confere.");
		assertThat(post("/api/me/senha", "{\"senhaAtual\":\"" + SENHA + "\",\"novaSenha\":\"outra-senha-boa-9\"}",
				sessao))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(entrar(email, "outra-senha-boa-9")).hasStatusOk();
	}

	// --- perfil (onboarding) -------------------------------------------------

	@Test
	void onboardingSalvaOPerfil() {
		var sessao = sessao(cadastrar("Bia", novoEmail(), SENHA));
		assertThat(mvc.get().uri("/api/me").cookie(sessao)).bodyJson()
			.extractingPath("$.onboardingConcluido")
			.isEqualTo(false);
		var resposta = mvc.patch()
			.uri("/api/me/perfil")
			.with(csrf())
			.cookie(sessao)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"segmentoNegocio\":\"Beleza e estética\",\"objetivo\":\"VIDEOS\",\"familiaridade\":\"NUNCA_USEI\"}")
			.exchange();
		assertThat(resposta).hasStatusOk().bodyJson().extractingPath("$.objetivo").isEqualTo("VIDEOS");
		assertThat(resposta).bodyJson().extractingPath("$.onboardingConcluido").isEqualTo(true);
		assertThat(resposta).bodyJson().extractingPath("$.segmentoNegocio").isEqualTo("Beleza e estética");
	}

	@Test
	void perfilComOpcaoInexistenteResponde400() {
		var sessao = sessao(cadastrar("Teo", novoEmail(), SENHA));
		assertThat(mvc.patch()
			.uri("/api/me/perfil")
			.with(csrf())
			.cookie(sessao)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"objetivo\":\"FICAR_RICO\"}")).hasStatus(HttpStatus.BAD_REQUEST);
	}

	// --- papéis --------------------------------------------------------------

	@Test
	void adminInicialEntraPrecisaTrocarASenhaEAcessaOPainel() {
		var resposta = entrar(adminEmail, adminSenha);
		assertThat(resposta).hasStatusOk().bodyJson().extractingPath("$.papel").isEqualTo("ADMIN");
		assertThat(resposta).bodyJson().extractingPath("$.deveTrocarSenha").isEqualTo(true);
		var sessao = sessao(resposta);
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(sessao)).hasStatus(HttpStatus.FORBIDDEN);

		assertThat(post("/api/me/senha",
				"{\"senhaAtual\":\"" + adminSenha + "\",\"novaSenha\":\"cafe-com-leite-e-pao-9\"}", sessao))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(sessao)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.length()")
			.isEqualTo(7);
	}

	@Test
	void alunoNaoAcessaOPainelAdmin() {
		var sessao = sessao(cadastrar("Aluno", novoEmail(), SENHA));
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(sessao)).hasStatus(HttpStatus.FORBIDDEN);
	}

	// -------------------------------------------------------------------------

	private MvcTestResult cadastrar(String nome, String email, String senha) {
		return post("/api/auth/cadastro", cadastroJson(nome, email, senha, true), null);
	}

	private MvcTestResult entrar(String email, String senha) {
		return post("/api/auth/entrar", "{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}", null);
	}

	private MvcTestResult post(String uri, String json, Cookie sessao) {
		var pedido = mvc.post().uri(uri).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json);
		if (sessao != null) {
			pedido = pedido.cookie(sessao);
		}
		return pedido.exchange();
	}

	private static String cadastroJson(String nome, String email, String senha, boolean termos) {
		return """
				{"nome":"%s","email":"%s","senha":"%s","aceitouTermos":%s,"aceitouMarketing":false}
				""".formatted(nome, email, senha, termos);
	}

	private static Cookie sessao(MvcTestResult resposta) {
		var cookie = resposta.getResponse().getCookie(SESSAO);
		assertThat(cookie).as("cookie de sessão").isNotNull();
		return cookie;
	}

	private static String token(EnviadorEmail.Email email) {
		var m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(email.texto());
		assertThat(m.find()).as("link com token no e-mail").isTrue();
		return m.group(1);
	}

	private static String novoEmail() {
		return "teste-" + UUID.randomUUID() + "@exemplo.com";
	}

	/** Guarda os e-mails em vez de imprimir no log. */
	static class EmailsCapturados implements EnviadorEmail {

		private final List<Email> enviados = new CopyOnWriteArrayList<>();

		@Override
		public void enviar(Email email) {
			enviados.add(email);
		}

		List<Email> para(String endereco) {
			return enviados.stream().filter(e -> e.para().equals(endereco)).toList();
		}

	}

	@TestConfiguration
	static class Config {

		@Bean
		@Primary
		EmailsCapturados emailsCapturados() {
			return new EmailsCapturados();
		}

	}

}
