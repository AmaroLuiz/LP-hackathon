package br.com.potencia.aprendizado;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.aprendizado.AprendizadoDtos.AcessoCurso;
import br.com.potencia.aprendizado.AprendizadoDtos.AnotacaoPedido;
import br.com.potencia.aprendizado.AprendizadoDtos.AnotacaoResposta;
import br.com.potencia.aprendizado.AprendizadoDtos.AulaPlayer;
import br.com.potencia.aprendizado.AprendizadoDtos.CertificadoResposta;
import br.com.potencia.aprendizado.AprendizadoDtos.Conclusao;
import br.com.potencia.aprendizado.AprendizadoDtos.ConclusaoPedido;
import br.com.potencia.aprendizado.AprendizadoDtos.EdicaoAnotacaoPedido;
import br.com.potencia.aprendizado.AprendizadoDtos.MeuCurso;
import br.com.potencia.aprendizado.AprendizadoDtos.PainelCurso;
import br.com.potencia.aprendizado.AprendizadoDtos.PosicaoPedido;
import br.com.potencia.aprendizado.AprendizadoDtos.Previa;
import br.com.potencia.aprendizado.AprendizadoDtos.Resumo;
import br.com.potencia.catalogo.CatalogoDtos.CursoCard;
import br.com.potencia.contas.UsuarioSessao;

/**
 * Rotas do aprendizado. Públicas só a prévia e a validação de certificado
 * (ver SecurityConfig); as demais exigem login e checam o acesso.
 */
@RestController
class AprendizadoController {

	private final AprendizadoService aprendizado;

	AprendizadoController(AprendizadoService aprendizado) {
		this.aprendizado = aprendizado;
	}

	@GetMapping("/api/cursos/{slug}/acesso")
	AcessoCurso acesso(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable String slug) {
		return aprendizado.acessoAoCurso(usuario, slug);
	}

	@GetMapping("/api/aprender/{slug}")
	PainelCurso painel(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable String slug) {
		return aprendizado.painel(usuario, slug);
	}

	@GetMapping("/api/aulas/{id}")
	AulaPlayer aula(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable long id) {
		return aprendizado.abrirAula(usuario, id);
	}

	@GetMapping("/api/aulas/{id}/previa")
	ResponseEntity<Previa> previa(@PathVariable long id) {
		return ResponseEntity.of(aprendizado.previa(id));
	}

	@PutMapping("/api/aulas/{id}/posicao")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void posicao(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable long id,
			@Valid @RequestBody PosicaoPedido pedido) {
		aprendizado.salvarPosicao(usuario, id, pedido.posicaoSegundos());
	}

	@PutMapping("/api/aulas/{id}/conclusao")
	Conclusao conclusao(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable long id,
			@Valid @RequestBody ConclusaoPedido pedido) {
		return aprendizado.definirConclusao(usuario, id, pedido.concluida());
	}

	@GetMapping("/api/aulas/{id}/anotacoes")
	List<AnotacaoResposta> anotacoes(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable long id) {
		return aprendizado.anotacoes(usuario, id);
	}

	@PostMapping("/api/aulas/{id}/anotacoes")
	@ResponseStatus(HttpStatus.CREATED)
	AnotacaoResposta anotar(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable long id,
			@Valid @RequestBody AnotacaoPedido pedido) {
		return aprendizado.anotar(usuario, id, pedido.posicaoSegundos(), pedido.texto());
	}

	@PutMapping("/api/anotacoes/{id}")
	AnotacaoResposta editar(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable UUID id,
			@Valid @RequestBody EdicaoAnotacaoPedido pedido) {
		return aprendizado.editarAnotacao(usuario, id, pedido.texto());
	}

	@DeleteMapping("/api/anotacoes/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void excluir(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable UUID id) {
		aprendizado.excluirAnotacao(usuario, id);
	}

	@GetMapping("/api/me/cursos")
	List<MeuCurso> meusCursos(@AuthenticationPrincipal UsuarioSessao usuario) {
		return aprendizado.meusCursos(usuario);
	}

	@GetMapping("/api/me/resumo")
	Resumo resumo(@AuthenticationPrincipal UsuarioSessao usuario) {
		return aprendizado.resumo(usuario);
	}

	@GetMapping("/api/me/lista-desejos")
	List<CursoCard> listaDeDesejos(@AuthenticationPrincipal UsuarioSessao usuario) {
		return aprendizado.listaDeDesejos(usuario);
	}

	@PutMapping("/api/me/lista-desejos/{slug}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void desejar(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable String slug) {
		aprendizado.desejar(usuario, slug, true);
	}

	@DeleteMapping("/api/me/lista-desejos/{slug}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void tirarDosDesejos(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable String slug) {
		aprendizado.desejar(usuario, slug, false);
	}

	@GetMapping("/api/me/certificados")
	List<CertificadoResposta> meusCertificados(@AuthenticationPrincipal UsuarioSessao usuario) {
		return aprendizado.meusCertificados(usuario);
	}

	@GetMapping("/api/certificados/{codigo}")
	ResponseEntity<CertificadoResposta> certificado(@PathVariable String codigo) {
		return ResponseEntity.of(aprendizado.certificado(codigo));
	}

}
