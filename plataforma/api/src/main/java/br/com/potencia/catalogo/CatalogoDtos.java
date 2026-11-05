package br.com.potencia.catalogo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Respostas do catálogo. Nenhuma delas leva o identificador do vídeo das aulas:
 * esse só sai na rota do player, depois de checar o acesso.
 */
public final class CatalogoDtos {

	private CatalogoDtos() {
	}

	public record CategoriaResumo(String slug, String nome) {

		static CategoriaResumo de(Categoria c) {
			return new CategoriaResumo(c.getSlug(), c.getNome());
		}

	}

	public record CategoriaResposta(String slug, String nome, String descricao) {

		static CategoriaResposta de(Categoria c) {
			return new CategoriaResposta(c.getSlug(), c.getNome(), c.getDescricao());
		}

	}

	/** O que o card do curso precisa. */
	public record CursoCard(Long id, String slug, int numero, String titulo, String subtitulo, String capaUrl,
			String capaAlt, Nivel nivel, CategoriaResumo categoria, List<String> instrutores, BigDecimal notaMedia,
			int totalAvaliacoes, int totalAlunos, long totalAulas, long duracaoTotalSegundos, List<String> ferramentas,
			boolean temPrevia, boolean destaque, Instant publicadoEm) {

		static CursoCard de(Curso c, Totais t) {
			return new CursoCard(c.getId(), c.getSlug(), c.getNumero(), c.getTitulo(), c.getSubtitulo(),
					c.getCapaUrl(), c.getCapaAlt(), c.getNivel(), CategoriaResumo.de(c.getCategoria()),
					c.getInstrutores().stream().map(Instrutor::getNome).toList(), c.getNotaMedia(),
					c.getTotalAvaliacoes(), c.getTotalAlunos(), t.aulas(), t.segundos(), List.copyOf(c.getFerramentas()),
					t.temPrevia(), c.isDestaque(), c.getPublicadoEm());
		}

	}

	public record InstrutorResposta(String nome, String titulo, String bio, String fotoUrl) {

		static InstrutorResposta de(Instrutor i) {
			return new InstrutorResposta(i.getNome(), i.getTitulo(), i.getBio(), i.getFotoUrl());
		}

	}

	public record AulaResumo(Long id, int ordem, String titulo, TipoAula tipo, Integer duracaoSegundos,
			boolean previa) {

		static AulaResumo de(Aula a) {
			return new AulaResumo(a.getId(), a.getOrdem(), a.getTitulo(), a.getTipo(), a.getDuracaoSegundos(),
					a.isPrevia());
		}

	}

	public record ModuloResumo(int ordem, String titulo, String descricao, List<AulaResumo> aulas) {

		static ModuloResumo de(Modulo m) {
			return new ModuloResumo(m.getOrdem(), m.getTitulo(), m.getDescricao(),
					m.getAulas().stream().filter(Aula::isPublicada).map(AulaResumo::de).toList());
		}

	}

	public record CursoDetalhe(CursoCard card, String descricao, String idioma, List<String> ferramentas,
			List<String> oQueAprende, List<String> requisitos, List<String> paraQuemE, String resultadoFinal,
			boolean certificadoHabilitado, Instant publicadoEm, Instant atualizadoEm, String seoTitulo,
			String seoDescricao, List<InstrutorResposta> instrutores, List<ModuloResumo> modulos) {

		static CursoDetalhe de(Curso c, Totais t) {
			return new CursoDetalhe(CursoCard.de(c, t), c.getDescricao(), c.getIdioma(), List.copyOf(c.getFerramentas()),
					List.copyOf(c.getOQueAprende()), List.copyOf(c.getRequisitos()), List.copyOf(c.getParaQuemE()),
					c.getResultadoFinal(), c.isCertificadoHabilitado(), c.getPublicadoEm(), c.getAtualizadoEm(),
					c.getSeoTitulo(), c.getSeoDescricao(),
					c.getInstrutores().stream().map(InstrutorResposta::de).toList(),
					c.getModulos().stream().map(ModuloResumo::de).toList());
		}

	}

