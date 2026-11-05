package br.com.potencia.contas;

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
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import com.jayway.jsonpath.JsonPath;

import br.com.potencia.email.EnviadorEmail;

/**
 * Fase 6: perguntas e respostas, avaliações com moderação, cupons, perfil e
 * troca de e-mail, sessões, LGPD (exportar e excluir) e login com Google
 * (com um Google simulado).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(AcabamentoTests.Config.class)
@TestPropertySource(properties = {
		"spring.datasource.url=jdbc:h2:mem:acabamento;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"potencia.revalidar.segredo=", "potencia.manutencao.agendada=false" })
class AcabamentoTests {

	static final String SENHA = "acabamento-de-teste-1";

	static final String SENHA_ADMIN = "admin-acabamento-teste-9";

	static final String CURSO = "primeiros-passos";

	@Autowired
	MockMvcTester mvc;

	@Autowired
	EmailsCapturados emails;

	@Autowired
	GoogleSimulado google;

	@Value("${potencia.admin.email}")
	String adminEmail;

	@Value("${potencia.admin.senha-inicial}")
	String adminSenhaInicial;

	@Value("${potencia.web-url}")
	String webUrl;

	// --- Perguntas e respostas ------------------------------------------------------

	@Test
	void perguntasRespostasUtilEModeracao() throws Exception {
		var emailA = novoEmail();
		var a = alunoComPlano(emailA, "Marta Confeiteira", "essencial");
		var b = alunoComPlano(novoEmail(), "Bruno Lima", "essencial");
		var semPlano = aluno(novoEmail(), "Sem Plano");
		var aulas = aulasDo(CURSO);
		var aula = aulas.get(1);

		var criada = enviar(HttpMethod.POST, "/api/aulas/" + aula + "/perguntas",
				"{\"titulo\":\"Como salvo o prompt?\",\"texto\":\"Não achei onde guardar.\"}", a);
		assertThat(criada).hasStatus(HttpStatus.CREATED);
		String id = JsonPath.read(criada.getResponse().getContentAsString(), "$.id");

		assertThat(enviar(HttpMethod.POST, "/api/aulas/" + aula + "/perguntas", "{\"titulo\":\"\",\"texto\":\"x\"}", a))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(mvc.get().uri("/api/aulas/" + aulas.getLast() + "/perguntas").cookie(semPlano))
			.hasStatus(HttpStatus.FORBIDDEN);

		var lista = mvc.get().uri("/api/aulas/" + aula + "/perguntas").cookie(b).exchange();
		assertThat(lista).bodyJson().extractingPath("$[0].titulo").isEqualTo("Como salvo o prompt?");
		// Para os outros alunos o nome aparece abreviado.
		assertThat(lista).bodyJson().extractingPath("$[0].autor.nome").isEqualTo("Marta C.");
		assertThat(lista).bodyJson().extractingPath("$[0].autor.voce").isEqualTo(false);

		assertThat(enviar(HttpMethod.PUT, "/api/perguntas/" + id + "/util", "{\"util\":true}", b)).bodyJson()
			.extractingPath("$.uteis")
			.isEqualTo(1);
		assertThat(enviar(HttpMethod.PUT, "/api/perguntas/" + id + "/util", "{\"util\":true}", b)).bodyJson()
			.extractingPath("$.uteis")
			.isEqualTo(1);

		assertThat(enviar(HttpMethod.POST, "/api/perguntas/" + id + "/respostas", "{\"texto\":\"No menu Salvar.\"}", b))
			.hasStatus(HttpStatus.CREATED);
		assertThat(emails.para(emailA)).anyMatch(e -> e.assunto().contains("Responderam sua pergunta"));

		var admin = admin();
		assertThat(mvc.get().uri("/api/admin/perguntas").cookie(admin)).bodyJson()
			.extractingPath("$.itens[*].id")
			.asArray()
			.contains(id);
		assertThat(enviar(HttpMethod.POST, "/api/admin/perguntas/" + id + "/respostas",
				"{\"texto\":\"Isso mesmo, e dá para renomear.\"}", admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		var depois = mvc.get().uri("/api/aulas/" + aula + "/perguntas").cookie(a).exchange();
		assertThat(depois).bodyJson().extractingPath("$[0].respondidaPelaEquipe").isEqualTo(true);
		assertThat(depois).bodyJson().extractingPath("$[0].respostas[1].autor.nome").isEqualTo("Equipe PotencIA");
		assertThat(depois).bodyJson().extractingPath("$[0].marcadaPorVoce").isEqualTo(false);

		assertThat(enviar(HttpMethod.PUT, "/api/admin/perguntas/" + id + "/oculta", "{\"oculta\":true}", admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/aulas/" + aula + "/perguntas").cookie(a)).bodyJson()
			.extractingPath("$[*].id")
			.asArray()
			.doesNotContain(id);
		// Quem não é admin não modera.
		assertThat(enviar(HttpMethod.PUT, "/api/admin/perguntas/" + id + "/oculta", "{\"oculta\":false}", a))
			.hasStatus(HttpStatus.FORBIDDEN);
	}

	// --- Avaliações -------------------------------------------------------------------

	@Test
	void avaliacaoExige30PorCentoEModeracaoRecalculaAMedia() throws Exception {
		var aluno = alunoComPlano(novoEmail(), "Carla Souza", "essencial");
		var aulas = aulasDo(CURSO);
		int antes = totalAvaliacoes();

		assertThat(mvc.get().uri("/api/cursos/" + CURSO + "/minha-avaliacao").cookie(aluno)).bodyJson()
			.extractingPath("$.podeAvaliar")
			.isEqualTo(false);
		assertThat(enviar(HttpMethod.PUT, "/api/cursos/" + CURSO + "/avaliacao", "{\"nota\":5}", aluno))
			.hasStatus(HttpStatus.FORBIDDEN);

		concluir(aluno, aulas.subList(0, 2));
		assertThat(enviar(HttpMethod.PUT, "/api/cursos/" + CURSO + "/avaliacao", "{\"nota\":6}", aluno))
			.hasStatus(HttpStatus.BAD_REQUEST);
		var avaliou = enviar(HttpMethod.PUT, "/api/cursos/" + CURSO + "/avaliacao",
				"{\"nota\":4,\"comentario\":\"Direto ao ponto.\"}", aluno);
		assertThat(avaliou).hasStatusOk().bodyJson().extractingPath("$.nota").isEqualTo(4);
		// Editar não cria outra avaliação.
		enviar(HttpMethod.PUT, "/api/cursos/" + CURSO + "/avaliacao", "{\"nota\":5,\"comentario\":\"Direto ao ponto!\"}",
				aluno);
		assertThat(totalAvaliacoes()).isEqualTo(antes + 1);

		var publicas = mvc.get().uri("/api/cursos/" + CURSO + "/avaliacoes?nota=5").exchange();
		assertThat(publicas).hasStatusOk();
		assertThat(publicas).bodyJson().extractingPath("$.itens[*].nome").asArray().contains("Carla S.");
		assertThat(mvc.get().uri("/api/cursos/" + CURSO).exchange()).bodyJson()
			.extractingPath("$.card.totalAvaliacoes")
			.isEqualTo(antes + 1);

		var admin = admin();
		var fila = mvc.get().uri("/api/admin/avaliacoes?nota=5").cookie(admin).exchange();
		List<String> ids = JsonPath.read(fila.getResponse().getContentAsString(),
				"$.itens[?(@.comentario == 'Direto ao ponto!')].id");
		assertThat(ids).hasSize(1);
		assertThat(enviar(HttpMethod.PUT, "/api/admin/avaliacoes/" + ids.getFirst() + "/resposta",
				"{\"texto\":\"Obrigado, Carla!\"}", admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/cursos/" + CURSO + "/minha-avaliacao").cookie(aluno)).bodyJson()
			.extractingPath("$.respostaEquipe")
			.isEqualTo("Obrigado, Carla!");

		assertThat(enviar(HttpMethod.PUT, "/api/admin/avaliacoes/" + ids.getFirst() + "/oculta", "{\"oculta\":true}",
				admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(totalAvaliacoes()).isEqualTo(antes);
		assertThat(mvc.get().uri("/api/cursos/" + CURSO).exchange()).bodyJson()
			.extractingPath("$.card.totalAvaliacoes")
			.isEqualTo(antes);
	}

	// --- Cupons -------------------------------------------------------------------------

	@Test
	void cupomDaDescontoNasPrimeirasCobrancasEContaUmUso() throws Exception {
		var admin = admin();
		var codigo = "TESTE" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
		var criado = enviar(HttpMethod.POST, "/api/admin/cupons", """
				{"codigo":"%s","percentual":50,"meses":3,"planoId":"completo","limiteUsos":1}
				""".formatted(codigo.toLowerCase()), admin);
		assertThat(criado).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.codigo").isEqualTo(codigo);
		assertThat(enviar(HttpMethod.POST, "/api/admin/cupons", "{\"codigo\":\"" + codigo + "\",\"percentual\":10}",
				admin))
			.hasStatus(HttpStatus.CONFLICT);
		assertThat(enviar(HttpMethod.POST, "/api/admin/cupons", "{\"codigo\":\"com espaço\",\"percentual\":10}", admin))
			.hasStatus(HttpStatus.BAD_REQUEST);

		var aluno = aluno(novoEmail(), "Dora Cupom");
		assertThat(mvc.get().uri("/api/cupons/" + codigo + "?plano=essencial").cookie(aluno))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(mvc.get().uri("/api/cupons/NAOEXISTE?plano=completo").cookie(aluno))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(mvc.get().uri("/api/cupons/" + codigo + "?plano=completo").cookie(aluno)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.percentual")
			.isEqualTo(50);

		assertThat(enviar(HttpMethod.POST, "/api/assinaturas",
				"{\"planoId\":\"completo\",\"cupom\":\"" + codigo.toLowerCase() + "\"}", aluno))
			.hasStatus(HttpStatus.CREATED);
		var minha = mvc.get().uri("/api/me/assinatura").cookie(aluno).exchange();
		assertThat(minha).bodyJson().extractingPath("$.cupom").isEqualTo(codigo);
		assertThat(minha).bodyJson().extractingPath("$.pagamentos[0].valorCentavos").isEqualTo(4450);
		assertThat(minha).bodyJson().extractingPath("$.proximaCobranca.valorCentavos").isEqualTo(4450);
		assertThat(minha).bodyJson().extractingPath("$.mesesComDesconto").isEqualTo(2);

		List<Integer> usos = JsonPath.read(
				mvc.get().uri("/api/admin/cupons").cookie(admin).exchange().getResponse().getContentAsString(),
				"$[?(@.codigo == '" + codigo + "')].usos");
		assertThat(usos).containsExactly(1);
		// Limite de 1 uso: o próximo aluno não consegue.
		var outro = aluno(novoEmail(), "Outro Aluno");
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas",
				"{\"planoId\":\"completo\",\"cupom\":\"" + codigo + "\"}", outro))
			.hasStatus(HttpStatus.BAD_REQUEST);
	}

	// --- Perfil, troca de e-mail e sessões --------------------------------------------

	@Test
	void perfilTrocaDeEmailESessoes() throws Exception {
		var email = novoEmail();
		var aluno = aluno(email, "Eva Perfil");
		var outroAparelho = sessao(enviar(HttpMethod.POST, "/api/auth/entrar",
				"{\"email\":\"" + email + "\",\"senha\":\"" + SENHA + "\"}", null));

		var editado = enviar(HttpMethod.PATCH, "/api/me",
				"{\"nome\":\"Eva Perfil Nova\",\"cidade\":\"Recife\",\"aceitouMarketing\":true}", aluno);
		assertThat(editado).hasStatusOk().bodyJson().extractingPath("$.nome").isEqualTo("Eva Perfil Nova");
		assertThat(editado).bodyJson().extractingPath("$.cidade").isEqualTo("Recife");
		assertThat(editado).bodyJson().extractingPath("$.aceitouMarketing").isEqualTo(true);

		var sessoes = mvc.get().uri("/api/me/sessoes").cookie(aluno).exchange();
		assertThat(sessoes).bodyJson().extractingPath("$.length()").isEqualTo(2);
		List<String> outras = JsonPath.read(sessoes.getResponse().getContentAsString(), "$[?(@.atual == false)].id");
		assertThat(outras).hasSize(1);
		assertThat(enviar(HttpMethod.DELETE, "/api/me/sessoes/" + outras.getFirst(), null, aluno))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/me").cookie(outroAparelho)).hasStatus(HttpStatus.UNAUTHORIZED);

		var novo = novoEmail();
		assertThat(enviar(HttpMethod.POST, "/api/me/email",
				"{\"novoEmail\":\"" + novo + "\",\"senha\":\"senha-errada-123\"}", aluno))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(enviar(HttpMethod.POST, "/api/me/email", "{\"novoEmail\":\"" + novo + "\",\"senha\":\"" + SENHA + "\"}",
				aluno))
			.hasStatus(HttpStatus.ACCEPTED);
		assertThat(mvc.get().uri("/api/me").cookie(aluno)).bodyJson().extractingPath("$.emailPendente").isEqualTo(novo);
		var token = token(novo, "/confirmar-email?token=");
		assertThat(enviar(HttpMethod.POST, "/api/auth/confirmar-email", "{\"token\":\"" + token + "\"}", null))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(emails.para(email)).anyMatch(e -> e.assunto().contains("foi alterado"));
		// Trocou o e-mail: todas as sessões caem; entra-se com o novo.
		assertThat(mvc.get().uri("/api/me").cookie(aluno)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(enviar(HttpMethod.POST, "/api/auth/entrar", "{\"email\":\"" + email + "\",\"senha\":\"" + SENHA + "\"}",
				null))
			.hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(enviar(HttpMethod.POST, "/api/auth/entrar", "{\"email\":\"" + novo + "\",\"senha\":\"" + SENHA + "\"}",
				null))
			.hasStatusOk();
	}

	// --- LGPD -------------------------------------------------------------------------

	@Test
	void exportarEExcluirAConta() throws Exception {
		var email = novoEmail();
		var aluno = alunoComPlano(email, "Fabi Dados", "essencial");
		var aulas = aulasDo(CURSO);
		concluir(aluno, aulas.subList(0, 2));
		enviar(HttpMethod.POST, "/api/aulas/" + aulas.get(1) + "/anotacoes",
				"{\"posicaoSegundos\":10,\"texto\":\"lembrar disso\"}", aluno);
		enviar(HttpMethod.POST, "/api/aulas/" + aulas.get(1) + "/perguntas",
				"{\"titulo\":\"Pergunta da Fabi\",\"texto\":\"Texto da pergunta.\"}", aluno);
		enviar(HttpMethod.PUT, "/api/cursos/" + CURSO + "/avaliacao", "{\"nota\":3,\"comentario\":\"ok\"}", aluno);
		int comAvaliacao = totalAvaliacoes();

		var dados = mvc.get().uri("/api/me/dados").cookie(aluno).exchange();
		assertThat(dados).hasStatusOk();
		assertThat(dados.getResponse().getHeader("Content-Disposition")).startsWith("attachment");
		assertThat(dados).bodyJson().extractingPath("$.conta.email").isEqualTo(email);
		assertThat(dados).bodyJson().extractingPath("$.assinaturas.assinaturas.length()").isEqualTo(1);
		assertThat(dados).bodyJson().extractingPath("$.aprendizado.anotacoes[0].texto").isEqualTo("lembrar disso");
		assertThat(dados).bodyJson().extractingPath("$.comunidade.perguntas[0].titulo").isEqualTo("Pergunta da Fabi");
		assertThat(dados).bodyJson().extractingPath("$.comunidade.avaliacoes[0].nota").isEqualTo(3);

		assertThat(enviar(HttpMethod.DELETE, "/api/me", "{\"email\":\"outro@exemplo.com\"}", aluno))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(enviar(HttpMethod.DELETE, "/api/me", "{\"email\":\"" + email.toUpperCase() + "\"}", aluno))
			.hasStatus(HttpStatus.NO_CONTENT);

		assertThat(mvc.get().uri("/api/me").cookie(aluno)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(enviar(HttpMethod.POST, "/api/auth/entrar", "{\"email\":\"" + email + "\",\"senha\":\"" + SENHA + "\"}",
				null))
			.hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(totalAvaliacoes()).isEqualTo(comAvaliacao - 1);
		// O e-mail fica livre para uma conta nova.
		assertThat(enviar(HttpMethod.POST, "/api/auth/cadastro", """
				{"nome":"Fabi de Novo","email":"%s","senha":"%s","aceitouTermos":true}
				""".formatted(email, SENHA), null))
			.hasStatus(HttpStatus.CREATED);
	}

	// --- Login com Google ---------------------------------------------------------------

	@Test
	void googleCriaContaVerificadaELigaContaExistentePeloEmail() throws Exception {
		assertThat(mvc.get().uri("/api/auth/provedores")).bodyJson().extractingPath("$.google").isEqualTo(true);

		var email = novoEmail();
		google.proximo = new ProvedorGoogle.PerfilGoogle("sub-" + UUID.randomUUID(), email, true, "Gabi Google");
		var entrou = loginGoogle("/cursos");
		assertThat(entrou.getResponse().getRedirectedUrl()).isEqualTo(webUrl + "/cursos");
		var sessao = sessao(entrou);
		var eu = mvc.get().uri("/api/me").cookie(sessao).exchange();
		assertThat(eu).bodyJson().extractingPath("$.email").isEqualTo(email);
		assertThat(eu).bodyJson().extractingPath("$.emailVerificado").isEqualTo(true);
		assertThat(eu).bodyJson().extractingPath("$.googleLigado").isEqualTo(true);

		// Conta com senha: o Google com o mesmo e-mail entra na mesma conta.
		var existente = novoEmail();
		var aluno = aluno(existente, "Hana Senha");
		String id = JsonPath.read(mvc.get().uri("/api/me").cookie(aluno).exchange().getResponse().getContentAsString(),
				"$.id");
		google.proximo = new ProvedorGoogle.PerfilGoogle("sub-" + UUID.randomUUID(), existente, true, "Hana");
		var ligada = sessao(loginGoogle("//site-malicioso.com"));
		assertThat(mvc.get().uri("/api/me").cookie(ligada)).bodyJson().extractingPath("$.id").isEqualTo(id);

		// E-mail não confirmado pelo Google: não entra.
		google.proximo = new ProvedorGoogle.PerfilGoogle("sub-" + UUID.randomUUID(), novoEmail(), false, "X");
		assertThat(loginGoogle("/").getResponse().getRedirectedUrl()).isEqualTo(webUrl + "/entrar?erro=google-bloqueado");
	}

	@Test
	void googleRecusaEstadoErrado() throws Exception {
		var inicio = mvc.get().uri("/api/auth/google").exchange();
		var cookie = sessao(inicio);
		var r = mvc.get().uri("/api/auth/google/retorno?code=abc&state=outro").cookie(cookie).exchange();
		assertThat(r.getResponse().getRedirectedUrl()).isEqualTo(webUrl + "/entrar?erro=google");
	}

	// -------------------------------------------------------------------------

	private MvcTestResult loginGoogle(String voltar) {
		var inicio = mvc.get().uri("/api/auth/google").param("voltar", voltar).exchange();
		assertThat(inicio.getResponse().getRedirectedUrl()).startsWith("https://google.teste/auth");
		var m = Pattern.compile("state=([A-Za-z0-9_-]+)").matcher(inicio.getResponse().getRedirectedUrl());
		assertThat(m.find()).isTrue();
		return mvc.get()
			.uri("/api/auth/google/retorno?code=codigo-de-teste&state=" + m.group(1))
			.cookie(sessao(inicio))
			.exchange();
	}

	private int totalAvaliacoes() throws Exception {
		Integer total = JsonPath.read(mvc.get().uri("/api/cursos/" + CURSO + "/avaliacoes").exchange()
			.getResponse()
			.getContentAsString(), "$.total");
		return total;
	}

	private void concluir(Cookie aluno, List<Integer> aulas) {
		for (var aula : aulas) {
			assertThat(enviar(HttpMethod.PUT, "/api/aulas/" + aula + "/conclusao", "{\"concluida\":true}", aluno))
				.hasStatusOk();
		}
	}

	private List<Integer> aulasDo(String slug) throws Exception {
		var json = mvc.get().uri("/api/cursos/" + slug).exchange().getResponse().getContentAsString();
		return JsonPath.read(json, "$.modulos[*].aulas[*].id");
	}

	private Cookie alunoComPlano(String email, String nome, String plano) {
		var aluno = aluno(email, nome);
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"" + plano + "\"}", aluno))
			.hasStatus(HttpStatus.CREATED);
		return aluno;
	}

	/** Aluno com e-mail confirmado. */
	private Cookie aluno(String email, String nome) {
		var cookie = sessao(enviar(HttpMethod.POST, "/api/auth/cadastro", """
				{"nome":"%s","email":"%s","senha":"%s","aceitouTermos":true}
				""".formatted(nome, email, SENHA), null));
		assertThat(enviar(HttpMethod.POST, "/api/auth/verificar-email",
				"{\"token\":\"" + token(email, "/verificar-email?token=") + "\"}", null))
			.hasStatus(HttpStatus.NO_CONTENT);
		return cookie;
	}

	private String token(String email, String link) {
		var texto = emails.para(email).reversed().stream().map(EnviadorEmail.Email::texto)
			.filter(t -> t.contains(link)).findFirst().orElseThrow();
		var m = Pattern.compile(Pattern.quote(link) + "([A-Za-z0-9_-]+)").matcher(texto);
		assertThat(m.find()).isTrue();
		return m.group(1);
	}

	private Cookie admin() {
		var r = enviar(HttpMethod.POST, "/api/auth/entrar",
				"{\"email\":\"" + adminEmail + "\",\"senha\":\"" + SENHA_ADMIN + "\"}", null);
		if (r.getResponse().getStatus() == 200) {
			return r.getResponse().getCookie("POTENCIA_SESSAO");
		}
		var admin = sessao(enviar(HttpMethod.POST, "/api/auth/entrar",
				"{\"email\":\"" + adminEmail + "\",\"senha\":\"" + adminSenhaInicial + "\"}", null));
		enviar(HttpMethod.POST, "/api/me/senha",
				"{\"senhaAtual\":\"" + adminSenhaInicial + "\",\"novaSenha\":\"" + SENHA_ADMIN + "\"}", admin);
		return admin;
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
		return "acabamento-" + UUID.randomUUID() + "@exemplo.com";
	}

	static class EmailsCapturados implements EnviadorEmail {

		private final List<Email> enviados = new CopyOnWriteArrayList<>();

		@Override
		public void enviar(Email email) {
			enviados.add(email);
		}

		List<Email> para(String destinatario) {
			return enviados.stream().filter(e -> e.para().equalsIgnoreCase(destinatario)).toList();
		}

	}

	/** Google de mentira: devolve o perfil que o teste deixou em {@code proximo}. */
	static class GoogleSimulado implements ProvedorGoogle {

		volatile PerfilGoogle proximo;

		@Override
		public boolean isAtivo() {
			return true;
		}

		@Override
		public String urlAutorizacao(String estado, String desafioPkce, String retorno) {
			return "https://google.teste/auth?state=" + estado + "&code_challenge=" + desafioPkce;
		}

		@Override
		public PerfilGoogle perfil(String codigo, String verificadorPkce, String retorno) {
			return proximo;
		}

	}

	@TestConfiguration
	static class Config {

		@Bean
		@Primary
		EmailsCapturados emailsCapturadosAcabamento() {
			return new EmailsCapturados();
		}

		@Bean
		@Primary
		GoogleSimulado googleSimulado() {
			return new GoogleSimulado();
		}

	}

}
