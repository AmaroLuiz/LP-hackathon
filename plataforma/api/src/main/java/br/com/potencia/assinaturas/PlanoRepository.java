package br.com.potencia.assinaturas;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface PlanoRepository extends JpaRepository<Plano, String> {

	@EntityGraph(attributePaths = { "itens", "cursos" })
	List<Plano> findAllByOrderByOrdem();

}
