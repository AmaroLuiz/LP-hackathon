package br.com.potencia.contas;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

@Entity
class Usuario {

	@Id
	private UUID id;

	private String nome;

	/** Sempre minúsculo e sem espaços nas pontas. */
	private String email;

	private String senhaHash;

	@Enumerated(EnumType.STRING)
	private Papel papel;

	private Instant emailVerificadoEm;

	private boolean deveTrocarSenha;

	private String avatarUrl;

	private String segmentoNegocio;

	private String nomeNegocio;

	private String cidade;

	private String telefone;

	@Enumerated(EnumType.STRING)
	private Objetivo objetivo;

	@Enumerated(EnumType.STRING)
	private Familiaridade familiaridade;

	private Instant onboardingConcluidoEm;

	private Instant bloqueadoEm;

	private Instant ultimoAcessoEm;

	private Instant aceitouTermosEm;

	private boolean aceitouMarketing;

	private Instant criadoEm;

	private Instant atualizadoEm;

	private Instant excluidoEm;

	/** Troca de e-mail esperando a confirmação pelo link. */
	private String emailNovo;

	/** Conta Google ligada (o "sub", que não muda mesmo se a pessoa trocar o Gmail). */
	private String googleSub;

	protected Usuario() {
	}

	static Usuario novo(String nome, String email, String senhaHash, Papel papel, boolean aceitouMarketing,
			Instant agora) {
		var u = new Usuario();
		u.id = UUID.randomUUID();
		u.nome = nome.strip();
		u.email = email;
		u.senhaHash = senhaHash;
		u.papel = papel;
		u.aceitouTermosEm = agora;
		u.aceitouMarketing = aceitouMarketing;
		u.criadoEm = agora;
		u.atualizadoEm = agora;
		return u;
	}

	UsuarioSessao paraSessao() {
		return new UsuarioSessao(id, email, nome, papel);
	}

	boolean isAtivo() {
		return excluidoEm == null;
	}

	boolean isBloqueado() {
		return bloqueadoEm != null;
	}

	boolean isEmailVerificado() {
		return emailVerificadoEm != null;
	}

	void verificarEmail(Instant agora) {
		if (emailVerificadoEm == null) {
			emailVerificadoEm = agora;
			atualizadoEm = agora;
		}
	}

	void trocarSenha(String novoHash, Instant agora) {
		senhaHash = novoHash;
		deveTrocarSenha = false;
		atualizadoEm = agora;
	}

	/** Admin criado na inicialização: senha provisória, troca obrigatória. */
	void exigirTrocaDeSenha() {
		deveTrocarSenha = true;
	}

	/** Respostas do onboarding (todas opcionais: o aluno pode pular). */
	void atualizarPerfil(String segmentoNegocio, String nomeNegocio, Objetivo objetivo, Familiaridade familiaridade,
			Instant agora) {
		this.segmentoNegocio = vazioParaNulo(segmentoNegocio);
		this.nomeNegocio = vazioParaNulo(nomeNegocio);
		this.objetivo = objetivo;
		this.familiaridade = familiaridade;
		if (onboardingConcluidoEm == null) {
			onboardingConcluidoEm = agora;
		}
		atualizadoEm = agora;
	}

	private static String vazioParaNulo(String texto) {
		return texto == null || texto.isBlank() ? null : texto.strip();
	}

	/** Tela de perfil: nulo mantém o que está. */
	void editar(String nome, String segmentoNegocio, String nomeNegocio, String cidade, String telefone,
			Boolean aceitouMarketing, Instant agora) {
		if (nome != null && !nome.isBlank()) {
			this.nome = nome.strip();
		}
		if (segmentoNegocio != null) {
			this.segmentoNegocio = vazioParaNulo(segmentoNegocio);
		}
		if (nomeNegocio != null) {
			this.nomeNegocio = vazioParaNulo(nomeNegocio);
		}
		if (cidade != null) {
			this.cidade = vazioParaNulo(cidade);
		}
		if (telefone != null) {
			this.telefone = vazioParaNulo(telefone);
		}
		if (aceitouMarketing != null) {
			this.aceitouMarketing = aceitouMarketing;
		}
		atualizadoEm = agora;
	}

	void pedirTrocaDeEmail(String novo, Instant agora) {
		emailNovo = novo;
		atualizadoEm = agora;
	}

	/** O link chegou no endereço novo: ele passa a valer (e já está verificado). */
	void confirmarTrocaDeEmail(Instant agora) {
		email = emailNovo;
		emailNovo = null;
		emailVerificadoEm = agora;
		atualizadoEm = agora;
	}

	void ligarGoogle(String sub, Instant agora) {
		googleSub = sub;
		atualizadoEm = agora;
	}

	/**
	 * Exclusão a pedido (LGPD): some tudo o que identifica a pessoa. A linha fica
	 * para não quebrar o histórico (pagamentos, auditoria), sem dado pessoal.
	 */
	void anonimizar(String hashInutilizavel, Instant agora) {
		nome = "Conta excluída";
		email = "excluida-" + id + "@potencia.invalid";
		emailNovo = null;
		senhaHash = hashInutilizavel;
		avatarUrl = null;
		segmentoNegocio = null;
		nomeNegocio = null;
		cidade = null;
		telefone = null;
		objetivo = null;
		familiaridade = null;
		googleSub = null;
		aceitouMarketing = false;
		excluidoEm = agora;
		atualizadoEm = agora;
	}

	void registrarAcesso(Instant agora) {
		ultimoAcessoEm = agora;
	}

	// --- Ações do painel admin ------------------------------------------------

	void bloquear(Instant agora) {
		if (bloqueadoEm == null) {
			bloqueadoEm = agora;
		}
		atualizadoEm = agora;
	}

	void desbloquear(Instant agora) {
		bloqueadoEm = null;
		atualizadoEm = agora;
	}

	void alterarPapel(Papel novo, Instant agora) {
		papel = novo;
		atualizadoEm = agora;
	}

	/** Redefinição forçada: a senha atual deixa de valer até a pessoa criar outra pelo link. */
	void invalidarSenha(String hashInutilizavel, Instant agora) {
		senhaHash = hashInutilizavel;
		atualizadoEm = agora;
	}

	Instant getBloqueadoEm() {
		return bloqueadoEm;
	}

	Instant getEmailVerificadoEm() {
		return emailVerificadoEm;
	}

	Instant getUltimoAcessoEm() {
		return ultimoAcessoEm;
	}

	Instant getAceitouTermosEm() {
		return aceitouTermosEm;
	}

	boolean isAceitouMarketing() {
		return aceitouMarketing;
	}

	UUID getId() {
		return id;
	}

	String getNome() {
		return nome;
	}

	String getEmail() {
		return email;
	}

	String getSenhaHash() {
		return senhaHash;
	}

	Papel getPapel() {
		return papel;
	}

	boolean isDeveTrocarSenha() {
		return deveTrocarSenha;
	}

	String getCidade() {
		return cidade;
	}

	String getTelefone() {
		return telefone;
	}

	String getEmailNovo() {
		return emailNovo;
	}

	String getGoogleSub() {
		return googleSub;
	}

	Instant getExcluidoEm() {
		return excluidoEm;
	}

	String getAvatarUrl() {
		return avatarUrl;
	}

	String getSegmentoNegocio() {
		return segmentoNegocio;
	}

	String getNomeNegocio() {
		return nomeNegocio;
	}

	Objetivo getObjetivo() {
		return objetivo;
	}

	Familiaridade getFamiliaridade() {
		return familiaridade;
	}

	boolean isOnboardingConcluido() {
		return onboardingConcluidoEm != null;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}
