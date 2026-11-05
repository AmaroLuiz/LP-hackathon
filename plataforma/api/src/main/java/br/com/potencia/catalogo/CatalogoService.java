package br.com.potencia.catalogo;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.catalogo.CatalogoDtos.AulaDados;
import br.com.potencia.catalogo.CatalogoDtos.CategoriaResposta;
import br.com.potencia.catalogo.CatalogoDtos.CursoAdminLinha;
import br.com.potencia.catalogo.CatalogoDtos.CursoCard;
import br.com.potencia.catalogo.CatalogoDtos.CurriculoDados;
import br.com.potencia.catalogo.CatalogoDtos.CursoDetalhe;
import br.com.potencia.catalogo.CatalogoDtos.Totais;

/**
 * API pública do módulo de catálogo. Outros módulos usam este serviço, nunca as
 * entidades ou os repositórios diretamente.
 */
@Service
@Transactional(readOnly = true)
public class CatalogoService {

	private final CursoRepository cursos;

	private final CategoriaRepository categorias;

	private final AulaRepository aulas;

	private final org.springframework.context.ApplicationEventPublisher eventos;

	CatalogoService(CursoRepository cursos, CategoriaRepository categorias, AulaRepository aulas,
			org.springframework.context.ApplicationEventPublisher eventos) {
		this.cursos = cursos;
		this.categorias = categorias;
		this.aulas = aulas;
		this.eventos = eventos;
	}

	public List<CursoCard> listarPublicados() {
		var totais = totais();
		return cursos.findAllByStatusOrderByNumero(StatusCurso.PUBLICADO)
			.stream()
			.map(c -> CursoCard.de(c, totais.getOrDefault(c.getId(), Totais.ZERO)))
			.toList();
	}

	/** Só cursos publicados; rascunho e arquivado respondem como inexistentes. */
	public Optional<CursoDetalhe> buscarPublicado(String slug) {
		return cursos.findBySlug(slug)
			.filter(Curso::isPublicado)
			.map(c -> CursoDetalhe.de(c, totais().getOrDefault(c.getId(), Totais.ZERO)));
	}

	public List<CategoriaResposta> listarCategorias() {
		return categorias.findAllByOrderByOrdem().stream().map(CategoriaResposta::de).toList();
	}

	public List<CursoAdminLinha> listarParaAdmin() {
		var totais = totais();
		return cursos.findAllByOrderByNumero()
			.stream()
			.map(c -> CursoAdminLinha.de(c, totais.getOrDefault(c.getId(), Totais.ZERO)))
			.toList();
	}

	// --- API interna para os outros módulos ---------------------------------

	public Optional<AulaDados> aula(long aulaId) {
		return aulas.findById(aulaId).map(AulaDados::de);
	}

	public Optional<CurriculoDados> curriculo(String slug) {
		return cursos.findBySlug(slug).map(CurriculoDados::de);
	}

	public Optional<CurriculoDados> curriculo(long cursoId) {
		return cursos.findById(cursoId).map(CurriculoDados::de);
	}

	/** Cards dos cursos publicados com esses ids, na ordem do catálogo. */
	public List<CursoCard> cards(Collection<Long> ids) {
		var procurados = Set.copyOf(ids);
		return listarPublicados().stream().filter(c -> procurados.contains(c.id())).toList();
	}

	public Optional<Long> idPublicado(String slug) {
		return cursos.findBySlug(slug).filter(Curso::isPublicado).map(Curso::getId);
	}

	/** Nota média e total de avaliações publicadas: muda o card e a página do curso. */
	@Transactional
	public void registrarAvaliacoes(long cursoId, java.math.BigDecimal media, int total) {
		cursos.findById(cursoId).ifPresent(c -> {
			c.atualizarNota(media, total);
			if (c.isPublicado()) {
				eventos.publishEvent(br.com.potencia.compartilhado.SiteDesatualizado.catalogo(c.getSlug()));
			}
		});
	}

	/** Primeira matrícula de alguém no curso. */
	@Transactional
	public void registrarNovoAluno(long cursoId) {
		cursos.findById(cursoId).ifPresent(Curso::registrarAluno);
	}

	private Map<Long, Totais> totais() {
		var mapa = new HashMap<Long, Totais>();
		for (Object[] linha : cursos.totaisPorCurso()) {
			mapa.put((Long) linha[0], new Totais(((Number) linha[1]).longValue(), ((Number) linha[2]).longValue(),
					((Number) linha[3]).longValue() > 0));
		}
		return mapa;
	}

}
