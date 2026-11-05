package br.com.potencia.assinaturas;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

import br.com.potencia.assinaturas.AssinaturasAdmin.FundadorAdmin;
import br.com.potencia.assinaturas.AssinaturasAdmin.FundadorPedido;
import br.com.potencia.assinaturas.AssinaturasAdmin.ListaImportada;
import br.com.potencia.assinaturas.AssinaturasAdmin.PlanoAdmin;
import br.com.potencia.assinaturas.AssinaturasAdmin.PlanoPedido;
import br.com.potencia.assinaturas.AssinaturasService.AssinaturaIniciada;
import br.com.potencia.assinaturas.AssinaturasService.CondicaoParaVoce;
import br.com.potencia.assinaturas.AssinaturasService.EventoResposta;
import br.com.potencia.assinaturas.AssinaturasService.MinhaAssinatura;
import br.com.potencia.assinaturas.Equipes.ConviteResposta;
import br.com.potencia.assinaturas.Equipes.EquipeResposta;
import br.com.potencia.assinaturas.Equipes.Participacao;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.contas.UsuarioSessao;

/** Assinatura de quem está logado, equipe do plano Negócio e o convite (público). */
@RestController
class AssinaturasController {

	private final AssinaturasService assinaturas;

	private final Equipes equipes;

	AssinaturasController(AssinaturasService assinaturas, Equipes equipes) {
		this.assinaturas = assinaturas;
		this.equipes = equipes;
	}

	record AssinarPedido(@NotBlank(message = "Escolha um plano.") String planoId,
			@Size(max = 40, message = "Cupom não encontrado. Confira as letras e os números.") String cupom) {
	}

	record CancelarPedido(@Size(max = 60) String motivo,
			@Size(max = 230, message = "Use até 230 caracteres.") String comentario) {
	}

	record ConvitePedido(@NotBlank(message = "Informe o e-mail.") @Email(message = "Informe um e-mail válido.")
			@Size(max = 254) String email) {
	}

	record AcessoPedido(@NotNull(message = "Informe o usuário.") UUID usuarioId, Long cursoId, String planoId,
			@NotBlank(message = "Informe o motivo.") @Size(max = 300, message = "Use até 300 caracteres.") String motivo,
			Instant expiraEm) {
	}

	/** 404 quando o aluno nunca assinou. */
	@GetMapping("/api/me/assinatura")
	ResponseEntity<MinhaAssinatura> minha(@AuthenticationPrincipal UsuarioSessao usuario) {
		return ResponseEntity.of(assinaturas.detalhe(usuario.id()));
	}

	@PostMapping("/api/assinaturas")
	@ResponseStatus(HttpStatus.CREATED)
	AssinaturaIniciada assinar(@AuthenticationPrincipal UsuarioSessao usuario, @Valid @RequestBody AssinarPedido pedido) {
		return assinaturas.assinar(usuario.id(), pedido.planoId(), pedido.cupom());
	}

	@PostMapping("/api/me/assinatura/trocar-plano")
	MinhaAssinatura trocarPlano(@AuthenticationPrincipal UsuarioSessao usuario,
			@Valid @RequestBody AssinarPedido pedido) {
		return assinaturas.trocarPlano(usuario.id(), pedido.planoId(), usuario.autor());
	}

	@PostMapping("/api/me/assinatura/cancelar")
	MinhaAssinatura cancelar(@AuthenticationPrincipal UsuarioSessao usuario, @Valid @RequestBody CancelarPedido pedido) {
		var partes = new StringBuilder();
		if (pedido.motivo() != null && !pedido.motivo().isBlank()) {
			partes.append(pedido.motivo().strip());
		}
		if (pedido.comentario() != null && !pedido.comentario().isBlank()) {
			partes.append(partes.isEmpty() ? "" : ": ").append(pedido.comentario().strip());
		}
		return assinaturas.cancelar(usuario.id(), partes.toString(), usuario.autor());
	}

	@PostMapping("/api/me/assinatura/reativar")
	MinhaAssinatura reativar(@AuthenticationPrincipal UsuarioSessao usuario) {
		return assinaturas.reativar(usuario.id(), usuario.autor());
	}

	/** Público: a condição de fundador em vigor (204 se não está valendo). */
	@GetMapping("/api/condicao-fundador")
	ResponseEntity<AssinaturasService.CondicaoPublica> condicaoPublica() {
		return assinaturas.condicaoFundador().map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
	}

	@GetMapping("/api/me/condicao-fundador")
	CondicaoParaVoce condicaoFundador(@AuthenticationPrincipal UsuarioSessao usuario) {
		return assinaturas.condicaoFundadorPara(usuario.id());
	}

	// --- Equipe ----------------------------------------------------------------

	/** 404 quando o plano não tem equipe. */
	@GetMapping("/api/me/equipe")
	ResponseEntity<EquipeResposta> equipe(@AuthenticationPrincipal UsuarioSessao usuario) {
		return ResponseEntity.of(equipes.equipe(usuario.id()));
	}

