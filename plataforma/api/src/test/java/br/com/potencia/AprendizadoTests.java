package br.com.potencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import com.jayway.jsonpath.JsonPath;

/**
 * Fluxo do aluno de ponta a ponta: prévia, bloqueio sem plano, assinatura,
 * e-mail, player, conclusão, certificado, anotações, lista de desejos e
 * acesso manual.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContasTests.Config.class)
// Banco próprio: este teste troca a senha do admin, e o ContasTests depende da senha inicial.
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:aprendizado;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH")
class AprendizadoTests {

	static final String SENHA = "aula-de-teste-segura-1";

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ContasTests.EmailsCapturados emails;

	@Value("${potencia.admin.email}")
	String adminEmail;

	@Value("${potencia.admin.senha-inicial}")
	String adminSenha;

	@Test
	void previaEhPublicaEAulaPagaNao() throws Exception {
		var aulas = aulasDo("primeiros-passos");
		assertThat(mvc.get().uri("/api/aulas/" + aulas.getFirst() + "/previa")).hasStatusOk()
			.bodyJson()
			.extractingPath("$.video.url")
			.isEqualTo("/videos/exemplo.mp4");
		assertThat(mvc.get().uri("/api/aulas/" + aulas.get(1) + "/previa")).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(mvc.get().uri("/api/aulas/" + aulas.get(1))).hasStatus(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void alunoSemPlanoEhBarrado() throws Exception {
		var aluno = novoAluno(true);
		var aula = aulasDo("primeiros-passos").get(1);
		assertThat(mvc.get().uri("/api/aulas/" + aula).cookie(aluno)).hasStatus(HttpStatus.FORBIDDEN)
			.bodyJson()
			.extractingPath("$.codigo")
			.isEqualTo("SEM_ACESSO");
		assertThat(mvc.get().uri("/api/cursos/primeiros-passos/acesso").cookie(aluno)).bodyJson()
			.extractingPath("$.podeAssistir")
			.isEqualTo(false);
	}

	@Test
	void assinaturaLiberaOsCursosDoPlanoDepoisDoEmailConfirmado() throws Exception {
		var email = novoEmail();
		var aluno = cadastrar(email);
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno))
			.hasStatus(HttpStatus.CREATED)
			.bodyJson()
			.extractingPath("$.status")
			.isEqualTo("ATIVA");
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"completo\"}", aluno))
			.hasStatus(HttpStatus.CONFLICT);

		var aula = aulasDo("primeiros-passos").get(1);
		assertThat(mvc.get().uri("/api/aulas/" + aula).cookie(aluno)).hasStatus(HttpStatus.FORBIDDEN)
			.bodyJson()
			.extractingPath("$.codigo")
			.isEqualTo("EMAIL_NAO_VERIFICADO");

		confirmarEmail(email);
		assertThat(mvc.get().uri("/api/aulas/" + aula).cookie(aluno)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.video.url")
			.isEqualTo("/videos/exemplo.mp4");

		// Vídeos em motion não está no Essencial.
		var outra = aulasDo("videos-em-motion").get(1);
		assertThat(mvc.get().uri("/api/aulas/" + outra).cookie(aluno)).hasStatus(HttpStatus.FORBIDDEN);
	}

	@Test
	void concluirTodasAsAulasEmiteCertificadoValidavel() throws Exception {
		var aluno = alunoComPlano("essencial");
		var aulas = aulasDo("primeiros-passos");

		assertThat(enviar(HttpMethod.PUT, "/api/aulas/" + aulas.get(1) + "/posicao", "{\"posicaoSegundos\":42}", aluno))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/aulas/" + aulas.get(1)).cookie(aluno)).bodyJson()
			.extractingPath("$.posicaoSegundos")
			.isEqualTo(42);

		MvcTestResult ultima = null;
		for (var aula : aulas) {
			ultima = enviar(HttpMethod.PUT, "/api/aulas/" + aula + "/conclusao", "{\"concluida\":true}", aluno);
			assertThat(ultima).hasStatusOk();
		}
		assertThat(ultima).bodyJson().extractingPath("$.cursoConcluido").isEqualTo(true);
		assertThat(ultima).bodyJson().extractingPath("$.percentual").isEqualTo(100);
		String codigo = JsonPath.read(ultima.getResponse().getContentAsString(), "$.certificadoCodigo");
		assertThat(codigo).matches("PTC-[2-9A-Z]{4}-[2-9A-Z]{4}");

		assertThat(mvc.get().uri("/api/certificados/" + codigo)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.tituloCurso")
			.isEqualTo("Primeiros passos");
		assertThat(mvc.get().uri("/api/certificados/PTC-0000-0000")).hasStatus(HttpStatus.NOT_FOUND);

		assertThat(mvc.get().uri("/api/me/cursos").cookie(aluno)).bodyJson()
			.extractingPath("$[0].matricula.concluido")
			.isEqualTo(true);
		assertThat(mvc.get().uri("/api/aprender/primeiros-passos").cookie(aluno)).bodyJson()
			.extractingPath("$.aulasConcluidas")
			.isEqualTo(5);
	}

	@Test
	void anotacaoDeOutraPessoaNaoPodeSerVistaNemAlterada() throws Exception {
		var dona = alunoComPlano("essencial");
		var outra = alunoComPlano("essencial");
		var aula = aulasDo("primeiros-passos").get(1);

		var criada = enviar(HttpMethod.POST, "/api/aulas/" + aula + "/anotacoes",
				"{\"posicaoSegundos\":12,\"texto\":\"Lembrar de baixar a versão para Windows\"}", dona);
		assertThat(criada).hasStatus(HttpStatus.CREATED);
		String id = JsonPath.read(criada.getResponse().getContentAsString(), "$.id");

		assertThat(mvc.get().uri("/api/aulas/" + aula + "/anotacoes").cookie(outra)).bodyJson()
			.extractingPath("$.length()")
			.isEqualTo(0);
		assertThat(enviar(HttpMethod.PUT, "/api/anotacoes/" + id, "{\"texto\":\"invadido\"}", outra))
			.hasStatus(HttpStatus.NOT_FOUND);
		assertThat(enviar(HttpMethod.DELETE, "/api/anotacoes/" + id, null, outra)).hasStatus(HttpStatus.NOT_FOUND);

		assertThat(enviar(HttpMethod.PUT, "/api/anotacoes/" + id, "{\"texto\":\"Baixar a versão para Windows\"}", dona))
			.hasStatusOk();
		assertThat(enviar(HttpMethod.DELETE, "/api/anotacoes/" + id, null, dona)).hasStatus(HttpStatus.NO_CONTENT);
	}

	@Test
	void listaDeDesejosEResumo() throws Exception {
		var aluno = novoAluno(true);
		assertThat(enviar(HttpMethod.PUT, "/api/me/lista-desejos/voz-e-narracao", null, aluno))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(enviar(HttpMethod.PUT, "/api/me/lista-desejos/voz-e-narracao", null, aluno))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/me/lista-desejos").cookie(aluno)).bodyJson()
			.extractingPath("$[0].slug")
			.isEqualTo("voz-e-narracao");
		assertThat(mvc.get().uri("/api/me/resumo").cookie(aluno)).bodyJson()
			.extractingPath("$.desejos.length()")
			.isEqualTo(1);
		assertThat(enviar(HttpMethod.DELETE, "/api/me/lista-desejos/voz-e-narracao", null, aluno))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(enviar(HttpMethod.PUT, "/api/me/lista-desejos/nao-existe", null, aluno))
			.hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void adminConcedeAcessoManualAUmCurso() throws Exception {
		var email = novoEmail();
		var aluno = cadastrar(email);
		confirmarEmail(email);
		String alunoId = JsonPath.read(mvc.get().uri("/api/me").cookie(aluno).exchange().getResponse().getContentAsString(),
				"$.id");

		var admin = sessao(enviar(HttpMethod.POST, "/api/auth/entrar",
				"{\"email\":\"" + adminEmail + "\",\"senha\":\"" + adminSenha + "\"}", null));
		// Primeiro acesso do admin: troca a senha provisória (só na primeira vez neste contexto).
		enviar(HttpMethod.POST, "/api/me/senha",
				"{\"senhaAtual\":\"" + adminSenha + "\",\"novaSenha\":\"admin-aprendizado-teste-7\"}", admin);

		String cursoId = String.valueOf((Integer) JsonPath.read(
				mvc.get().uri("/api/cursos/videos-em-motion").exchange().getResponse().getContentAsString(), "$.card.id"));
		assertThat(enviar(HttpMethod.POST, "/api/admin/acessos",
				"{\"usuarioId\":\"" + alunoId + "\",\"cursoId\":" + cursoId + ",\"motivo\":\"Parceria de teste\"}", admin))
			.hasStatus(HttpStatus.NO_CONTENT);

		var aula = aulasDo("videos-em-motion").get(1);
		assertThat(mvc.get().uri("/api/aulas/" + aula).cookie(aluno)).hasStatusOk();
		assertThat(mvc.get().uri("/api/cursos/videos-em-motion/acesso").cookie(aluno)).bodyJson()
			.extractingPath("$.motivo")
			.isEqualTo("ACESSO_MANUAL");
	}

	// -------------------------------------------------------------------------

	private List<Integer> aulasDo(String slug) throws Exception {
		var json = mvc.get().uri("/api/cursos/" + slug).exchange().getResponse().getContentAsString();
		return JsonPath.read(json, "$.modulos[*].aulas[*].id");
	}

	private Cookie alunoComPlano(String plano) {
		var email = novoEmail();
		var aluno = cadastrar(email);
		confirmarEmail(email);
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"" + plano + "\"}", aluno))
			.hasStatus(HttpStatus.CREATED);
		return aluno;
	}

	private Cookie novoAluno(boolean confirmado) {
		var email = novoEmail();
		var aluno = cadastrar(email);
		if (confirmado) {
			confirmarEmail(email);
		}
		return aluno;
	}

	private Cookie cadastrar(String email) {
		return sessao(enviar(HttpMethod.POST, "/api/auth/cadastro", """
				{"nome":"Aluna de Teste","email":"%s","senha":"%s","aceitouTermos":true}
				""".formatted(email, SENHA), null));
	}

	private void confirmarEmail(String email) {
		// O link está no último e-mail de confirmação (depois dele podem vir outros, como "assinatura ativa").
		var texto = emails.para(email).reversed().stream().map(e -> e.texto()).filter(t -> t.contains("/verificar-email?token=")).findFirst().orElse("");
		var m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(texto);
		assertThat(m.find()).isTrue();
		assertThat(enviar(HttpMethod.POST, "/api/auth/verificar-email", "{\"token\":\"" + m.group(1) + "\"}", null))
			.hasStatus(HttpStatus.NO_CONTENT);
	}

	private MvcTestResult enviar(HttpMethod metodo, String uri, String json, Cookie sessao) {
		var pedido = mvc.method(metodo).uri(uri).with(csrf());
		if (json != null) {
			pedido = pedido.contentType(MediaType.APPLICATION_JSON).content(json);
		}
		if (sessao != null) {
			pedido = pedido.cookie(sessao);
		}
		return pedido.exchange();
	}

	private static Cookie sessao(MvcTestResult resposta) {
		var cookie = resposta.getResponse().getCookie("POTENCIA_SESSAO");
		assertThat(cookie).as("cookie de sessão").isNotNull();
		return cookie;
	}

	private static String novoEmail() {
		return "aprendizado-" + UUID.randomUUID() + "@exemplo.com";
	}

}
