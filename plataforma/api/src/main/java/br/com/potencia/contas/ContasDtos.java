package br.com.potencia.contas;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ContasDtos {

	private ContasDtos() {
	}

	public record CadastroPedido(
			@NotBlank(message = "Informe seu nome.") @Size(max = 120, message = "Use até 120 caracteres.") String nome,
			@NotBlank(message = "Informe seu e-mail.") @Email(message = "Informe um e-mail válido.")
			@Size(max = 254, message = "E-mail longo demais.") String email,
			@NotNull(message = "Crie uma senha.")
			@Size(min = 10, max = 128, message = "A senha precisa ter de 10 a 128 caracteres.") String senha,
			@NotNull(message = "Para criar a conta, aceite os termos de uso.")
			@AssertTrue(message = "Para criar a conta, aceite os termos de uso.") Boolean aceitouTermos,
			Boolean aceitouMarketing) {

		/** Campo opcional: ausente vale "não". */
		public boolean querMarketing() {
			return Boolean.TRUE.equals(aceitouMarketing);
		}

	}

	public record EntrarPedido(@NotBlank(message = "Informe seu e-mail.") String email,
			@NotBlank(message = "Informe sua senha.") String senha, Boolean lembrar) {

		/** Campo opcional: ausente vale "não". */
		public boolean querLembrar() {
			return Boolean.TRUE.equals(lembrar);
		}

	}

	public record EmailPedido(
			@NotBlank(message = "Informe seu e-mail.") @Email(message = "Informe um e-mail válido.") String email) {
	}

	public record TokenPedido(@NotBlank(message = "Link inválido.") String token) {
	}

	public record RedefinirSenhaPedido(@NotBlank(message = "Link inválido.") String token,
			@NotNull(message = "Crie uma senha.")
			@Size(min = 10, max = 128, message = "A senha precisa ter de 10 a 128 caracteres.") String novaSenha) {
	}

	public record TrocarSenhaPedido(@NotBlank(message = "Informe a senha atual.") String senhaAtual,
			@NotNull(message = "Crie uma senha.")
			@Size(min = 10, max = 128, message = "A senha precisa ter de 10 a 128 caracteres.") String novaSenha) {
	}

	/** Onboarding: tudo opcional; enviar vazio limpa o campo. */
	/** Tela de perfil (PATCH /api/me): campo nulo fica como está. */
	public record EdicaoContaPedido(@Size(min = 2, max = 120, message = "Use de 2 a 120 caracteres no nome.") String nome,
			@Size(max = 80, message = "Use até 80 caracteres.") String segmentoNegocio,
			@Size(max = 120, message = "Use até 120 caracteres.") String nomeNegocio,
			@Size(max = 120, message = "Use até 120 caracteres.") String cidade,
			@Size(max = 30, message = "Use até 30 caracteres.") String telefone, Boolean aceitouMarketing) {
	}

	public record TrocaEmailPedido(@NotBlank(message = "Informe o e-mail novo.") @Email(message = "Informe um e-mail válido.")
			@Size(max = 254) String novoEmail, @NotBlank(message = "Informe a sua senha.") String senha) {
	}

	public record SessaoAtiva(String id, String aparelho, Instant criadaEm, Instant ultimoUso, boolean atual) {
	}

	public record PerfilPedido(@Size(max = 80, message = "Use até 80 caracteres.") String segmentoNegocio,
			@Size(max = 120, message = "Use até 120 caracteres.") String nomeNegocio, Objetivo objetivo,
			Familiaridade familiaridade) {
	}

	public record UsuarioResposta(UUID id, String nome, String email, Papel papel, boolean emailVerificado,
			boolean deveTrocarSenha, String avatarUrl, String segmentoNegocio, String nomeNegocio, Objetivo objetivo,
			Familiaridade familiaridade, boolean onboardingConcluido, Instant criadoEm, String cidade, String telefone,
			boolean aceitouMarketing, String emailPendente, boolean googleLigado) {

		static UsuarioResposta de(Usuario u) {
			return new UsuarioResposta(u.getId(), u.getNome(), u.getEmail(), u.getPapel(), u.isEmailVerificado(),
					u.isDeveTrocarSenha(), u.getAvatarUrl(), u.getSegmentoNegocio(), u.getNomeNegocio(), u.getObjetivo(),
					u.getFamiliaridade(), u.isOnboardingConcluido(), u.getCriadoEm(), u.getCidade(), u.getTelefone(),
					u.isAceitouMarketing(), u.getEmailNovo(), u.getGoogleSub() != null);
		}

	}

}
