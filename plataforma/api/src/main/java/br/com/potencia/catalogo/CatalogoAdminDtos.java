package br.com.potencia.catalogo;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Pedidos e respostas do painel admin para cursos, currículo, categorias e instrutores. */
public final class CatalogoAdminDtos {

	private CatalogoAdminDtos() {
	}

	static final String SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";

	static final String MSG_SLUG = "Use só letras minúsculas sem acento, números e hífens (ex.: videos-em-motion).";

	// --- Respostas -----------------------------------------------------------

	public record CategoriaAdmin(Long id, String slug, String nome, String descricao, int ordem, long totalCursos) {
	}

	public record InstrutorAdmin(Long id, String nome, String titulo, String bio, String fotoUrl, long totalCursos) {
	}

	public record MaterialAdmin(Long id, String nome, String chave, Long tamanhoBytes, String tipoMime) {

		static MaterialAdmin de(Material m) {
			return new MaterialAdmin(m.getId(), m.getNome(), m.getChave(), m.getTamanhoBytes(), m.getTipoMime());
		}

	}

	public record AulaAdmin(Long id, int ordem, String titulo, TipoAula tipo, String resumo, String conteudo,
			String videoId, Integer duracaoSegundos, boolean previa, String legendaUrl, boolean publicada,
			List<MaterialAdmin> materiais) {

		static AulaAdmin de(Aula a) {
			return new AulaAdmin(a.getId(), a.getOrdem(), a.getTitulo(), a.getTipo(), a.getResumo(), a.getConteudo(),
					a.getVideoId(), a.getDuracaoSegundos(), a.isPrevia(), a.getLegendaUrl(), a.isPublicada(),
					a.getMateriais().stream().map(MaterialAdmin::de).toList());
		}

	}

	public record ModuloAdmin(Long id, int ordem, String titulo, String descricao, List<AulaAdmin> aulas) {

		static ModuloAdmin de(Modulo m) {
			return new ModuloAdmin(m.getId(), m.getOrdem(), m.getTitulo(), m.getDescricao(),
					m.getAulas().stream().map(AulaAdmin::de).toList());
		}

	}

	/** O curso inteiro como o editor do painel precisa (inclusive rascunho e aulas não publicadas). */
	public record CursoEdicao(Long id, String slug, int numero, String titulo, String subtitulo, String descricao,
			String capaUrl, String capaAlt, Nivel nivel, String idioma, Long categoriaId, List<String> ferramentas,
			List<String> oQueAprende, List<String> requisitos, List<String> paraQuemE, String resultadoFinal,
			StatusCurso status, boolean destaque, boolean certificadoHabilitado, Integer cargaHorariaMinutos,
			String seoTitulo, String seoDescricao, List<Long> instrutores, Instant publicadoEm, Instant atualizadoEm,
			int totalAlunos, long totalAulasPublicadas, long duracaoPublicadaSegundos, List<ModuloAdmin> modulos) {

		static CursoEdicao de(Curso c) {
			var modulos = c.getModulos().stream().map(ModuloAdmin::de).toList();
			var publicadas = modulos.stream().flatMap(m -> m.aulas().stream()).filter(AulaAdmin::publicada).toList();
			return new CursoEdicao(c.getId(), c.getSlug(), c.getNumero(), c.getTitulo(), c.getSubtitulo(),
					c.getDescricao(), c.getCapaUrl(), c.getCapaAlt(), c.getNivel(), c.getIdioma(),
					c.getCategoria().getId(), List.copyOf(c.getFerramentas()), List.copyOf(c.getOQueAprende()),
					List.copyOf(c.getRequisitos()), List.copyOf(c.getParaQuemE()), c.getResultadoFinal(), c.getStatus(),
					c.isDestaque(), c.isCertificadoHabilitado(), c.getCargaHorariaMinutos(), c.getSeoTitulo(),
					c.getSeoDescricao(), c.getInstrutores().stream().map(Instrutor::getId).toList(), c.getPublicadoEm(),
					c.getAtualizadoEm(), c.getTotalAlunos(), publicadas.size(),
					publicadas.stream().mapToLong(a -> a.duracaoSegundos() == null ? 0 : a.duracaoSegundos()).sum(),
					modulos);
		}

	}

	/**
	 * @param obrigatorio se falta, não publica; senão é só um aviso
	 */
	public record ItemChecklist(String id, String texto, boolean ok, boolean obrigatorio) {
	}

	public record Checklist(boolean podePublicar, List<ItemChecklist> itens) {
	}

	// --- Pedidos -------------------------------------------------------------

	public record NovoCursoPedido(
			@NotBlank(message = "Dê um título ao curso.") @Size(max = 160, message = "Use até 160 caracteres.") String titulo,
			Long categoriaId) {
	}

