package br.com.potencia.privacidade;

import java.time.LocalDate;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.contas.UsuarioSessao;

@RestController
class PrivacidadeController {

	record ExclusaoPedido(@NotBlank(message = "Digite o e-mail da sua conta para confirmar.") String email) {
	}

	private final Privacidade privacidade;

	PrivacidadeController(Privacidade privacidade) {
		this.privacidade = privacidade;
	}

	/** "Baixar meus dados": um JSON com tudo, baixado como arquivo. */
	@GetMapping("/api/me/dados")
	ResponseEntity<Map<String, Object>> dados(@AuthenticationPrincipal UsuarioSessao eu) {
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_DISPOSITION,
					"attachment; filename=\"meus-dados-potencia-" + LocalDate.now() + ".json\"")
			.header(HttpHeaders.CACHE_CONTROL, "no-store")
			.body(privacidade.exportar(eu.id()));
	}

	@DeleteMapping("/api/me")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void excluir(@AuthenticationPrincipal UsuarioSessao eu, @Valid @RequestBody ExclusaoPedido pedido,
			HttpServletRequest req) {
		privacidade.excluirConta(eu.id(), pedido.email());
		SecurityContextHolder.clearContext();
		var sessao = req.getSession(false);
		if (sessao != null) {
			sessao.invalidate();
		}
	}

}
