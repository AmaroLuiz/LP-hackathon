package br.com.potencia.catalogo;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.assinaturas.AssinaturasService.PlanoDoCurso;
import br.com.potencia.catalogo.CatalogoAdminDtos.AulaPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.CategoriaAdmin;
import br.com.potencia.catalogo.CatalogoAdminDtos.CategoriaPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.Checklist;
import br.com.potencia.catalogo.CatalogoAdminDtos.CursoEdicao;
import br.com.potencia.catalogo.CatalogoAdminDtos.CursoPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.IdsPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.InstrutorAdmin;
import br.com.potencia.catalogo.CatalogoAdminDtos.InstrutorPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.MaterialPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.ModuloPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.NovoCursoPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.OrdemPedido;
import br.com.potencia.catalogo.CatalogoAdminDtos.PlanosPedido;
import br.com.potencia.catalogo.CatalogoDtos.CursoAdminLinha;
import br.com.potencia.catalogo.CatalogoDtos.CursoDetalhe;
import br.com.potencia.contas.UsuarioSessao;

/**
 * Painel admin: cursos, currículo, categorias e instrutores. Protegido por
 * papel ADMIN no SecurityConfig (/api/admin/**). As respostas do currículo
 * trazem o curso inteiro, para o editor só trocar o estado.
 */
@RestController
@RequestMapping("/api/admin")
class CatalogoAdminController {

	private final CatalogoService catalogo;

	private final CatalogoAdmin admin;

	CatalogoAdminController(CatalogoService catalogo, CatalogoAdmin admin) {
		this.catalogo = catalogo;
		this.admin = admin;
	}

	// --- Cursos ---------------------------------------------------------------

	@GetMapping("/cursos")
	List<CursoAdminLinha> listar() {
		return catalogo.listarParaAdmin();
	}

	@PostMapping("/cursos")
	@ResponseStatus(HttpStatus.CREATED)
	CursoEdicao criar(@AuthenticationPrincipal UsuarioSessao eu, @Valid @RequestBody NovoCursoPedido pedido) {
		return admin.criar(pedido, eu.autor());
	}

	@GetMapping("/cursos/{id}")
	CursoEdicao buscar(@PathVariable long id) {
		return admin.buscar(id);
	}

	@PutMapping("/cursos/{id}")
	CursoEdicao editar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody CursoPedido pedido) {
		return admin.editar(id, pedido, eu.autor());
	}

	@GetMapping("/cursos/{id}/checklist")
	Checklist checklist(@PathVariable long id) {
		return admin.checklist(id);
	}

	@PostMapping("/cursos/{id}/publicar")
	CursoEdicao publicar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.publicar(id, eu.autor());
	}

	@PostMapping("/cursos/{id}/despublicar")
	CursoEdicao despublicar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.despublicar(id, eu.autor());
	}

	@PostMapping("/cursos/{id}/arquivar")
	CursoEdicao arquivar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.arquivar(id, eu.autor());
	}

	@PostMapping("/cursos/{id}/duplicar")
	@ResponseStatus(HttpStatus.CREATED)
	CursoEdicao duplicar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.duplicar(id, eu.autor());
	}

	/** O curso como o aluno vai ver, em qualquer status. */
	@GetMapping("/cursos/{id}/previa")
	CursoDetalhe previa(@PathVariable long id) {
		return admin.previa(id);
	}

	@GetMapping("/cursos/{id}/planos")
	List<PlanoDoCurso> planos(@PathVariable long id) {
		return admin.planos(id);
	}

	@PutMapping("/cursos/{id}/planos")
	List<PlanoDoCurso> definirPlanos(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody PlanosPedido pedido) {
		return admin.definirPlanos(id, pedido.planos(), eu.autor());
	}

	// --- Currículo ------------------------------------------------------------

	@PostMapping("/cursos/{id}/modulos")
	@ResponseStatus(HttpStatus.CREATED)
	CursoEdicao criarModulo(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody ModuloPedido pedido) {
		return admin.criarModulo(id, pedido, eu.autor());
	}

	@PutMapping("/modulos/{id}")
	CursoEdicao editarModulo(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody ModuloPedido pedido) {
		return admin.editarModulo(id, pedido, eu.autor());
	}

	@DeleteMapping("/modulos/{id}")
	CursoEdicao excluirModulo(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.excluirModulo(id, eu.autor());
	}

	@PostMapping("/modulos/{id}/aulas")
	@ResponseStatus(HttpStatus.CREATED)
	CursoEdicao criarAula(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody AulaPedido pedido) {
		return admin.criarAula(id, pedido, eu.autor());
	}

	@PutMapping("/aulas/{id}")
	CursoEdicao editarAula(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody AulaPedido pedido) {
		return admin.editarAula(id, pedido, eu.autor());
	}

	@DeleteMapping("/aulas/{id}")
	CursoEdicao excluirAula(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.excluirAula(id, eu.autor());
	}

	@PostMapping("/aulas/{id}/materiais")
	@ResponseStatus(HttpStatus.CREATED)
	CursoEdicao adicionarMaterial(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody MaterialPedido pedido) {
		return admin.adicionarMaterial(id, pedido, eu.autor());
	}

	@DeleteMapping("/materiais/{id}")
	CursoEdicao excluirMaterial(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.excluirMaterial(id, eu.autor());
	}

	@PutMapping("/cursos/{id}/curriculo/ordem")
	CursoEdicao ordenar(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody OrdemPedido pedido) {
		return admin.ordenar(id, pedido, eu.autor());
	}

	// --- Categorias -----------------------------------------------------------

	@GetMapping("/categorias")
	List<CategoriaAdmin> categorias() {
		return admin.categorias();
	}

	@PostMapping("/categorias")
	@ResponseStatus(HttpStatus.CREATED)
	List<CategoriaAdmin> criarCategoria(@AuthenticationPrincipal UsuarioSessao eu,
			@Valid @RequestBody CategoriaPedido pedido) {
		return admin.criarCategoria(pedido, eu.autor());
	}

	@PutMapping("/categorias/ordem")
	List<CategoriaAdmin> ordenarCategorias(@AuthenticationPrincipal UsuarioSessao eu,
			@Valid @RequestBody IdsPedido pedido) {
		return admin.ordenarCategorias(pedido.ids(), eu.autor());
	}

	@PutMapping("/categorias/{id}")
	List<CategoriaAdmin> editarCategoria(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody CategoriaPedido pedido) {
		return admin.editarCategoria(id, pedido, eu.autor());
	}

	@DeleteMapping("/categorias/{id}")
	List<CategoriaAdmin> excluirCategoria(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.excluirCategoria(id, eu.autor());
	}

	// --- Instrutores ----------------------------------------------------------

	@GetMapping("/instrutores")
	List<InstrutorAdmin> instrutores() {
		return admin.instrutores();
	}

	@PostMapping("/instrutores")
	@ResponseStatus(HttpStatus.CREATED)
	List<InstrutorAdmin> criarInstrutor(@AuthenticationPrincipal UsuarioSessao eu,
			@Valid @RequestBody InstrutorPedido pedido) {
		return admin.criarInstrutor(pedido, eu.autor());
	}

	@PutMapping("/instrutores/{id}")
	List<InstrutorAdmin> editarInstrutor(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id,
			@Valid @RequestBody InstrutorPedido pedido) {
		return admin.editarInstrutor(id, pedido, eu.autor());
	}

	@DeleteMapping("/instrutores/{id}")
	List<InstrutorAdmin> excluirInstrutor(@AuthenticationPrincipal UsuarioSessao eu, @PathVariable long id) {
		return admin.excluirInstrutor(id, eu.autor());
	}

}
