package br.com.potencia.comunidade;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

interface PerguntaRepository extends JpaRepository<Pergunta, UUID>, JpaSpecificationExecutor<Pergunta> {

	List<Pergunta> findByAulaIdAndOcultaFalseOrderByCriadoEmDesc(long aulaId);

	List<Pergunta> findByUsuarioId(UUID usuarioId);

}

interface RespostaRepository extends JpaRepository<Resposta, UUID> {

	List<Resposta> findByPerguntaIdInOrderByCriadoEm(Collection<UUID> perguntaIds);

	List<Resposta> findByUsuarioId(UUID usuarioId);

	boolean existsByPerguntaIdAndDaEquipeTrueAndOcultaFalse(UUID perguntaId);

}

interface PerguntaUtilRepository extends JpaRepository<PerguntaUtil, PerguntaUtil.Chave> {

	List<PerguntaUtil> findByPerguntaIdIn(Collection<UUID> perguntaIds);

	List<PerguntaUtil> findByUsuarioId(UUID usuarioId);

}

interface AvaliacaoRepository extends JpaRepository<Avaliacao, UUID>, JpaSpecificationExecutor<Avaliacao> {

	Optional<Avaliacao> findByUsuarioIdAndCursoId(UUID usuarioId, long cursoId);

	Page<Avaliacao> findByCursoIdAndStatusOrderByCriadoEmDesc(long cursoId, Avaliacao.Status status, Pageable pagina);

	Page<Avaliacao> findByCursoIdAndStatusAndNotaOrderByCriadoEmDesc(long cursoId, Avaliacao.Status status, int nota,
			Pageable pagina);

	/** Por nota: [nota, quantidade] das avaliações publicadas do curso. */
	@Query("select a.nota, count(a) from Avaliacao a where a.cursoId = :cursoId and a.status = :status group by a.nota")
	List<Object[]> distribuicao(long cursoId, Avaliacao.Status status);

	List<Avaliacao> findByUsuarioId(UUID usuarioId);

	List<Avaliacao> findTop6ByStatusAndNotaGreaterThanEqualAndComentarioIsNotNullOrderByCriadoEmDesc(
			Avaliacao.Status status, int nota);

}
