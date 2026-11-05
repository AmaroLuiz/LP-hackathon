package br.com.potencia.contas;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.contas.ContasDtos.EdicaoContaPedido;
import br.com.potencia.contas.ContasDtos.PerfilPedido;
import br.com.potencia.contas.ContasDtos.SessaoAtiva;
import br.com.potencia.contas.ContasDtos.TrocaEmailPedido;
import br.com.potencia.contas.ContasDtos.TrocarSenhaPedido;
import br.com.potencia.contas.ContasDtos.UsuarioResposta;

/** A conta de quem está logado. */
@RestController
@RequestMapping("/api/me")
class MeController {

	private final ContaService contas;

	private final Sessoes sessoes;

	MeController(ContaService contas, Sessoes sessoes) {
		this.contas = contas;
		this.sessoes = sessoes;
	}

	/** Sempre lê do banco: se a conta foi bloqueada ou excluída, a sessão cai na hora. */
	@GetMapping
	UsuarioResposta eu(@AuthenticationPrincipal UsuarioSessao usuario, HttpServletRequest req) {
		return contas.buscar(usuario.id()).orElseThrow(() -> {
			sessoes.encerrar(req);
			return ErroApi.naoAutenticado("Sua sessão terminou. Entre de novo.");
		});
	}

	/** Tela de perfil: nome, dados do negócio, cidade, telefone e e-mails de novidades. */
	@PatchMapping
	UsuarioResposta editar(@AuthenticationPrincipal UsuarioSessao usuario, @Valid @RequestBody EdicaoContaPedido pedido) {
		return contas.editarConta(usuario.id(), pedido);
	}

	@PostMapping("/email")
	@ResponseStatus(HttpStatus.ACCEPTED)
	void trocarEmail(@AuthenticationPrincipal UsuarioSessao usuario, @Valid @RequestBody TrocaEmailPedido pedido) {
		contas.pedirTrocaDeEmail(usuario.id(), pedido.novoEmail(), pedido.senha());
	}

	@GetMapping("/sessoes")
	List<SessaoAtiva> sessoes(@AuthenticationPrincipal UsuarioSessao usuario, HttpServletRequest req) {
		return sessoes.listar(usuario.id(), req);
	}

	@DeleteMapping("/sessoes/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void encerrarSessao(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable String id) {
		if (!sessoes.encerrarPorApelido(usuario.id(), id)) {
			throw ErroApi.naoEncontrado("Sessão não encontrada (talvez já tenha terminado).");
		}
	}

	@PatchMapping("/perfil")
	UsuarioResposta atualizarPerfil(@AuthenticationPrincipal UsuarioSessao usuario,
			@Valid @RequestBody PerfilPedido pedido) {
		return contas.atualizarPerfil(usuario.id(), pedido);
	}

	@PostMapping("/senha")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void trocarSenha(@AuthenticationPrincipal UsuarioSessao usuario, @Valid @RequestBody TrocarSenhaPedido pedido,
			HttpServletRequest req) {
		contas.trocarSenha(usuario.id(), pedido.senhaAtual(), pedido.novaSenha());
		sessoes.encerrarOutras(usuario.id(), req);
	}

	@PostMapping("/reenviar-verificacao")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void reenviarVerificacao(@AuthenticationPrincipal UsuarioSessao usuario) {
		contas.reenviarVerificacao(usuario.id());
	}

}
