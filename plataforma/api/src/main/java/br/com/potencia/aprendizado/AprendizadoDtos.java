package br.com.potencia.aprendizado;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.potencia.aprendizado.Acesso.Motivo;
import br.com.potencia.catalogo.CatalogoDtos.CursoCard;
import br.com.potencia.catalogo.TipoAula;

public final class AprendizadoDtos {

	private AprendizadoDtos() {
	}

	public record MatriculaResumo(Long ultimaAulaId, int aulasConcluidas, int totalAulas, int percentual,
			boolean concluido, Instant iniciadaEm, String certificadoCodigo) {
	}

	/** Para o cartão da página do curso: o que mostrar para quem está logado. */
	public record AcessoCurso(boolean podeAssistir, Motivo motivo, MatriculaResumo matricula, Long primeiraAulaId) {
	}

	public record AulaPainel(long id, String titulo, TipoAula tipo, Integer duracaoSegundos, boolean previa,
			boolean concluida) {
	}

	public record ModuloPainel(String titulo, List<AulaPainel> aulas, int concluidas) {
	}

	/** Currículo com o progresso do aluno: o painel lateral do player. */
	public record PainelCurso(long cursoId, String slug, String titulo, int numero, boolean certificadoHabilitado,
			List<ModuloPainel> modulos, int aulasConcluidas, int totalAulas, int percentual, boolean concluido,
			Long continuarAulaId, String certificadoCodigo) {
	}

	/** @param legenda URL da legenda WebVTT (nula se a aula não tem) */
	public record Video(String url, String tipo, String poster, String legenda) {
	}

	public record AulaPlayer(long id, String cursoSlug, String cursoTitulo, String moduloTitulo, String titulo,
			TipoAula tipo, String resumo, String conteudo, Video video, Integer duracaoSegundos, int posicaoSegundos,
			boolean concluida, Long anteriorId, Long proximaId, String proximaTitulo, int indice, int total,
			List<MaterialAula> materiais) {
	}

	/** Material para baixar, com link assinado de curta duração. */
	public record MaterialAula(String nome, String url, Long tamanhoBytes) {
	}

	public record Conclusao(int aulasConcluidas, int totalAulas, int percentual, boolean cursoConcluido,
			String certificadoCodigo) {
	}

	public record Previa(long id, String titulo, String cursoTitulo, Integer duracaoSegundos, Video video) {
	}

	public record AnotacaoResposta(UUID id, int posicaoSegundos, String texto, Instant criadoEm) {

		static AnotacaoResposta de(Anotacao a) {
			return new AnotacaoResposta(a.getId(), a.getPosicaoSegundos(), a.getTexto(), a.getCriadoEm());
		}

	}

	public record MeuCurso(CursoCard card, MatriculaResumo matricula) {
	}

	/** O mínimo para os cards do site: o que está na lista de desejos e o progresso por curso. */
	public record Resumo(List<Long> desejos, Map<Long, Integer> progresso) {
	}

	public record CertificadoResposta(String codigo, String nomeAluno, String tituloCurso, String cursoSlug,
			int cargaHorariaMinutos, Instant emitidoEm) {
	}

	// --- Pedidos -------------------------------------------------------------

	public record PosicaoPedido(@NotNull @Min(0) @Max(86_400) Integer posicaoSegundos) {
	}

	public record ConclusaoPedido(@NotNull Boolean concluida) {
	}

	public record AnotacaoPedido(@NotNull @Min(0) @Max(86_400) Integer posicaoSegundos,
			@NotBlank(message = "Escreva a anotação.") @Size(max = 2000, message = "Use até 2.000 caracteres.") String texto) {
	}

	public record EdicaoAnotacaoPedido(
			@NotBlank(message = "Escreva a anotação.") @Size(max = 2000, message = "Use até 2.000 caracteres.") String texto) {
	}

}
