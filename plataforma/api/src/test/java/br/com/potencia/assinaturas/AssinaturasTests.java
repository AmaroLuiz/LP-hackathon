package br.com.potencia.assinaturas;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.AfterEach;
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
 * Fase 5: checkout, webhook (idempotente e com token), atraso e carência,
 * cancelamento e reativação, troca de plano, equipe do plano Negócio,
 * condição de fundador, reprocessamento de evento e planos no painel.
 * Usa o gateway falso, com eventos no formato do Asaas.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(AssinaturasTests.Config.class)
@TestPropertySource(properties = {
		"spring.datasource.url=jdbc:h2:mem:assinaturas;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
		"potencia.revalidar.segredo=", "potencia.manutencao.agendada=false" })
class AssinaturasTests {

	static final String SENHA = "assinatura-de-teste-1";

	static final String SENHA_ADMIN = "admin-assinaturas-teste-9";

	@Autowired
	MockMvcTester mvc;

	@Autowired
	EmailsCapturados emails;

	@Autowired
	RelogioAjustavel relogio;

	@Autowired
	Manutencao manutencao;

	@Autowired
	AssinaturaRepository assinaturas;

	@Autowired
	FundadorEmailRepository listaDeEspera;

	@Value("${potencia.pagamentos.webhook-token}")
	String token;

	@Value("${potencia.admin.email}")
	String adminEmail;

	@Value("${potencia.admin.senha-inicial}")
	String adminSenhaInicial;

	@AfterEach
	void voltarRelogio() {
		relogio.voltar();
	}

	@Test
	void checkoutFalsoAtivaNaHoraERegistraOPagamento() throws Exception {
		var email = novoEmail();
		var aluno = aluno(email);
		var r = enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"completo\"}", aluno);
		assertThat(r).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.status").isEqualTo("ATIVA");
		assertThat(r).bodyJson().extractingPath("$.urlPagamento").isNull();

