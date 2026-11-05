package br.com.potencia.comunidade;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.compartilhado.Pagina;
import br.com.potencia.comunidade.Comunidade.AvaliacaoAdmin;
import br.com.potencia.comunidade.Comunidade.Avaliacoes;
import br.com.potencia.comunidade.Comunidade.Depoimento;
import br.com.potencia.comunidade.Comunidade.MinhaAvaliacao;
import br.com.potencia.comunidade.Comunidade.PerguntaAdmin;
import br.com.potencia.comunidade.Comunidade.PerguntaItem;
import br.com.potencia.comunidade.Comunidade.RespostaItem;
import br.com.potencia.contas.UsuarioSessao;

/**
 * Perguntas por aula e avaliações. Públicas só a lista de avaliações do curso e
 * os depoimentos da home (ver SecurityConfig).
 */
@RestController
class ComunidadeController {

	record PerguntaPedido(
			@NotBlank(message = "Escreva um título curto para a pergunta.") @Size(max = 160,
					message = "Use até 160 caracteres no título.") String titulo,
			@NotBlank(message = "Conte a sua dúvida.") @Size(max = 4000,
					message = "Use até 4.000 caracteres.") String texto) {
	}

	record RespostaPedido(@NotBlank(message = "Escreva a resposta.") @Size(max = 4000,
			message = "Use até 4.000 caracteres.") String texto) {
	}

	record UtilPedido(boolean util) {
	}

	record AvaliacaoPedido(@Min(value = 1, message = "Escolha de 1 a 5 estrelas.") @Max(value = 5,
			message = "Escolha de 1 a 5 estrelas.") int nota,
			@Size(max = 2000, message = "Use até 2.000 caracteres.") String comentario) {
	}

	private final Comunidade comunidade;

	ComunidadeController(Comunidade comunidade) {
		this.comunidade = comunidade;
	}

	@GetMapping("/api/aulas/{id}/perguntas")
	List<PerguntaItem> perguntas(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return comunidade.perguntasDaAula(eu, id);
	}

	@PostMapping("/api/aulas/{id}/perguntas")
	@ResponseStatus(HttpStatus.CREATED)
	PerguntaItem perguntar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody PerguntaPedido pedido) {
		return comunidade.perguntar(eu, id, pedido.titulo(), pedido.texto());
	}

	@PostMapping("/api/perguntas/{id}/respostas")
	@ResponseStatus(HttpStatus.CREATED)
	RespostaItem responder(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@Valid @RequestBody RespostaPedido pedido) {
		return comunidade.responder(eu, id, pedido.texto());
	}

	@PutMapping("/api/perguntas/{id}/util")
	Map<String, Integer> util(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@RequestBody UtilPedido pedido) {
		return Map.of("uteis", comunidade.marcarUtil(eu, id, pedido.util()));
	}

	@DeleteMapping("/api/perguntas/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void apagar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id) {
		comunidade.apagarPergunta(eu, id);
	}

	@GetMapping("/api/cursos/{slug}/avaliacoes")
	Avaliacoes avaliacoes(@PathVariable String slug, @RequestParam(required = false) Integer nota,
			@RequestParam(required = false) Integer pagina) {
		return comunidade.avaliacoesDoCurso(slug, nota, pagina);
	}

	@GetMapping("/api/cursos/{slug}/minha-avaliacao")
	MinhaAvaliacao minha(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable String slug) {
		return comunidade.minhaAvaliacao(eu, slug);
	}

	@PutMapping("/api/cursos/{slug}/avaliacao")
	MinhaAvaliacao avaliar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable String slug,
			@Valid @RequestBody AvaliacaoPedido pedido) {
		return comunidade.avaliar(eu, slug, pedido.nota(), pedido.comentario());
	}

	@DeleteMapping("/api/cursos/{slug}/avaliacao")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void apagarAvaliacao(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable String slug) {
		comunidade.apagarAvaliacao(eu, slug);
	}

	@GetMapping("/api/depoimentos")
	List<Depoimento> depoimentos() {
		return comunidade.depoimentos();
	}

	// --- Painel --------------------------------------------------------------------

	record OcultarPedido(boolean oculta) {
	}

	@GetMapping("/api/admin/perguntas")
	Pagina<PerguntaAdmin> perguntasAdmin(@RequestParam(required = false) String filtro,
			@RequestParam(required = false) Integer pagina) {
		return comunidade.perguntasParaModerar(filtro, pagina);
	}

	@PostMapping("/api/admin/perguntas/{id}/respostas")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void responderComoEquipe(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@Valid @RequestBody RespostaPedido pedido) {
		comunidade.responderComoEquipe(eu.autor(), id, pedido.texto());
	}

	@PutMapping("/api/admin/perguntas/{id}/oculta")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void ocultarPergunta(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@RequestBody OcultarPedido pedido) {
		comunidade.ocultarPergunta(eu.autor(), id, pedido.oculta());
	}

	@PutMapping("/api/admin/respostas/{id}/oculta")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void ocultarResposta(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@RequestBody OcultarPedido pedido) {
		comunidade.ocultarResposta(eu.autor(), id, pedido.oculta());
	}

	@GetMapping("/api/admin/avaliacoes")
	Pagina<AvaliacaoAdmin> avaliacoesAdmin(@RequestParam(required = false) String status,
			@RequestParam(required = false) Integer nota, @RequestParam(required = false) Integer pagina) {
		return comunidade.avaliacoesParaModerar(status, nota, pagina);
	}

	@PutMapping("/api/admin/avaliacoes/{id}/oculta")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void moderar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id, @RequestBody OcultarPedido pedido) {
		comunidade.moderarAvaliacao(eu.autor(), id, pedido.oculta());
	}

	record RespostaAvaliacaoPedido(@Size(max = 2000, message = "Use até 2.000 caracteres.") String texto) {
	}

	@PutMapping("/api/admin/avaliacoes/{id}/resposta")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void responderAvaliacao(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@Valid @RequestBody RespostaAvaliacaoPedido pedido) {
		comunidade.responderAvaliacao(eu.autor(), id, pedido.texto());
	}

}