	public record CursoPedido(
			@NotBlank(message = "Dê um título ao curso.") @Size(max = 160, message = "Use até 160 caracteres.") String titulo,
			@Size(max = 300, message = "Use até 300 caracteres.") String subtitulo,
			@NotBlank(message = "Informe o endereço do curso.") @Size(max = 120, message = "Use até 120 caracteres.")
			@Pattern(regexp = SLUG, message = MSG_SLUG) String slug,
			@NotNull(message = "Informe o número do curso.") @Min(value = 0, message = "Use um número de 0 a 999.")
			@Max(value = 999, message = "Use um número de 0 a 999.") Integer numero,
			@NotNull(message = "Escolha o tema.") Long categoriaId,
			@NotNull(message = "Escolha o nível.") Nivel nivel,
			@NotBlank(message = "Informe o idioma.") @Size(max = 10, message = "Use um código curto, como pt-BR.") String idioma,
			@Size(max = 8000, message = "Use até 8.000 caracteres.") String descricao,
			@Size(max = 300) String capaUrl,
			@Size(max = 300, message = "Use até 300 caracteres.") String capaAlt,
			@Size(max = 12, message = "Use até 12 ferramentas.") List<@Size(max = 80, message = "Use até 80 caracteres.") String> ferramentas,
			@Size(max = 12, message = "Use até 12 itens.") List<@Size(max = 300, message = "Use até 300 caracteres.") String> oQueAprende,
			@Size(max = 12, message = "Use até 12 itens.") List<@Size(max = 300, message = "Use até 300 caracteres.") String> requisitos,
			@Size(max = 12, message = "Use até 12 itens.") List<@Size(max = 300, message = "Use até 300 caracteres.") String> paraQuemE,
			@Size(max = 300, message = "Use até 300 caracteres.") String resultadoFinal,
			Boolean destaque, Boolean certificadoHabilitado,
			@Min(value = 1, message = "Informe ao menos 1 minuto.") @Max(value = 10_000, message = "Valor alto demais.") Integer cargaHorariaMinutos,
			@Size(max = 160, message = "Use até 160 caracteres.") String seoTitulo,
			@Size(max = 300, message = "Use até 300 caracteres.") String seoDescricao,
			@Size(max = 6, message = "Use até 6 instrutores.") List<Long> instrutores) {
	}

	public record ModuloPedido(
			@NotBlank(message = "Dê um título ao módulo.") @Size(max = 160, message = "Use até 160 caracteres.") String titulo,
			@Size(max = 600, message = "Use até 600 caracteres.") String descricao) {
	}

	public record AulaPedido(
			@NotBlank(message = "Dê um título à aula.") @Size(max = 160, message = "Use até 160 caracteres.") String titulo,
			@NotNull(message = "Escolha o tipo da aula.") TipoAula tipo,
			@Size(max = 600, message = "Use até 600 caracteres.") String resumo,
			@Size(max = 20_000, message = "Use até 20.000 caracteres.") String conteudo,
			@Size(max = 120, message = "Id do vídeo longo demais.") String videoId,
			@Min(value = 0, message = "Duração inválida.") @Max(value = 86_400, message = "Duração acima de 24 horas.") Integer duracaoSegundos,
			Boolean previa, @Size(max = 300) String legendaUrl, Boolean publicada) {
	}

	public record MaterialPedido(
			@NotBlank(message = "Dê um nome ao material.") @Size(max = 160, message = "Use até 160 caracteres.") String nome,
			@NotBlank(message = "Envie o arquivo.") @Size(max = 300) String chave, Long tamanhoBytes,
			@Size(max = 100) String tipoMime) {
	}

	public record ModuloOrdem(@NotNull Long id, @NotNull List<@NotNull Long> aulas) {
	}

	public record OrdemPedido(@NotNull @Valid List<ModuloOrdem> modulos) {
	}

	public record CategoriaPedido(
			@NotBlank(message = "Dê um nome ao tema.") @Size(max = 80, message = "Use até 80 caracteres.") String nome,
			@NotBlank(message = "Informe o endereço.") @Size(max = 80, message = "Use até 80 caracteres.")
			@Pattern(regexp = SLUG, message = MSG_SLUG) String slug,
			@Size(max = 300, message = "Use até 300 caracteres.") String descricao) {
	}

	public record IdsPedido(@NotNull List<@NotNull Long> ids) {
	}

	public record InstrutorPedido(
			@NotBlank(message = "Informe o nome.") @Size(max = 120, message = "Use até 120 caracteres.") String nome,
			@Size(max = 160, message = "Use até 160 caracteres.") String titulo,
			@Size(max = 1200, message = "Use até 1.200 caracteres.") String bio, @Size(max = 300) String fotoUrl) {
	}

	public record PlanosPedido(@NotNull Set<String> planos) {
	}

}
