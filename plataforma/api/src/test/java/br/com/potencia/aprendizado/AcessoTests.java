package br.com.potencia.aprendizado;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import br.com.potencia.aprendizado.Acesso.Motivo;
import br.com.potencia.assinaturas.AssinaturasService.Origem;
import br.com.potencia.contas.Papel;

/** A regra de acesso em todas as combinações que importam. */
class AcessoTests {

	private static Motivo motivo(Papel papel, boolean verificado, Origem origem, boolean previa, boolean publicado) {
		return Acesso.decidir(papel, verificado, origem, previa, publicado).motivo();
	}

	private static boolean pode(Papel papel, boolean verificado, Origem origem, boolean previa, boolean publicado) {
		return Acesso.decidir(papel, verificado, origem, previa, publicado).pode();
	}

	@Test
	void adminVeTudoInclusiveRascunho() {
		assertThat(motivo(Papel.ADMIN, false, null, false, false)).isEqualTo(Motivo.ADMIN);
		assertThat(pode(Papel.ADMIN, false, null, false, true)).isTrue();
	}

	@Test
	void cursoForaDoArNaoAbreParaNinguemAlemDoAdmin() {
		assertThat(motivo(Papel.USUARIO, true, Origem.ASSINATURA, false, false)).isEqualTo(Motivo.INDISPONIVEL);
		assertThat(motivo(null, false, null, true, false)).isEqualTo(Motivo.INDISPONIVEL);
	}

	@Test
	void previaAbreParaQualquerUm() {
		assertThat(motivo(null, false, null, true, true)).isEqualTo(Motivo.PREVIA);
		assertThat(motivo(Papel.USUARIO, false, null, true, true)).isEqualTo(Motivo.PREVIA);
	}

	@Test
	void visitanteESemPlanoNaoAssistem() {
		assertThat(motivo(null, false, null, false, true)).isEqualTo(Motivo.SEM_ACESSO);
		assertThat(motivo(Papel.USUARIO, true, null, false, true)).isEqualTo(Motivo.SEM_ACESSO);
	}

	@Test
	void comPlanoPrecisaDoEmailConfirmado() {
		assertThat(motivo(Papel.USUARIO, false, Origem.ASSINATURA, false, true)).isEqualTo(Motivo.EMAIL_NAO_VERIFICADO);
		assertThat(pode(Papel.USUARIO, false, Origem.ACESSO_MANUAL, false, true)).isFalse();
	}

	@Test
	void assinaturaOuAcessoManualLiberam() {
		assertThat(motivo(Papel.USUARIO, true, Origem.ASSINATURA, false, true)).isEqualTo(Motivo.ASSINATURA);
		assertThat(motivo(Papel.USUARIO, true, Origem.ACESSO_MANUAL, false, true)).isEqualTo(Motivo.ACESSO_MANUAL);
	}

}
