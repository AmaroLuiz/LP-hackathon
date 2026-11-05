package br.com.potencia.contas;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.contas.ContasDtos.CadastroPedido;
import br.com.potencia.contas.ContasDtos.EmailPedido;
import br.com.potencia.contas.ContasDtos.EntrarPedido;
import br.com.potencia.contas.ContasDtos.RedefinirSenhaPedido;
import br.com.potencia.contas.ContasDtos.TokenPedido;
import br.com.potencia.contas.ContasDtos.UsuarioResposta;

/** Rotas públicas de conta. Todas as mutações exigem o token CSRF (cookie XSRF-TOKEN). */
@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final ContaService contas;

	private final Sessoes sessoes;

	AuthController(ContaService contas, Sessoes sessoes) {
		this.contas = contas;
		this.sessoes = sessoes;
	}

	/** Garante o cookie XSRF-TOKEN antes do primeiro formulário. */
	@GetMapping("/csrf")
	ResponseEntity<Void> csrf(CsrfToken token) {
		token.getToken();
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/cadastro")
	@ResponseStatus(HttpStatus.CREATED)
	UsuarioResposta cadastrar(@Valid @RequestBody CadastroPedido pedido, HttpServletRequest req,
			HttpServletResponse res) {
		var usuario = contas.cadastrar(pedido);
		sessoes.iniciar(usuario, false, req, res);
		return resposta(usuario);
	}

	@PostMapping("/entrar")
	UsuarioResposta entrar(@Valid @RequestBody EntrarPedido pedido, HttpServletRequest req, HttpServletResponse res) {
		var usuario = contas.autenticar(pedido.email(), pedido.senha(), req.getRemoteAddr());
		sessoes.iniciar(usuario, pedido.querLembrar(), req, res);
		return resposta(usuario);
	}

	@PostMapping("/sair")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void sair(HttpServletRequest req) {
		sessoes.encerrar(req);
	}

	@PostMapping("/verificar-email")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void verificarEmail(@Valid @RequestBody TokenPedido pedido) {
		contas.verificarEmail(pedido.token());
	}

	/** Link enviado ao e-mail novo (troca de e-mail no perfil). */
	@PostMapping("/confirmar-email")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void confirmarEmail(@Valid @RequestBody TokenPedido pedido) {
		contas.confirmarTrocaDeEmail(pedido.token());
	}

	@PostMapping("/esqueci-senha")
	@ResponseStatus(HttpStatus.ACCEPTED)
	void esqueciSenha(@Valid @RequestBody EmailPedido pedido) {
		contas.solicitarRedefinicao(pedido.email());
	}

	@PostMapping("/redefinir-senha")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void redefinirSenha(@Valid @RequestBody RedefinirSenhaPedido pedido) {
		var usuarioId = contas.redefinirSenha(pedido.token(), pedido.novaSenha());
		sessoes.encerrarTodas(usuarioId);
	}

	private UsuarioResposta resposta(UsuarioSessao usuario) {
		return contas.buscar(usuario.id()).orElseThrow(() -> ErroApi.naoEncontrado("Conta não encontrada."));
	}

}
