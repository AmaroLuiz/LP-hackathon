package br.com.potencia.aprendizado;

import br.com.potencia.assinaturas.AssinaturasService.Origem;
import br.com.potencia.contas.Papel;

/**
 * A regra única de quem pode assistir uma aula. Função pura (sem banco), para
 * ser testada em todas as combinações; o AprendizadoService só junta os dados.
 */
public final class Acesso {

	private Acesso() {
	}

	public enum Motivo {

		/** Admin vê tudo, inclusive rascunho. */
		ADMIN,
		/** Coberto pela assinatura ativa. */
		ASSINATURA,
		/** Concedido por um admin. */
		ACESSO_MANUAL,
		/** Aula de prévia: aberta a qualquer pessoa. */
		PREVIA,
		/** Tem o curso, mas precisa confirmar o e-mail antes de assistir aulas pagas. */
		EMAIL_NAO_VERIFICADO,
		/** Não tem o curso (nem assinatura que o inclua). */
		SEM_ACESSO,
		/** Curso ou aula fora do ar (rascunho, arquivado, despublicada). */
		INDISPONIVEL

	}

	public record Decisao(boolean pode, Motivo motivo) {
	}

	/**
	 * @param papel nulo para visitante
	 * @param origem de onde vem o acesso ao curso (nulo se o aluno não tem o curso)
	 * @param previa se a aula é de prévia (nulo ao avaliar o curso inteiro)
	 * @param publicado se o curso e a aula estão publicados
	 */
	public static Decisao decidir(Papel papel, boolean emailVerificado, Origem origem, boolean previa,
			boolean publicado) {
		if (papel == Papel.ADMIN) {
			return new Decisao(true, Motivo.ADMIN);
		}
		if (!publicado) {
			return new Decisao(false, Motivo.INDISPONIVEL);
		}
		if (previa) {
			return new Decisao(true, Motivo.PREVIA);
		}
		if (papel == null || origem == null) {
			return new Decisao(false, Motivo.SEM_ACESSO);
		}
		if (!emailVerificado) {
			return new Decisao(false, Motivo.EMAIL_NAO_VERIFICADO);
		}
		return new Decisao(true, origem == Origem.ASSINATURA ? Motivo.ASSINATURA : Motivo.ACESSO_MANUAL);
	}

}
