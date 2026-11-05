package br.com.potencia.catalogo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface CategoriaRepository extends JpaRepository<Categoria, Long> {

	List<Categoria> findAllByOrderByOrdem();

	boolean existsBySlug(String slug);

	@Query("select coalesce(max(c.ordem), 0) from Categoria c")
	int maiorOrdem();

	/** Por categoria: [categoriaId, cursos nela]. */
	@Query("select c.categoria.id, count(c) from Curso c group by c.categoria.id")
	List<Object[]> cursosPorCategoria();

}
