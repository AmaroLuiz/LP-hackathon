package br.com.potencia.administracao;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.administracao.PainelAdmin.FichaUsuario;
import br.com.potencia.administracao.PainelAdmin.Metricas;
import br.com.potencia.administracao.PainelAdmin.UsuarioItem;
import br.com.potencia.assinaturas.AssinaturasService;
import br.com.potencia.compartilhado.Pagina;
import br.com.potencia.contas.ContasAdmin;
import br.com.potencia.contas.ContasAdmin.Filtro;
import br.com.potencia.contas.Papel;
import br.com.potencia.contas.UsuarioSessao;

/** Visão geral e usuários do painel. Protegido por papel ADMIN no SecurityConfig (/api/admin/**). */
@RestController
@RequestMapping("/api/admin")
class PainelController {

	private final PainelAdmin painel;

	private final ContasAdmin contas;

	private final AssinaturasService assinaturas;

	PainelController(PainelAdmin painel, ContasAdmin contas, AssinaturasService assinaturas) {
		this.painel = painel;
		this.contas = contas;
		this.assinaturas = assinaturas;
	}

	record PapelPedido(@NotNull(message = "Escolha o papel.") Papel papel) {
	}

	record BloqueioPedido(@NotNull Boolean bloquear,
			@Size(max = 200, message = "Use até 200 caracteres.") String motivo) {
	}

	record AcessoPedido(Long cursoId, String planoId,
			@NotBlank(message = "Informe o motivo.") @Size(max = 300, message = "Use até 300 caracteres.") String motivo,
			Instant expiraEm) {
	}

	@GetMapping("/metricas")
	Metricas metricas() {
		return painel.metricas();
	}

	@GetMapping("/usuarios")
	Pagina<UsuarioItem> usuarios(@RequestParam(required = false) String q, @RequestParam(required = false) Papel papel,
			@RequestParam(required = false) Boolean verificado, @RequestParam(required = false) Boolean bloqueado,
			@RequestParam(required = false) String plano, @RequestParam(required = false) Integer pagina,
			@RequestParam(required = false) Integer tamanho) {
		return painel.usuarios(new Filtro(q, papel, verificado, bloqueado, null), plano, pagina, tamanho);
	}

	/** Mesmos filtros da lista, em CSV (abre no Excel com acentos certos). */
	@GetMapping("/usuarios.csv")
	ResponseEntity<byte[]> exportar(@RequestParam(required = false) String q,
			@RequestParam(required = false) Papel papel, @RequestParam(required = false) Boolean verificado,
			@RequestParam(required = false) Boolean bloqueado, @RequestParam(required = false) String plano) {
		var linhas = painel.todosOsUsuarios(new Filtro(q, papel, verificado, bloqueado, null), plano);
		// BOM: o Excel reconhece o UTF-8 e mostra os acentos certos.
		var csv = new StringBuilder("\uFEFF");
		csv.append("nome;email;papel;email_confirmado;bloqueado;plano;criado_em;ultimo_acesso\r\n");
		var iso = DateTimeFormatter.ISO_INSTANT;
		for (var u : linhas) {
			csv.append(celula(u.nome()))
				.append(';')
				.append(celula(u.email()))
				.append(';')
				.append(u.papel())
				.append(';')
				.append(u.emailVerificado() ? "sim" : "não")
				.append(';')
				.append(u.bloqueado() ? "sim" : "não")
				.append(';')
				.append(celula(u.plano()))
				.append(';')
				.append(u.criadoEm() == null ? "" : iso.format(u.criadoEm()))
				.append(';')
				.append(u.ultimoAcessoEm() == null ? "" : iso.format(u.ultimoAcessoEm()))
				.append("\r\n");
		}
		return ResponseEntity.ok()
			.contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
			.header(HttpHeaders.CONTENT_DISPOSITION,
					ContentDisposition.attachment().filename("usuarios-potencia.csv").build().toString())
			.body(csv.toString().getBytes(StandardCharsets.UTF_8));
	}

	@GetMapping("/usuarios/{id}")
	FichaUsuario ficha(@PathVariable UUID id) {
		return painel.ficha(id);
	}

	@PostMapping("/usuarios/{id}/papel")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void papel(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@Valid @RequestBody PapelPedido pedido) {
		contas.alterarPapel(id, pedido.papel(), eu.autor());
	}

	@PostMapping("/usuarios/{id}/bloqueio")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void bloqueio(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@Valid @RequestBody BloqueioPedido pedido) {
		contas.bloquear(id, pedido.bloquear(), pedido.motivo(), eu.autor());
	}

	@PostMapping("/usuarios/{id}/reenviar-verificacao")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void reenviarVerificacao(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id) {
		contas.reenviarVerificacao(id, eu.autor());
	}

	@PostMapping("/usuarios/{id}/redefinir-senha")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void redefinirSenha(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id) {
		contas.forcarRedefinicao(id, eu.autor());
	}

	@DeleteMapping("/usuarios/{id}/sessoes")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void encerrarSessoes(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id) {
		contas.encerrarSessoes(id, eu.autor());
	}

	@PostMapping("/usuarios/{id}/acessos")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void concederAcesso(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@Valid @RequestBody AcessoPedido pedido) {
		painel.conferirAcesso(id, pedido.cursoId());
		assinaturas.concederAcesso(id, pedido.cursoId(), blankParaNulo(pedido.planoId()), pedido.motivo(), eu.autor(),
				pedido.expiraEm());
	}

	@DeleteMapping("/usuarios/{id}/acessos/{acessoId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void revogarAcesso(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@PathVariable UUID acessoId) {
		assinaturas.revogarAcesso(id, acessoId, eu.autor());
	}

	/** Texto entre aspas; fórmula no começo vira texto (evita injeção de fórmula na planilha). */
	private static String celula(String valor) {
		if (valor == null) {
			return "";
		}
		var v = valor;
		if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) {
			v = "'" + v;
		}
		return "\"" + v.replace("\"", "\"\"") + "\"";
	}

	private static String blankParaNulo(String s) {
		return s == null || s.isBlank() ? null : s.strip();
	}

}