	/** Linha da lista de cursos do painel admin (inclui rascunhos e arquivados). */
	public record CursoAdminLinha(Long id, String slug, int numero, String titulo, StatusCurso status,
			String capaUrl, String categoria, boolean destaque, long totalAulas, long duracaoSegundos, int totalAlunos,
			BigDecimal notaMedia, int totalAvaliacoes, Instant publicadoEm, Instant atualizadoEm) {

		static CursoAdminLinha de(Curso c, Totais t) {
			return new CursoAdminLinha(c.getId(), c.getSlug(), c.getNumero(), c.getTitulo(), c.getStatus(),
					c.getCapaUrl(), c.getCategoria().getNome(), c.isDestaque(), t.aulas(), t.segundos(),
					c.getTotalAlunos(), c.getNotaMedia(), c.getTotalAvaliacoes(), c.getPublicadoEm(), c.getAtualizadoEm());
		}

	}

	// --- Uso interno entre módulos (nunca vai direto para uma rota pública) ---

	/** Arquivo para baixar: a chave só vira link assinado depois de checar o acesso. */
	public record MaterialDados(String nome, String chave, Long tamanhoBytes) {
	}

	/** Uma aula com tudo o que o player precisa, inclusive o id do vídeo. */
	public record AulaDados(long id, long cursoId, String cursoSlug, String cursoTitulo, boolean cursoPublicado,
			String moduloTitulo, String titulo, TipoAula tipo, String resumo, String conteudo, String videoId,
			Integer duracaoSegundos, boolean previa, boolean publicada, String legendaUrl,
			List<MaterialDados> materiais) {

		static AulaDados de(Aula a) {
			var c = a.getModulo().getCurso();
			return new AulaDados(a.getId(), c.getId(), c.getSlug(), c.getTitulo(), c.isPublicado(),
					a.getModulo().getTitulo(), a.getTitulo(), a.getTipo(), a.getResumo(), a.getConteudo(), a.getVideoId(),
					a.getDuracaoSegundos(), a.isPrevia(), a.isPublicada(), a.getLegendaUrl(),
					a.getMateriais()
						.stream()
						.map(m -> new MaterialDados(m.getNome(), m.getChave(), m.getTamanhoBytes()))
						.toList());
		}

	}

	public record AulaItem(long id, String titulo, TipoAula tipo, Integer duracaoSegundos, boolean previa) {
	}

	public record ModuloDados(String titulo, List<AulaItem> aulas) {
	}

	/** Currículo publicado de um curso, na ordem em que as aulas devem ser feitas. */
	public record CurriculoDados(long cursoId, String slug, String titulo, int numero, boolean publicado,
			boolean certificadoHabilitado, Integer cargaHorariaMinutos, String capaUrl, List<ModuloDados> modulos) {

		public List<AulaItem> aulasEmOrdem() {
			return modulos.stream().flatMap(m -> m.aulas().stream()).toList();
		}

		public long duracaoTotalSegundos() {
			return aulasEmOrdem().stream().mapToLong(a -> a.duracaoSegundos() == null ? 0 : a.duracaoSegundos()).sum();
		}

		/** A definida no painel; sem ela, a soma das aulas (mínimo 1 minuto). */
		public int cargaHorariaDoCertificado() {
			if (cargaHorariaMinutos != null) {
				return cargaHorariaMinutos;
			}
			return (int) Math.max(1, Math.ceil(duracaoTotalSegundos() / 60.0));
		}

		static CurriculoDados de(Curso c) {
			return new CurriculoDados(c.getId(), c.getSlug(), c.getTitulo(), c.getNumero(), c.isPublicado(),
					c.isCertificadoHabilitado(), c.getCargaHorariaMinutos(), c.getCapaUrl(),
					c.getModulos()
						.stream()
						.map(m -> new ModuloDados(m.getTitulo(),
								m.getAulas()
									.stream()
									.filter(Aula::isPublicada)
									.map(a -> new AulaItem(a.getId(), a.getTitulo(), a.getTipo(), a.getDuracaoSegundos(),
											a.isPrevia()))
									.toList()))
						.filter(m -> !m.aulas().isEmpty())
						.toList());
		}

	}

	record Totais(long aulas, long segundos, boolean temPrevia) {

		static final Totais ZERO = new Totais(0, 0, false);

	}

}
