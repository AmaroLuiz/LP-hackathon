package br.com.potencia.catalogo;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.catalogo.CatalogoDtos.CategoriaResposta;
import br.com.potencia.catalogo.CatalogoDtos.CursoCard;
import br.com.potencia.catalogo.CatalogoDtos.CursoDetalhe;

@RestController
class CatalogoController {

	private final CatalogoService catalogo;

	CatalogoController(CatalogoService catalogo) {
		this.catalogo = catalogo;
	}

	@GetMapping("/api/cursos")
	List<CursoCard> listar() {
		return catalogo.listarPublicados();
	}

	@GetMapping("/api/cursos/{slug}")
	ResponseEntity<CursoDetalhe> buscar(@PathVariable String slug) {
		return ResponseEntity.of(catalogo.buscarPublicado(slug));
	}

	@GetMapping("/api/categorias")
	List<CategoriaResposta> categorias() {
		return catalogo.listarCategorias();
	}

}
