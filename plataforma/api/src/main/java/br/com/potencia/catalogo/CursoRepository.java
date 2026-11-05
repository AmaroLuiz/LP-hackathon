package br.com.potencia.catalogo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface CursoRepository extends JpaRepository<Curso, Long> {

	List<Curso> findAllByStatusOrderByNumero(StatusCurso status);

	List<Curso> findAllByOrderByNumero();

	Optional<Curso> findBySlug(String slug);

	boolean existsBySlug(String slug);

	boolean existsByNumero(int numero);

	@Query("select coalesce(max(c.numero), -1) from Curso c")
	int maiorNumero();

	/** Por curso: [cursoId, totalAulas, segundos, aulasDePrevia] (só aulas publicadas). */
	@Query("""
			select m.curso.id, count(a), coalesce(sum(a.duracaoSegundos), 0),
			       sum(case when a.previa = true then 1 else 0 end)
			from Aula a join a.modulo m
			where a.publicada = true
			group by m.curso.id
			""")
	List<Object[]> totaisPorCurso();

}