	@PostMapping("/api/me/equipe/convites")
	@ResponseStatus(HttpStatus.CREATED)
	EquipeResposta convidar(@AuthenticationPrincipal UsuarioSessao usuario, @Valid @RequestBody ConvitePedido pedido) {
		return equipes.convidar(usuario.id(), pedido.email(), usuario.autor());
	}

	@DeleteMapping("/api/me/equipe/membros/{id}")
	EquipeResposta remover(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable UUID id) {
		return equipes.remover(usuario.id(), id, usuario.autor());
	}

	/** Equipes de que a pessoa participa (como convidada). */
	@GetMapping("/api/me/participacoes")
	List<Participacao> participacoes(@AuthenticationPrincipal UsuarioSessao usuario) {
		return equipes.participacoes(usuario.id());
	}

	@DeleteMapping("/api/me/participacoes/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void sair(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable UUID id) {
		equipes.sair(usuario.id(), id);
	}

	/** Público: a página do convite mostra quem convidou antes de a pessoa entrar. */
	@GetMapping("/api/equipe/convites/{token}")
	ConviteResposta verConvite(@PathVariable String token) {
		return equipes.verConvite(token);
	}

	@PostMapping("/api/equipe/convites/{token}/aceitar")
	Participacao aceitar(@AuthenticationPrincipal UsuarioSessao usuario, @PathVariable String token) {
		return equipes.aceitar(usuario, token);
	}

	// --- Acesso manual (admin) -------------------------------------------------------

	@PostMapping("/api/admin/acessos")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void concederAcesso(@AuthenticationPrincipal UsuarioSessao admin, @Valid @RequestBody AcessoPedido pedido) {
		assinaturas.concederAcesso(pedido.usuarioId(), pedido.cursoId(), pedido.planoId(), pedido.motivo(),
				admin.autor(), pedido.expiraEm());
	}

}

/** Painel: planos, condição de fundador e eventos do gateway. Só admin (/api/admin/**). */
@RestController
class AssinaturasAdminController {

	private final AssinaturasAdmin admin;

	AssinaturasAdminController(AssinaturasAdmin admin) {
		this.admin = admin;
	}

	record ListaPedido(@Size(max = 2_000_000, message = "Lista grande demais.") String texto) {
	}

	@GetMapping("/api/admin/planos")
	List<PlanoAdmin> planos() {
		return admin.planos();
	}

	@PutMapping("/api/admin/planos/{id}")
	List<PlanoAdmin> editarPlano(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable String id,
			@RequestBody PlanoPedido pedido) {
		return admin.editarPlano(id, pedido, eu.autor());
	}

	@GetMapping("/api/admin/fundador")
	FundadorAdmin fundador() {
		return admin.fundador();
	}

	@PutMapping("/api/admin/fundador")
	FundadorAdmin editarFundador(@AuthenticationPrincipal UsuarioSessao eu, @RequestBody FundadorPedido pedido) {
		return admin.editarFundador(pedido, eu.autor());
	}

	@GetMapping("/api/admin/fundador/lista")
	List<String> lista() {
		return admin.listaDeEspera();
	}

	@PutMapping("/api/admin/fundador/lista")
	ListaImportada importar(@AuthenticationPrincipal UsuarioSessao eu, @Valid @RequestBody ListaPedido pedido) {
		return admin.importarLista(pedido.texto(), eu.autor());
	}

	/** Eventos que não foram processados (com o erro). */
	@GetMapping("/api/admin/eventos-gateway")
	List<EventoResposta> eventos() {
		return admin.eventosPendentes();
	}

	@PostMapping("/api/admin/eventos-gateway/{id}/reprocessar")
	EventoResposta reprocessar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable String id) {
		if (id.isBlank()) {
			throw ErroApi.naoEncontrado("Evento não encontrado.");
		}
		return admin.reprocessar(id, eu.autor());
	}

}

/** Cupom: conferência na página de planos e cadastro no painel. */
@RestController
class CuponsController {

	private final Cupons cupons;

	CuponsController(Cupons cupons) {
		this.cupons = cupons;
	}

	@GetMapping("/api/cupons/{codigo}")
	Cupons.CupomValido validar(@PathVariable String codigo, @RequestParam String plano) {
		return cupons.validar(codigo, plano);
	}

	@GetMapping("/api/admin/cupons")
	List<Cupons.CupomAdmin> listar() {
		return cupons.listar();
	}

	@PostMapping("/api/admin/cupons")
	@ResponseStatus(HttpStatus.CREATED)
	Cupons.CupomAdmin criar(@AuthenticationPrincipal UsuarioSessao eu, @RequestBody Cupons.CupomPedido pedido) {
		return cupons.criar(pedido, eu.autor());
	}

	@PutMapping("/api/admin/cupons/{id}")
	Cupons.CupomAdmin editar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable UUID id,
			@RequestBody Cupons.CupomPedido pedido) {
		return cupons.editar(id, pedido, eu.autor());
	}

}