		var minha = mvc.get().uri("/api/me/assinatura").cookie(aluno).exchange();
		assertThat(minha).bodyJson().extractingPath("$.pagamentos.length()").isEqualTo(1);
		assertThat(minha).bodyJson().extractingPath("$.pagamentos[0].status").isEqualTo("CONFIRMADO");
		assertThat(minha).bodyJson().extractingPath("$.proximaCobranca.valorCentavos").isEqualTo(8900);
		assertThat(minha).bodyJson().extractingPath("$.fundador").isEqualTo(false);
		assertThat(emails.para(email)).anyMatch(e -> e.assunto().contains("assinatura PotencIA está ativa"));
		assertThat(podeAssistir(aluno, "videos-em-motion")).isTrue();
	}

	@Test
	void webhookExigeTokenEProcessaCadaEventoUmaVez() throws Exception {
		var aluno = aluno(novoEmail());
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno);
		var a = assinaturaDe(aluno);
		var fimAntes = a.getFimPeriodoAtual();
		var evento = pagamento("PAYMENT_CONFIRMED", a, "pay_" + UUID.randomUUID(), 4900,
				LocalDate.ofInstant(fimAntes, ZoneOffset.UTC));

		assertThat(webhook("falso", null, evento)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(webhook("falso", "token-errado", evento)).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(webhook("asaas", token, evento)).hasStatus(HttpStatus.NOT_FOUND);
		assertThat(webhook("falso", token, evento)).hasStatusOk();
		assertThat(webhook("falso", token, evento)).hasStatusOk();

		var minha = mvc.get().uri("/api/me/assinatura").cookie(aluno).exchange();
		// Primeira cobrança (checkout) + renovação; o evento repetido não conta de novo.
		assertThat(minha).bodyJson().extractingPath("$.pagamentos.length()").isEqualTo(2);
		assertThat(assinaturaDe(aluno).getFimPeriodoAtual()).isAfter(fimAntes);
		assertThat(assinaturaDe(aluno).getPagamentosConfirmados()).isEqualTo(2);
	}

	@Test
	void atrasoMantemOAcessoNaCarenciaEDepoisExpira() throws Exception {
		var email = novoEmail();
		var aluno = aluno(email);
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno);
		var a = assinaturaDe(aluno);
		var vencimento = LocalDate.ofInstant(a.getFimPeriodoAtual(), ZoneOffset.UTC);
		assertThat(webhook("falso", token, pagamento("PAYMENT_OVERDUE", a, "pay_" + UUID.randomUUID(), 4900, vencimento)))
			.hasStatusOk();
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.status")
			.isEqualTo("EM_ATRASO");
		assertThat(emails.para(email)).anyMatch(e -> e.assunto().contains("pagamento atrasado"));

		relogio.avancar(Duration.between(relogio.instant(), a.getFimPeriodoAtual()).plusDays(2));
		assertThat(podeAssistir(aluno, "primeiros-passos")).as("dentro da carência").isTrue();

		relogio.avancar(Duration.ofDays(4));
		manutencao.executar(relogio.instant());
		assertThat(podeAssistir(aluno, "primeiros-passos")).as("depois da carência").isFalse();
		assertThat(assinaturaDe(aluno).getStatus()).isEqualTo(StatusAssinatura.EXPIRADA);
	}

	@Test
	void pagamentoRecusadoAvisaComOLinkDaFatura() throws Exception {
		var email = novoEmail();
		var aluno = aluno(email);
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno);
		var a = assinaturaDe(aluno);
		assertThat(webhook("falso", token, pagamento("PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", a, "pay_" + UUID.randomUUID(),
				4900, LocalDate.now()))).hasStatusOk();
		assertThat(emails.para(email)).anyMatch(e -> e.texto().contains("https://sandbox.asaas.com/i/fatura-teste"));
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.pagamentos[?(@.status=='RECUSADO')]")
			.asArray()
			.hasSize(1);
	}

	@Test
	void cancelarMantemOAcessoAteOFimEDaParaReativar() throws Exception {
		var email = novoEmail();
		var aluno = aluno(email);
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno);

		var cancelada = enviar(HttpMethod.POST, "/api/me/assinatura/cancelar",
				"{\"motivo\":\"Preço\",\"comentario\":\"Volto no ano que vem\"}", aluno);
		assertThat(cancelada).hasStatusOk().bodyJson().extractingPath("$.status").isEqualTo("CANCELADA");
		assertThat(cancelada).bodyJson().extractingPath("$.podeReativar").isEqualTo(true);
		assertThat(cancelada).bodyJson().extractingPath("$.motivoCancelamento").isEqualTo("Preço: Volto no ano que vem");
		assertThat(cancelada).bodyJson().extractingPath("$.proximaCobranca").isNull();
		assertThat(podeAssistir(aluno, "primeiros-passos")).isTrue();
		assertThat(emails.para(email)).anyMatch(e -> e.assunto().contains("cancelada"));

		assertThat(enviar(HttpMethod.POST, "/api/me/assinatura/reativar", "{}", aluno)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.status")
			.isEqualTo("ATIVA");

		enviar(HttpMethod.POST, "/api/me/assinatura/cancelar", "{}", aluno);
		relogio.avancar(Duration.between(relogio.instant(), assinaturaDe(aluno).getFimPeriodoAtual()).plusHours(1));
		manutencao.executar(relogio.instant());
		assertThat(podeAssistir(aluno, "primeiros-passos")).isFalse();
		assertThat(enviar(HttpMethod.POST, "/api/me/assinatura/reativar", "{}", aluno)).hasStatus(HttpStatus.CONFLICT);
		// Depois de expirar, assina de novo normalmente.
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno))
			.hasStatus(HttpStatus.CREATED);
	}

	@Test
	void upgradeValeNaHoraEDowngradeNoProximoCiclo() throws Exception {
		var aluno = aluno(novoEmail());
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno);
		assertThat(podeAssistir(aluno, "videos-em-motion")).isFalse();

		assertThat(enviar(HttpMethod.POST, "/api/me/assinatura/trocar-plano", "{\"planoId\":\"completo\"}", aluno))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.plano.id")
			.isEqualTo("completo");
		assertThat(podeAssistir(aluno, "videos-em-motion")).isTrue();

		var agendado = enviar(HttpMethod.POST, "/api/me/assinatura/trocar-plano", "{\"planoId\":\"essencial\"}", aluno);
		assertThat(agendado).bodyJson().extractingPath("$.plano.id").isEqualTo("completo");
		assertThat(agendado).bodyJson().extractingPath("$.planoAgendado.id").isEqualTo("essencial");
		assertThat(agendado).bodyJson().extractingPath("$.proximaCobranca.valorCentavos").isEqualTo(4900);
		assertThat(podeAssistir(aluno, "videos-em-motion")).as("até o fim do ciclo").isTrue();

		relogio.avancar(Duration.between(relogio.instant(), assinaturaDe(aluno).getFimPeriodoAtual()).plusHours(1));
		manutencao.executar(relogio.instant());
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.plano.id")
			.isEqualTo("essencial");
		assertThat(podeAssistir(aluno, "videos-em-motion")).isFalse();
		assertThat(podeAssistir(aluno, "primeiros-passos")).as("renovou no gateway falso").isTrue();
	}

	@Test
	void equipeDoPlanoNegocioConvidaAceitaERemove() throws Exception {
		var titular = aluno(novoEmail());
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"negocio\"}", titular);
		assertThat(mvc.get().uri("/api/me/equipe").cookie(titular)).bodyJson().extractingPath("$.vagas").isEqualTo(2);

		var emailMembro = novoEmail();
		assertThat(enviar(HttpMethod.POST, "/api/me/equipe/convites", "{\"email\":\"" + emailMembro.toUpperCase() + "\"}",
				titular))
			.hasStatus(HttpStatus.CREATED)
			.bodyJson()
			.extractingPath("$.vagas")
			.isEqualTo(1);
		var convite = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(emails.para(emailMembro).getLast().texto());
		assertThat(convite.find()).isTrue();
		var tokenConvite = convite.group(1);
		assertThat(mvc.get().uri("/api/equipe/convites/" + tokenConvite)).hasStatusOk()
			.bodyJson()
			.extractingPath("$.valido")
			.isEqualTo(true);

		// Outra conta não aceita o convite de outra pessoa.
		var intrusa = aluno(novoEmail());
		assertThat(enviar(HttpMethod.POST, "/api/equipe/convites/" + tokenConvite + "/aceitar", "{}", intrusa))
			.hasStatus(HttpStatus.FORBIDDEN);

		var membro = aluno(emailMembro);
		assertThat(podeAssistir(membro, "videos-em-motion")).isFalse();
		// (aluno() já confirma o e-mail; o aceite também confirmaria, por ter vindo do link enviado a ele.)
		assertThat(enviar(HttpMethod.POST, "/api/equipe/convites/" + tokenConvite + "/aceitar", "{}", membro))
			.hasStatusOk();
		assertThat(podeAssistir(membro, "videos-em-motion")).isTrue();
		// Link de uso único.
		assertThat(enviar(HttpMethod.POST, "/api/equipe/convites/" + tokenConvite + "/aceitar", "{}", membro))
			.hasStatus(HttpStatus.NOT_FOUND);

		enviar(HttpMethod.POST, "/api/me/equipe/convites", "{\"email\":\"" + novoEmail() + "\"}", titular);
		assertThat(enviar(HttpMethod.POST, "/api/me/equipe/convites", "{\"email\":\"" + novoEmail() + "\"}", titular))
			.as("sem vagas")
			.hasStatus(HttpStatus.CONFLICT);

		List<String> ativos = JsonPath.read(mvc.get().uri("/api/me/equipe").cookie(titular).exchange().getResponse()
			.getContentAsString(), "$.membros[?(@.status=='ATIVO')].id");
		assertThat(enviar(HttpMethod.DELETE, "/api/me/equipe/membros/" + ativos.getFirst(), null, titular)).hasStatusOk();
		assertThat(podeAssistir(membro, "videos-em-motion")).isFalse();

		// Plano sem equipe não convida.
		var sozinho = aluno(novoEmail());
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"completo\"}", sozinho);
		assertThat(enviar(HttpMethod.POST, "/api/me/equipe/convites", "{\"email\":\"" + novoEmail() + "\"}", sozinho))
			.hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void fundadorPagaMetadeNosTresPrimeirosMeses() throws Exception {
		var email = novoEmail();
		listaDeEspera.save(new FundadorEmail(email, Instant.now()));
		var aluno = aluno(email);
		assertThat(mvc.get().uri("/api/me/condicao-fundador").cookie(aluno)).bodyJson()
			.extractingPath("$.elegivel")
			.isEqualTo(true);
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"completo\"}", aluno)).bodyJson()
			.extractingPath("$.fundador")
			.isEqualTo(true);
		var minha = mvc.get().uri("/api/me/assinatura").cookie(aluno).exchange();
		assertThat(minha).bodyJson().extractingPath("$.pagamentos[0].valorCentavos").isEqualTo(4450);
		assertThat(minha).bodyJson().extractingPath("$.proximaCobranca.valorCentavos").isEqualTo(4450);
		assertThat(minha).bodyJson().extractingPath("$.mesesComDesconto").isEqualTo(2);

		var a = assinaturaDe(aluno);
		for (int i = 0; i < 2; i++) {
			webhook("falso", token, pagamento("PAYMENT_CONFIRMED", a, "pay_" + UUID.randomUUID(), 4450,
					LocalDate.ofInstant(assinaturaDe(aluno).getFimPeriodoAtual(), ZoneOffset.UTC)));
		}
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.proximaCobranca.valorCentavos")
			.isEqualTo(8900);
		// A condição vale uma vez por pessoa.
		assertThat(mvc.get().uri("/api/me/condicao-fundador").cookie(aluno)).bodyJson()
			.extractingPath("$.elegivel")
			.isEqualTo(false);
	}

	@Test
	void eventoForaDeOrdemFicaPendenteEOAdminReprocessa() throws Exception {
		var admin = admin();
		var aluno = aluno(novoEmail());
		String usuarioId = JsonPath.read(mvc.get().uri("/api/me").cookie(aluno).exchange().getResponse()
			.getContentAsString(), "$.id");
		// Assinatura esperando o checkout do Asaas (criada à mão: o gateway do teste é o falso).
		var a = assinaturas.save(Assinatura.nova(UUID.fromString(usuarioId), planoRepo.findById("completo").orElseThrow(),
				"asaas", null, relogio.instant()));
		a.checkoutCriado("chk_teste_" + a.getId(), "https://sandbox.asaas.com/c/teste", relogio.instant());
		assinaturas.save(a);

		// A cobrança chega antes do aviso de checkout pago: ainda não dá para saber de quem é.
		var cliente = "cus_" + UUID.randomUUID();
		var assinaturaAsaas = "sub_" + UUID.randomUUID();
		var idEvento = "evt_" + UUID.randomUUID();
		var cobranca = """
				{"id":"%s","event":"PAYMENT_CONFIRMED","payment":{"id":"pay_%s","customer":"%s","subscription":"%s",
				"value":89.0,"billingType":"CREDIT_CARD","status":"CONFIRMED","dueDate":"%s","paymentDate":"%s",
				"invoiceUrl":"https://sandbox.asaas.com/i/x"}}
				""".formatted(idEvento, UUID.randomUUID(), cliente, assinaturaAsaas, LocalDate.now(), LocalDate.now());
		assertThat(webhook("falso", token, cobranca)).hasStatusOk();
		assertThat(mvc.get().uri("/api/admin/eventos-gateway").cookie(admin)).bodyJson()
			.extractingPath("$[?(@.id=='" + idEvento + "')].erro")
			.asArray()
			.hasSize(1);

		var checkoutPago = """
				{"id":"evt_%s","event":"CHECKOUT_PAID","checkout":{"id":"chk_teste_%s","customer":"%s","status":"PAID"}}
				""".formatted(UUID.randomUUID(), a.getId(), cliente);
		assertThat(webhook("falso", token, checkoutPago)).hasStatusOk();
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.status")
			.isEqualTo("ATIVA");

		assertThat(enviar(HttpMethod.POST, "/api/admin/eventos-gateway/" + idEvento + "/reprocessar", "{}", admin))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.processadoEm")
			.isNotNull();
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.pagamentos[0].valorCentavos")
			.isEqualTo(8900);
		assertThat(assinaturas.findById(a.getId()).orElseThrow().getGatewayId()).isEqualTo(assinaturaAsaas);
	}

	@Test
	void precoNovoReajustaQuemNaoTemTravaEPlanoForaDeVendaSomeDoSite() throws Exception {
		var admin = admin();
		var aluno = aluno(novoEmail());
		enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno);
		var planos = mvc.get().uri("/api/admin/planos").cookie(admin).exchange().getResponse().getContentAsString();
		List<Integer> cursos = JsonPath.read(planos, "$[?(@.id=='essencial')].cursos[*]");

		var corpo = """
				{"nome":"Essencial","precoCentavos":5900,"maxPessoas":1,"itens":["3 cursos"],"ativo":false,"cursos":%s}
				""".formatted(cursos);
		assertThat(enviar(HttpMethod.PUT, "/api/admin/planos/essencial", corpo, admin)).hasStatusOk();
		assertThat(mvc.get().uri("/api/me/assinatura").cookie(aluno)).bodyJson()
			.extractingPath("$.proximaCobranca.valorCentavos")
			.isEqualTo(5900);
		assertThat(mvc.get().uri("/api/planos")).bodyJson().extractingPath("$[*].id").asArray().doesNotContain("essencial");
		assertThat(enviar(HttpMethod.POST, "/api/assinaturas", "{\"planoId\":\"essencial\"}", aluno(novoEmail())))
			.hasStatus(HttpStatus.NOT_FOUND);
		// Volta ao normal para os outros testes.
		enviar(HttpMethod.PUT, "/api/admin/planos/essencial",
				corpo.replace("5900", "4900").replace("\"ativo\":false", "\"ativo\":true"), admin);
	}

	@Test
	void leitorEntendeOsEventosDoAsaasEImagemDoCheckoutEhPngValido() throws Exception {
		var e = LeitorAsaas.ler("""
				{"id":"evt_1","event":"PAYMENT_RECEIVED","payment":{"id":"pay_1","customer":"cus_1",
				"subscription":"sub_1","value":44.5,"billingType":"PIX","dueDate":"2026-11-10",
				"paymentDate":"2026-11-09","invoiceUrl":"https://www.asaas.com/i/1","externalReference":null}}
				""", "evt_1");
		assertThat(e.categoria()).isEqualTo(LeitorAsaas.Categoria.PAGAMENTO_CONFIRMADO);
		assertThat(e.assinaturaGateway()).isEqualTo("sub_1");
		assertThat(e.pagamento().valorCentavos()).isEqualTo(4450);
		assertThat(e.pagamento().vencimento()).isEqualTo(LocalDate.of(2026, 11, 10));
		assertThat(e.pagamento().metodo()).isEqualTo("PIX");
		assertThat(e.referencia()).isNull();
		assertThat(LeitorAsaas.categoria("CHECKOUT_EXPIRED")).isEqualTo(LeitorAsaas.Categoria.CHECKOUT_ENCERRADO);
		assertThat(LeitorAsaas.categoria("PAYMENT_DELETED")).isEqualTo(LeitorAsaas.Categoria.IGNORADO);

		var png = ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(GatewayAsaas.expoente())));
		assertThat(png.getWidth()).isEqualTo(96);
	}

	// -------------------------------------------------------------------------

	@Autowired
	PlanoRepository planoRepo;

	private String pagamento(String tipo, Assinatura a, String pagamentoId, int centavos, LocalDate vencimento) {
		return """
				{"id":"evt_%s","event":"%s","payment":{"id":"%s","customer":"%s","subscription":"%s",
				"value":%s,"billingType":"CREDIT_CARD","dueDate":"%s","paymentDate":"%s",
				"invoiceUrl":"https://sandbox.asaas.com/i/fatura-teste"}}
				""".formatted(UUID.randomUUID(), tipo, pagamentoId, a.getGatewayCliente(), a.getGatewayId(),
				centavos / 100.0, vencimento, vencimento);
	}

	private MvcTestResult webhook(String gateway, String tokenEnviado, String corpo) {
		var pedido = mvc.post().uri("/api/webhooks/" + gateway).contentType(MediaType.APPLICATION_JSON).content(corpo);
		if (tokenEnviado != null) {
			pedido = pedido.header("asaas-access-token", tokenEnviado);
		}
		return pedido.exchange();
	}

	private Assinatura assinaturaDe(Cookie aluno) throws Exception {
		String id = JsonPath.read(mvc.get().uri("/api/me/assinatura").cookie(aluno).exchange().getResponse()
			.getContentAsString(), "$.id");
		return assinaturas.findById(UUID.fromString(id)).orElseThrow();
	}

	private boolean podeAssistir(Cookie aluno, String slug) throws Exception {
		Boolean pode = JsonPath.read(mvc.get().uri("/api/cursos/" + slug + "/acesso").cookie(aluno).exchange()
			.getResponse()
			.getContentAsString(), "$.podeAssistir");
		return Boolean.TRUE.equals(pode);
	}

	/** Aluno com e-mail confirmado. */
	private Cookie aluno(String email) {
		var cookie = sessao(enviar(HttpMethod.POST, "/api/auth/cadastro", """
				{"nome":"Aluna Assinante","email":"%s","senha":"%s","aceitouTermos":true}
				""".formatted(email, SENHA), null));
		var texto = emails.para(email).reversed().stream().map(EnviadorEmail.Email::texto)
			.filter(t -> t.contains("/verificar-email?token=")).findFirst().orElseThrow();
		var m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(texto);
		assertThat(m.find()).isTrue();
		assertThat(enviar(HttpMethod.POST, "/api/auth/verificar-email", "{\"token\":\"" + m.group(1) + "\"}", null))
			.hasStatus(HttpStatus.NO_CONTENT);
		return cookie;
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
		return "assinante-" + UUID.randomUUID() + "@exemplo.com";
	}

	/** Relógio que o teste adianta (carência, fim do período, renovação). */
	static class RelogioAjustavel extends Clock {

		private volatile Duration adiantado = Duration.ZERO;

		void avancar(Duration d) {
			adiantado = adiantado.plus(d);
		}

		void voltar() {
			adiantado = Duration.ZERO;
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return Instant.now().plus(adiantado);
		}

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

	@TestConfiguration
	static class Config {

		@Bean
		@Primary
		EmailsCapturados emailsCapturadosAssinaturas() {
			return new EmailsCapturados();
		}

		@Bean
		@Primary
		RelogioAjustavel relogioAjustavel() {
			return new RelogioAjustavel();
		}

	}

}
