package br.com.potencia.aprendizado;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface MatriculaRepository extends JpaRepository<Matricula, UUID> {

	Optional<Matricula> findByUsuarioIdAndCursoId(UUID usuarioId, long cursoId);

	List<Matricula> findByUsuarioIdOrderByAtualizadaEmDesc(UUID usuarioId);

	/** Por curso: [cursoId, matrículas, concluídas]. */
	@Query("""
			select m.cursoId, count(m), sum(case when m.concluidaEm is not null then 1 else 0 end)
			from Matricula m group by m.cursoId
			""")
	List<Object[]> conclusaoPorCurso();

	/** Por aula: [aulaId, alunos parados nela], quem não volta ao curso desde {@code antes}. */
	@Query("""
			select m.ultimaAulaId, count(m) from Matricula m
			where m.concluidaEm is null and m.ultimaAulaId is not null and m.atualizadaEm < :antes
			group by m.ultimaAulaId order by count(m) desc
			""")
	List<Object[]> paradasPorAula(Instant antes, Pageable limite);

}

interface ProgressoAulaRepository extends JpaRepository<ProgressoAula, ProgressoAula.Chave> {

	List<ProgressoAula> findByUsuarioIdAndAulaIdIn(UUID usuarioId, Collection<Long> aulaIds);

	List<ProgressoAula> findByUsuarioId(UUID usuarioId);

	@Query("select count(distinct p.usuarioId) from ProgressoAula p where p.atualizadoEm >= :desde")
	long alunosAtivosDesde(Instant desde);

}

interface AnotacaoRepository extends JpaRepository<Anotacao, UUID> {

	List<Anotacao> findByUsuarioIdAndAulaIdOrderByPosicaoSegundosAscCriadoEmAsc(UUID usuarioId, long aulaId);

	List<Anotacao> findByUsuarioIdOrderByCriadoEm(UUID usuarioId);

}

interface ListaDesejosRepository extends JpaRepository<ItemListaDesejos, ItemListaDesejos.Chave> {

	List<ItemListaDesejos> findByUsuarioIdOrderByCriadoEmDesc(UUID usuarioId);

}

interface CertificadoRepository extends JpaRepository<Certificado, UUID> {

	Optional<Certificado> findByCodigo(String codigo);

	Optional<Certificado> findByUsuarioIdAndCursoId(UUID usuarioId, long cursoId);

	List<Certificado> findByUsuarioIdOrderByEmitidoEmDesc(UUID usuarioId);

	boolean existsByCodigo(String codigo);

}
