package br.com.potencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import com.jayway.jsonpath.JsonPath;

import br.com.potencia.compartilhado.SiteDesatualizado;

/**
 * Painel admin (fase 4): permissões, editor de curso com checklist de
 * publicação, currículo, envio de arquivos, usuários e auditoria.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContasTests.Config.class)
@RecordApplicationEvents
@TestPropertySource(properties = {
		"spring.datasource.url=jdbc:h2:mem:painel;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"potencia.armazenamento.pasta=target/arquivos-de-teste", "potencia.revalidar.segredo=" })
class PainelAdminTests {

	static final String SENHA = "painel-de-teste-seguro-1";

	static final String SENHA_ADMIN = "admin-painel-teste-9";

	@Autowired
	MockMvcTester mvc;

	@Autowired
	ContasTests.EmailsCapturados emails;

	@Autowired
	ApplicationEvents eventos;

	@Value("${potencia.admin.email}")
	String adminEmail;

	@Value("${potencia.admin.senha-inicial}")
	String adminSenhaInicial;

	Cookie admin;

	@BeforeEach
	void entrarComoAdmin() {
		admin = entrar(adminEmail, SENHA_ADMIN);
		if (admin == null) {
			// Primeira vez neste banco: troca a senha provisória.
			admin = entrar(adminEmail, adminSenhaInicial);
			assertThat(enviar(HttpMethod.POST, "/api/me/senha",
					"{\"senhaAtual\":\"" + adminSenhaInicial + "\",\"novaSenha\":\"" + SENHA_ADMIN + "\"}", admin))
				.hasStatus(HttpStatus.NO_CONTENT);
		}
	}

	@Test
	void soAdminEntraNoPainel() {
		assertThat(mvc.get().uri("/api/admin/cursos")).hasStatus(HttpStatus.UNAUTHORIZED);
		var aluno = novoAluno();
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(aluno)).hasStatus(HttpStatus.FORBIDDEN);
		assertThat(enviar(HttpMethod.POST, "/api/admin/cursos", "{\"titulo\":\"Invasão\"}", aluno))
			.hasStatus(HttpStatus.FORBIDDEN);
		assertThat(mvc.get().uri("/api/admin/usuarios").cookie(aluno)).hasStatus(HttpStatus.FORBIDDEN);
		assertThat(mvc.get().uri("/api/admin/metricas").cookie(aluno)).hasStatus(HttpStatus.FORBIDDEN);
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(admin)).hasStatusOk();
	}

	@Test
	void cursoNovoSoPublicaDepoisDoChecklist() throws Exception {
		var criado = enviar(HttpMethod.POST, "/api/admin/cursos", "{\"titulo\":\"Fotos de produto no celular\"}", admin);
		assertThat(criado).hasStatus(HttpStatus.CREATED);
		var json = criado.getResponse().getContentAsString();
		int id = JsonPath.read(json, "$.id");
		assertThat((String) JsonPath.read(json, "$.slug")).isEqualTo("fotos-de-produto-no-celular");
		assertThat((String) JsonPath.read(json, "$.status")).isEqualTo("RASCUNHO");

		// Rascunho não aparece no site.
		assertThat(mvc.get().uri("/api/cursos/fotos-de-produto-no-celular")).hasStatus(HttpStatus.NOT_FOUND);

		assertThat(enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/publicar", null, admin))
			.hasStatus(HttpStatus.CONFLICT)
			.bodyJson()
			.extractingPath("$.detail")
			.asString()
			.contains("Capa enviada");

		var capa = enviarArquivo("CAPA", "capa.webp", webp(1280, 720));
		assertThat(capa).hasStatus(HttpStatus.CREATED);
		String capaUrl = JsonPath.read(capa.getResponse().getContentAsString(), "$.url");
		assertThat(capaUrl).startsWith("/api/arquivos/publico/capas/").endsWith(".webp");
		assertThat(mvc.get().uri(capaUrl)).hasStatusOk().hasContentType("image/webp");

		String instrutor = String.valueOf((Integer) JsonPath
			.read(mvc.get().uri("/api/admin/instrutores").cookie(admin).exchange().getResponse().getContentAsString(), "$[0].id"));
		String categoria = String.valueOf((Integer) JsonPath
			.read(mvc.get().uri("/api/admin/categorias").cookie(admin).exchange().getResponse().getContentAsString(), "$[0].id"));
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/" + id, """
				{"titulo":"Fotos de produto no celular","subtitulo":"Luz de janela, fundo limpo e enquadramento.",
				 "slug":"fotos-de-produto","numero":40,"categoriaId":%s,"nivel":"INICIANTE","idioma":"pt-BR",
				 "descricao":"Fotos que vendem, tiradas no celular.","capaUrl":"%s","capaAlt":"Bolo sobre mesa clara",
				 "ferramentas":["Claude"],"oQueAprende":["Luz","Fundo","Ângulo","Edição"],"requisitos":[],
				 "paraQuemE":["Quem vende pelo Instagram"],"resultadoFinal":"Dez fotos do seu produto.",
				 "instrutores":[%s]}
				""".formatted(categoria, capaUrl, instrutor), admin)).hasStatusOk();

		var comModulo = enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/modulos", "{\"titulo\":\"Luz\"}", admin);
		int moduloId = JsonPath.read(comModulo.getResponse().getContentAsString(), "$.modulos[0].id");
		var comAula = enviar(HttpMethod.POST, "/api/admin/modulos/" + moduloId + "/aulas",
				"{\"titulo\":\"A luz da janela\",\"tipo\":\"VIDEO\",\"duracaoSegundos\":300,\"previa\":true}", admin);
		assertThat(comAula).hasStatus(HttpStatus.CREATED);

		// Falta só o plano.
		var lista = mvc.get().uri("/api/admin/cursos/" + id + "/checklist").cookie(admin).exchange();
		assertThat(lista).bodyJson().extractingPath("$.podePublicar").isEqualTo(false);
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/" + id + "/planos", "{\"planos\":[\"completo\"]}", admin))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$[?(@.id=='completo')].incluido")
			.asArray()
			.containsExactly(true);

		var publicado = enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/publicar", null, admin);
		assertThat(publicado).hasStatusOk().bodyJson().extractingPath("$.status").isEqualTo("PUBLICADO");
		assertThat(eventos.stream(SiteDesatualizado.class)).anyMatch(e -> e.tags().contains("curso:fotos-de-produto"));
		assertThat(mvc.get().uri("/api/cursos/fotos-de-produto")).hasStatusOk()
			.bodyJson()
			.extractingPath("$.card.numero")
			.isEqualTo(40);
		assertThat(mvc.get().uri("/api/planos")).bodyJson()
			.extractingPath("$[?(@.id=='completo')].cursos[*]")
			.asArray()
			.contains(id);

		// Auditoria registrou a criação e a publicação.
		assertThat(mvc.get().uri("/api/admin/auditoria?alvoTipo=curso&alvoId=" + id).cookie(admin)).bodyJson()
			.extractingPath("$.itens[*].acao")
			.asArray()
			.contains("curso.criado", "curso.publicado", "curso.editado");

		assertThat(enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/arquivar", null, admin)).hasStatusOk();
		assertThat(mvc.get().uri("/api/cursos/fotos-de-produto")).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void slugENumeroRepetidosSaoRecusados() throws Exception {
		var json = enviar(HttpMethod.POST, "/api/admin/cursos", "{\"titulo\":\"Outro curso\"}", admin).getResponse()
			.getContentAsString();
		int id = JsonPath.read(json, "$.id");
		int categoria = JsonPath.read(json, "$.categoriaId");
		var base = """
				{"titulo":"Outro curso","slug":"%s","numero":%d,"categoriaId":%d,"nivel":"INICIANTE","idioma":"pt-BR"}
				""";
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/" + id, base.formatted("primeiros-passos", 77, categoria), admin))
			.hasStatus(HttpStatus.CONFLICT)
			.bodyJson()
			.extractingPath("$.campos.slug")
			.isNotNull();
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/" + id, base.formatted("outro-curso", 0, categoria), admin))
			.hasStatus(HttpStatus.CONFLICT)
			.bodyJson()
			.extractingPath("$.campos.numero")
			.isNotNull();
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/" + id, base.formatted("Com Espaço", 78, categoria), admin))
			.hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/999999", base.formatted("x", 79, categoria), admin))
			.hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void curriculoPodeSerReordenadoEntreModulos() throws Exception {
		var json = enviar(HttpMethod.POST, "/api/admin/cursos", "{\"titulo\":\"Curso para ordenar\"}", admin).getResponse()
			.getContentAsString();
		int id = JsonPath.read(json, "$.id");
		enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/modulos", "{\"titulo\":\"Um\"}", admin);
		json = enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/modulos", "{\"titulo\":\"Dois\"}", admin).getResponse()
			.getContentAsString();
		List<Integer> modulos = JsonPath.read(json, "$.modulos[*].id");
		for (var titulo : List.of("A", "B", "C")) {
			json = enviar(HttpMethod.POST, "/api/admin/modulos/" + modulos.get(0) + "/aulas",
					"{\"titulo\":\"" + titulo + "\",\"tipo\":\"TEXTO\"}", admin).getResponse().getContentAsString();
		}
		List<Integer> aulas = JsonPath.read(json, "$.modulos[0].aulas[*].id");

		// Dois vem primeiro; a aula C passa para o módulo Dois.
		var ordem = """
				{"modulos":[{"id":%d,"aulas":[%d]},{"id":%d,"aulas":[%d,%d]}]}
				""".formatted(modulos.get(1), aulas.get(2), modulos.get(0), aulas.get(1), aulas.get(0));
		var resposta = enviar(HttpMethod.PUT, "/api/admin/cursos/" + id + "/curriculo/ordem", ordem, admin);
		assertThat(resposta).hasStatusOk();
		assertThat(resposta).bodyJson().extractingPath("$.modulos[0].titulo").isEqualTo("Dois");
		assertThat(resposta).bodyJson().extractingPath("$.modulos[0].aulas[0].titulo").isEqualTo("C");
		assertThat(resposta).bodyJson().extractingPath("$.modulos[1].aulas[*].titulo").asArray().containsExactly("B", "A");
		// Relido do banco, a ordem se mantém.
		assertThat(mvc.get().uri("/api/admin/cursos/" + id).cookie(admin)).bodyJson()
			.extractingPath("$.modulos[1].aulas[*].titulo")
			.asArray()
			.containsExactly("B", "A");

		// Pedido sem todas as aulas (outra aba desatualizada) é recusado.
		assertThat(enviar(HttpMethod.PUT, "/api/admin/cursos/" + id + "/curriculo/ordem",
				"{\"modulos\":[{\"id\":%d,\"aulas\":[]},{\"id\":%d,\"aulas\":[]}]}".formatted(modulos.get(0), modulos.get(1)),
				admin))
			.hasStatus(HttpStatus.CONFLICT);
		// Módulo com aulas não é excluído.
		assertThat(enviar(HttpMethod.DELETE, "/api/admin/modulos/" + modulos.get(0), null, admin))
			.hasStatus(HttpStatus.CONFLICT);

		var copia = enviar(HttpMethod.POST, "/api/admin/cursos/" + id + "/duplicar", null, admin);
		assertThat(copia).hasStatus(HttpStatus.CREATED);
		assertThat(copia).bodyJson().extractingPath("$.slug").isEqualTo("curso-para-ordenar-copia");
		assertThat(copia).bodyJson().extractingPath("$.modulos[1].aulas.length()").isEqualTo(2);
	}

	@Test
	void envioConfereOTipoRealEAProporcao() throws Exception {
		// SVG com nome de imagem: recusado pelo conteúdo, não pela extensão.
		var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8);
		assertThat(enviarArquivo("CAPA", "capa.webp", svg)).hasStatus(HttpStatus.BAD_REQUEST)
			.bodyJson()
			.extractingPath("$.detail")
			.asString()
			.contains("Formato não aceito");
		assertThat(enviarArquivo("CAPA", "quadrada.webp", webp(800, 800))).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(enviarArquivo("FOTO", "foto.webp", webp(400, 400))).hasStatus(HttpStatus.CREATED);

		// Token adulterado não vale.
		var preparo = enviar(HttpMethod.POST, "/api/admin/uploads",
				"{\"tipo\":\"MATERIAL\",\"nome\":\"guia.pdf\",\"tamanho\":20}", admin);
		String url = JsonPath.read(preparo.getResponse().getContentAsString(), "$.url");
		assertThat(mvc.put().uri(url + "x").with(csrf()).cookie(admin).contentType(MediaType.APPLICATION_OCTET_STREAM)
			.content("%PDF-1.4 teste".getBytes(StandardCharsets.US_ASCII))).hasStatus(HttpStatus.BAD_REQUEST);
		// Aluno não envia.
		assertThat(enviar(HttpMethod.POST, "/api/admin/uploads",
				"{\"tipo\":\"MATERIAL\",\"nome\":\"guia.pdf\",\"tamanho\":20}", novoAluno())).hasStatus(HttpStatus.FORBIDDEN);
	}

	@Test
	void materialSoSaiComLinkAssinadoParaQuemTemAcesso() throws Exception {
		var aulas = aulasDo("primeiros-passos");
		var aula = aulas.get(1);
		var enviado = enviarArquivo("MATERIAL", "Roteiro.pdf", "%PDF-1.4 roteiro de teste".getBytes(StandardCharsets.US_ASCII));
		assertThat(enviado).hasStatus(HttpStatus.CREATED);
		String chave = JsonPath.read(enviado.getResponse().getContentAsString(), "$.chave");
		assertThat(chave).startsWith("privado/materiais/").endsWith(".pdf");
		// Sem assinatura, o arquivo privado não existe.
		assertThat(mvc.get().uri("/api/arquivos/" + chave)).hasStatus(HttpStatus.NOT_FOUND);

		assertThat(enviar(HttpMethod.POST, "/api/admin/aulas/" + aula + "/materiais",
				"{\"nome\":\"Roteiro da aula\",\"chave\":\"%s\",\"tamanhoBytes\":25}".formatted(chave), admin))
			.hasStatus(HttpStatus.CREATED);
		assertThat(enviar(HttpMethod.POST, "/api/admin/aulas/" + aula + "/materiais",
				"{\"nome\":\"Fora\",\"chave\":\"../../etc/passwd\"}", admin)).hasStatus(HttpStatus.BAD_REQUEST);

		var aluno = alunoComPlano("essencial");
		var player = mvc.get().uri("/api/aulas/" + aula).cookie(aluno).exchange();
		assertThat(player).hasStatusOk();
		String link = JsonPath.read(player.getResponse().getContentAsString(), "$.materiais[0].url");
		assertThat(link).contains("assinatura=").contains("nome=Roteiro");
		var baixado = mvc.get().uri(URI.create(link)).exchange();
		assertThat(baixado).hasStatusOk();
		assertThat(baixado.getResponse().getHeader("Content-Disposition")).contains("attachment");
		assertThat(mvc.get().uri(URI.create(link.replace("assinatura=", "assinatura=x")))).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void aulaComProgressoNaoPodeSerExcluida() throws Exception {
		var aula = aulasDo("primeiros-passos").get(2);
		var aluno = alunoComPlano("essencial");
		assertThat(enviar(HttpMethod.PUT, "/api/aulas/" + aula + "/posicao", "{\"posicaoSegundos\":30}", aluno))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(enviar(HttpMethod.DELETE, "/api/admin/aulas/" + aula, null, admin)).hasStatus(HttpStatus.CONFLICT)
			.bodyJson()
			.extractingPath("$.detail")
			.asString()
			.contains("Despublique");
		assertThat(mvc.get().uri("/api/aulas/" + aula).cookie(aluno)).hasStatusOk();
	}

	@Test
	void papelEBloqueioValemNaHoraEOUltimoAdminEhProtegido() throws Exception {
		String adminId = JsonPath.read(mvc.get().uri("/api/me").cookie(admin).exchange().getResponse().getContentAsString(),
				"$.id");
		// O admin não muda o próprio papel nem se bloqueia.
		assertThat(enviar(HttpMethod.POST, "/api/admin/usuarios/" + adminId + "/papel", "{\"papel\":\"USUARIO\"}", admin))
			.hasStatus(HttpStatus.FORBIDDEN);
		assertThat(enviar(HttpMethod.POST, "/api/admin/usuarios/" + adminId + "/bloqueio", "{\"bloquear\":true}", admin))
			.hasStatus(HttpStatus.FORBIDDEN);

		var email = novoEmail();
		var aluno = cadastrar(email);
		String alunoId = id(aluno);
		assertThat(enviar(HttpMethod.POST, "/api/admin/usuarios/" + alunoId + "/papel", "{\"papel\":\"ADMIN\"}", admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		// A sessão antiga (de aluno) cai; ao entrar de novo, já é admin.
		assertThat(mvc.get().uri("/api/me").cookie(aluno)).hasStatus(HttpStatus.UNAUTHORIZED);
		var novoAdmin = entrar(email, SENHA);
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(novoAdmin)).hasStatusOk();
		// Com dois admins, um pode rebaixar o outro.
		assertThat(enviar(HttpMethod.POST, "/api/admin/usuarios/" + alunoId + "/papel", "{\"papel\":\"USUARIO\"}", admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/admin/cursos").cookie(entrar(email, SENHA))).hasStatus(HttpStatus.FORBIDDEN);

		// Bloqueio derruba a sessão e impede o login.
		var outra = novoEmail();
		var sessao = cadastrar(outra);
		String outraId = id(sessao);
		assertThat(enviar(HttpMethod.POST, "/api/admin/usuarios/" + outraId + "/bloqueio",
				"{\"bloquear\":true,\"motivo\":\"Teste\"}", admin)).hasStatus(HttpStatus.NO_CONTENT);
		assertThat(mvc.get().uri("/api/me").cookie(sessao)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(enviar(HttpMethod.POST, "/api/auth/entrar",
				"{\"email\":\"" + outra + "\",\"senha\":\"" + SENHA + "\"}", null)).hasStatus(HttpStatus.FORBIDDEN);

		var ficha = mvc.get().uri("/api/admin/usuarios/" + outraId).cookie(admin).exchange();
		assertThat(ficha).hasStatusOk().bodyJson().extractingPath("$.conta.bloqueadoEm").isNotNull();
		assertThat(ficha).bodyJson().extractingPath("$.historico[*].acao").asArray().contains("usuario.bloqueado");
	}

	@Test
	void redefinicaoForcadaInvalidaASenhaEMandaOLink() throws Exception {
		var email = novoEmail();
		var aluno = cadastrar(email);
		String alunoId = id(aluno);
		int antes = emails.para(email).size();
		assertThat(enviar(HttpMethod.POST, "/api/admin/usuarios/" + alunoId + "/redefinir-senha", null, admin))
			.hasStatus(HttpStatus.NO_CONTENT);
		assertThat(emails.para(email)).hasSize(antes + 1);
		assertThat(emails.para(email).getLast().texto()).contains("/redefinir-senha?token=");
		assertThat(mvc.get().uri("/api/me").cookie(aluno)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(entrar(email, SENHA)).isNull();
	}

	@Test
	void listaDeUsuariosFiltraEExporta() throws Exception {
		var email = novoEmail();
		alunoComPlano("negocio", email);
		var lista = mvc.get().uri("/api/admin/usuarios?plano=negocio&q=" + email.substring(0, 20)).cookie(admin).exchange();
		assertThat(lista).hasStatusOk().bodyJson().extractingPath("$.itens[0].email").isEqualTo(email);
		assertThat(lista).bodyJson().extractingPath("$.itens[0].plano").isEqualTo("Negócio");
		assertThat(mvc.get().uri("/api/admin/usuarios?plano=essencial&q=" + email).cookie(admin)).bodyJson()
			.extractingPath("$.total")
			.isEqualTo(0);

		var csv = mvc.get().uri("/api/admin/usuarios.csv?q=" + email).cookie(admin).exchange();
		assertThat(csv).hasStatusOk();
		var texto = new String(csv.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
		assertThat(texto).startsWith("\uFEFFnome;email").contains(email);

		assertThat(mvc.get().uri("/api/admin/metricas").cookie(admin)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.cadastrosPorDia.length()")
			.isEqualTo(30);
	}

	@Test
	void categoriaEmUsoNaoPodeSerExcluida() throws Exception {
		var categorias = mvc.get().uri("/api/admin/categorias").cookie(admin).exchange().getResponse().getContentAsString();
		int emUso = JsonPath.read(categorias, "$[0].id");
		assertThat(enviar(HttpMethod.DELETE, "/api/admin/categorias/" + emUso, null, admin)).hasStatus(HttpStatus.CONFLICT);

		var criada = enviar(HttpMethod.POST, "/api/admin/categorias",
				"{\"nome\":\"Atendimento\",\"slug\":\"atendimento\"}", admin);
		assertThat(criada).hasStatus(HttpStatus.CREATED);
		assertThat(enviar(HttpMethod.POST, "/api/admin/categorias", "{\"nome\":\"De novo\",\"slug\":\"atendimento\"}", admin))
			.hasStatus(HttpStatus.CONFLICT);
		List<Integer> ids = JsonPath.read(criada.getResponse().getContentAsString(), "$[?(@.slug=='atendimento')].id");
		assertThat(enviar(HttpMethod.DELETE, "/api/admin/categorias/" + ids.getFirst(), null, admin)).hasStatusOk();
		assertThat(mvc.get().uri("/api/categorias")).bodyJson()
			.extractingPath("$[*].slug")
			.asArray()
			.doesNotContain("atendimento");
	}

	// -------------------------------------------------------------------------

	/** Cabeçalho mínimo de um WebP estendido (VP8X) com a largura e a altura pedidas. */
	static byte[] webp(int largura, int altura) {
		byte[] b = new byte[40];
		System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, b, 0, 4);
		b[4] = 32;
		System.arraycopy("WEBPVP8X".getBytes(StandardCharsets.US_ASCII), 0, b, 8, 8);
		b[16] = 10;
		int l = largura - 1;
		int a = altura - 1;
		b[24] = (byte) l;
		b[25] = (byte) (l >> 8);
		b[26] = (byte) (l >> 16);
		b[27] = (byte) a;
		b[28] = (byte) (a >> 8);
		b[29] = (byte) (a >> 16);
		return b;
	}

	private MvcTestResult enviarArquivo(String tipo, String nome, byte[] conteudo) throws Exception {
		var preparo = enviar(HttpMethod.POST, "/api/admin/uploads",
				"{\"tipo\":\"%s\",\"nome\":\"%s\",\"tamanho\":%d}".formatted(tipo, nome, conteudo.length), admin);
		assertThat(preparo).hasStatusOk();
		String url = JsonPath.read(preparo.getResponse().getContentAsString(), "$.url");
		return mvc.put()
			.uri(url)
			.with(csrf())
			.cookie(admin)
			.contentType(MediaType.APPLICATION_OCTET_STREAM)
			.content(conteudo)
			.exchange();
	}

	private List<Integer> aulasDo(String slug) throws Exception {
		var json = mvc.get().uri("/api/cursos/" + slug).exchange().getResponse().getContentAsString();
		return JsonPath.read(json, "$.modulos[*].aulas[*].id");
	}

	private String id(Cookie sessao) throws Exception {
		return JsonPath.read(mvc.get().uri("/api/me").cookie(sessao).exchange().getResponse().getContentAsString(), "$.id");
	}

	private Cookie alunoComPlano(String plano) {
		return alunoComPlano(plano, novoEmail());
	}

	private Cookie alunoComPlano(String plano, String email) {
		var aluno = cadastrar(email);
		confirmarEmail(email);
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"" + plano + "\"}", aluno))
			.hasStatus(HttpStatus.CREATED);
		return aluno;
	}

	private Cookie novoAluno() {
		return cadastrar(novoEmail());
	}

	private Cookie cadastrar(String email) {
		return sessao(enviar(HttpMethod.POST, "/api/auth/cadastro", """
				{"nome":"Aluna do Painel","email":"%s","senha":"%s","aceitouTermos":true}
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

	/** Sessão de quem entrou, ou nulo se o login falhou. */
	private Cookie entrar(String email, String senha) {
		var resposta = enviar(HttpMethod.POST, "/api/auth/entrar",
				"{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}", null);
		return resposta.getResponse().getStatus() == 200 ? resposta.getResponse().getCookie("POTENCIA_SESSAO") : null;
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
		return "painel-" + UUID.randomUUID() + "@exemplo.com";
	}

}
