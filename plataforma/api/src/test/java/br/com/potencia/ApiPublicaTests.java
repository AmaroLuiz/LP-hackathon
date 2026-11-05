package br.com.potencia;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest
@AutoConfigureMockMvc
class ApiPublicaTests {

	@Autowired
	MockMvcTester mvc;

	@Test
	void listaOsSeteCursosPublicadosEmOrdem() {
		var resposta = mvc.get().uri("/api/cursos");
		assertThat(resposta).hasStatusOk().bodyJson().extractingPath("$.length()").isEqualTo(7);
		assertThat(resposta).bodyJson().extractingPath("$[2].slug").isEqualTo("videos-em-motion");
		assertThat(resposta).bodyJson().extractingPath("$[2].capaUrl").isEqualTo("/capas/videos-em-motion.webp");
		assertThat(resposta).bodyJson().extractingPath("$[2].categoria.nome").isEqualTo("Vídeo");
		assertThat(resposta).bodyJson().extractingPath("$[0].instrutores[0]").isEqualTo("Equipe PotencIA");
	}

	@Test
	void detalhaUmCursoPeloSlug() {
		var resposta = mvc.get().uri("/api/cursos/voz-e-narracao");
		assertThat(resposta).hasStatusOk().bodyJson().extractingPath("$.card.titulo").isEqualTo("Voz e narração");
		assertThat(resposta).bodyJson().extractingPath("$.ferramentas").asArray().containsExactly("ElevenLabs");
		assertThat(resposta).bodyJson().extractingPath("$.modulos").asArray().isEmpty();
	}

	@Test
	void cardTrazDestaquePreviaEFerramentas() {
		var resposta = mvc.get().uri("/api/cursos");
		assertThat(resposta).bodyJson().extractingPath("$[0].destaque").isEqualTo(true);
		assertThat(resposta).bodyJson().extractingPath("$[0].temPrevia").isEqualTo(true);
		assertThat(resposta).bodyJson().extractingPath("$[0].totalAulas").isEqualTo(5);
		assertThat(resposta).bodyJson().extractingPath("$[0].ferramentas").asArray().containsExactly("Claude", "GitHub");
		assertThat(resposta).bodyJson().extractingPath("$[1].temPrevia").isEqualTo(false);
	}

	@Test
	void paginaDoCursoTrazTextosEModulosSemIdDeVideo() {
		var resposta = mvc.get().uri("/api/cursos/primeiros-passos");
		assertThat(resposta).bodyJson().extractingPath("$.oQueAprende.length()").isEqualTo(4);
		assertThat(resposta).bodyJson().extractingPath("$.modulos.length()").isEqualTo(2);
		assertThat(resposta).bodyJson().extractingPath("$.modulos[0].aulas[0].previa").isEqualTo(true);
		assertThat(resposta).bodyJson().doesNotHavePath("$.modulos[0].aulas[0].videoId");
	}

	@Test
	void cursoInexistenteResponde404() {
		assertThat(mvc.get().uri("/api/cursos/nao-existe")).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void errosPadraoDoSpringSaemEmPortugues() {
		assertThat(mvc.delete().uri("/api/cursos").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
			.hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(mvc.put().uri("/api/auth/entrar").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
			.hasStatus(HttpStatus.METHOD_NOT_ALLOWED)
			.bodyJson()
			.extractingPath("$.detail")
			.isEqualTo("Esta ação não é permitida aqui.");
	}

	@Test
	void listaAsCategorias() {
		assertThat(mvc.get().uri("/api/categorias")).hasStatusOk()
			.bodyJson()
			.extractingPath("$[0].slug")
			.isEqualTo("primeiros-passos");
	}

	@Test
	void listaOsPlanosComOsCursosLiberados() {
		var resposta = mvc.get().uri("/api/planos");
		assertThat(resposta).hasStatusOk().bodyJson().extractingPath("$[0].id").isEqualTo("essencial");
		assertThat(resposta).bodyJson().extractingPath("$[0].cursos.length()").isEqualTo(3);
		assertThat(resposta).bodyJson().extractingPath("$[1].cursos.length()").isEqualTo(7);
	}

	@Test
	void rotasPrivadasRespondem401SemLogin() {
		assertThat(mvc.get().uri("/api/me")).hasStatus(HttpStatus.UNAUTHORIZED)
			.bodyJson()
			.extractingPath("$.detail")
			.isEqualTo("Entre na sua conta para continuar.");
		assertThat(mvc.get().uri("/api/admin/cursos")).hasStatus(HttpStatus.UNAUTHORIZED);
	}

}
