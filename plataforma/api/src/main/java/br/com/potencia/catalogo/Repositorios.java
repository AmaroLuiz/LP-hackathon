package br.com.potencia.catalogo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ModuloRepository extends JpaRepository<Modulo, Long> {

}

interface MaterialRepository extends JpaRepository<Material, Long> {

}

interface InstrutorRepository extends JpaRepository<Instrutor, Long> {

	List<Instrutor> findAllByOrderByNome();

	/** Por instrutor: [instrutorId, cursos em que aparece]. */
	@Query("select i.id, count(c) from Curso c join c.instrutores i group by i.id")
	List<Object[]> cursosPorInstrutor();

}
