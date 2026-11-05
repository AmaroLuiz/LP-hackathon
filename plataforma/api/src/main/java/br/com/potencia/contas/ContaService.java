package br.com.potencia.contas;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.potencia.compartilhado.Autor;
import br.com.potencia.compartilhado.ErroApi;
import br.com.potencia.compartilhado.EventoAuditoria;
import br.com.potencia.contas.ContasDtos.CadastroPedido;
import br.com.potencia.contas.ContasDtos.EdicaoContaPedido;
import br.com.potencia.contas.ContasDtos.PerfilPedido;
import br.com.potencia.contas.ContasDtos.UsuarioResposta;
import br.com.potencia.email.EnviadorEmail;
import br.com.potencia.email.EnviadorEmail.Email;

/**
 * Regras de conta: cadastro, login, verificação de e-mail e senha.
 * Sessão e cookies ficam no {@link Sessoes}; aqui só regra de negócio.
 */
@Service
@Transactional
public class ContaService {

	private static final Logger log = LoggerFactory.getLogger(ContaService.class);

	static final Duration VALIDADE_VERIFICACAO = Duration.ofHours(48);

	static final Duration VALIDADE_REDEFINICAO = Duration.ofHours(1);

	static final int LIMITE_LOGIN = 5;

	static final int LIMITE_EMAILS = 3;

	private static final Set<String> SENHAS_OBVIAS = Set.of("1234567890", "0123456789", "12345678910",
			"senha12345", "senha123456", "qwertyuiop", "abcdefghij", "potencia123");

	private final UsuarioRepository usuarios;

	private final TokenContaRepository tokens;

	private final PasswordEncoder senhas;

	private final EnviadorEmail email;

	private final LimitadorTentativas limitador;

	private final Clock relogio;

	private final ApplicationEventPublisher eventos;

	private final Sessoes sessoes;

	private final String webUrl;

	/** Comparado quando o e-mail não existe, para o tempo de resposta não revelar contas. */
	private final String hashFicticio;

	ContaService(UsuarioRepository usuarios, TokenContaRepository tokens, PasswordEncoder senhas,
			EnviadorEmail email, LimitadorTentativas limitador, Clock relogio, ApplicationEventPublisher eventos, Sessoes sessoes,
			@Value("${potencia.web-url}") String webUrl) {
		this.usuarios = usuarios;
		this.tokens = tokens;
		this.senhas = senhas;
		this.email = email;
		this.limitador = limitador;
		this.relogio = relogio;
		this.eventos = eventos;
		this.sessoes = sessoes;
		this.webUrl = webUrl;
		this.hashFicticio = senhas.encode(UUID.randomUUID().toString());
	}

	public UsuarioSessao cadastrar(CadastroPedido pedido) {
		var emailNormal = normalizar(pedido.email());
		validarSenha(pedido.senha(), emailNormal, "senha");
		if (usuarios.existsByEmail(emailNormal)) {
			throw emailEmUso();
		}
		var usuario = Usuario.novo(pedido.nome(), emailNormal, senhas.encode(pedido.senha()), Papel.USUARIO,
				pedido.querMarketing(), agora());
		try {
			usuarios.saveAndFlush(usuario);
		}
		catch (DataIntegrityViolationException e) {
			throw emailEmUso();
		}
		enviarVerificacao(usuario);
		return usuario.paraSessao();
	}

	public UsuarioSessao autenticar(String emailInformado, String senha, String ip) {
		var emailNormal = normalizar(emailInformado);
		var chave = "login:" + emailNormal + "|" + ip;
		limitador.verificar(chave, LIMITE_LOGIN);

		var usuario = usuarios.findByEmail(emailNormal).filter(Usuario::isAtivo);
		boolean confere = senhas.matches(senha, usuario.map(Usuario::getSenhaHash).orElse(hashFicticio));
		if (usuario.isEmpty() || !confere) {
			limitador.registrarFalha(chave);
			throw ErroApi.naoAutenticado("E-mail ou senha incorretos.");
		}
		var u = usuario.get();
		if (u.isBloqueado()) {
			throw ErroApi.proibido("Esta conta está bloqueada. Fale com o suporte.");
		}
		limitador.zerar(chave);
		u.registrarAcesso(agora());
		auditar(u, "conta.login", "Entrou na conta");
		return u.paraSessao();
	}

	@Transactional(readOnly = true)
	public Optional<UsuarioResposta> buscar(UUID id) {
		return usuarios.findById(id).filter(u -> u.isAtivo() && !u.isBloqueado()).map(UsuarioResposta::de);
	}

	/** Conta com senha provisória (admin inicial) ainda sem troca. */
	@Transactional(readOnly = true)
	public boolean precisaTrocarSenha(UUID id) {
		return usuarios.findById(id).map(Usuario::isDeveTrocarSenha).orElse(true);
	}

	public void verificarEmail(String tokenPuro) {
		var token = tokenValido(tokenPuro, TipoToken.VERIFICAR_EMAIL);
		usuario(token.getUsuarioId()).verificarEmail(agora());
		token.usar(agora());
	}

	/** Quem abriu um link enviado ao e-mail (ex.: convite da equipe) provou que o e-mail é dele. */
	public void confirmarEmailPorLink(UUID usuarioId) {
		usuario(usuarioId).verificarEmail(agora());
	}

	public void reenviarVerificacao(UUID usuarioId) {
		var u = usuario(usuarioId);
		if (u.isEmailVerificado()) {
			return;
		}
		var chave = "verificacao:" + usuarioId;
		limitador.verificar(chave, LIMITE_EMAILS);
		limitador.registrarFalha(chave);
		enviarVerificacao(u);
	}

	/** Responde igual exista ou não a conta; só envia se existir e estiver ativa. */
	public void solicitarRedefinicao(String emailInformado) {
		var emailNormal = normalizar(emailInformado);
		var chave = "redefinicao:" + emailNormal;
		try {
			limitador.verificar(chave, LIMITE_EMAILS);
		}
		catch (ErroApi e) {
			return;
		}
		limitador.registrarFalha(chave);
		usuarios.findByEmail(emailNormal)
			.filter(u -> u.isAtivo() && !u.isBloqueado())
			.ifPresent(u -> enviarLinkDeRedefinicao(u, false));
	}

	/**
	 * @param pedidoPeloSuporte redefinição forçada pelo painel: a senha antiga já não vale
	 */
	void enviarLinkDeRedefinicao(Usuario u, boolean pedidoPeloSuporte) {
		var token = emitir(u, TipoToken.REDEFINIR_SENHA, VALIDADE_REDEFINICAO);
		var abertura = pedidoPeloSuporte
				? "Por segurança, a equipe da PotencIA pediu que você crie uma senha nova. A senha antiga não vale mais."
				: "Recebemos um pedido para redefinir a senha da sua conta.";
		var fecho = pedidoPeloSuporte
				? "Se o link expirar, use \"Esqueci minha senha\" na tela de entrada."
				: "Se não foi você, ignore este e-mail: sua senha continua a mesma.";
		enviar(new Email(u.getEmail(), "Redefinir sua senha na PotencIA", """
				Olá, %s.

				%s
				Para criar uma senha nova, abra o link abaixo (vale por 1 hora):

				%s/redefinir-senha?token=%s

				%s
				""".formatted(u.getNome(), abertura, webUrl, token, fecho)));
	}

	/** Redefine a senha e devolve o id do usuário (para encerrar as sessões dele). */
	public UUID redefinirSenha(String tokenPuro, String novaSenha) {
		var token = tokenValido(tokenPuro, TipoToken.REDEFINIR_SENHA);
		var u = usuario(token.getUsuarioId());
		validarSenha(novaSenha, u.getEmail(), "novaSenha");
		u.trocarSenha(senhas.encode(novaSenha), agora());
		// Quem abriu o link do e-mail provou que o e-mail é dele.
		u.verificarEmail(agora());
		token.usar(agora());
		auditar(u, "conta.senha_redefinida", "Criou uma senha nova pelo link do e-mail");
		return u.getId();
	}

	public UsuarioResposta atualizarPerfil(UUID usuarioId, PerfilPedido pedido) {
		var u = usuario(usuarioId);
		u.atualizarPerfil(pedido.segmentoNegocio(), pedido.nomeNegocio(), pedido.objetivo(), pedido.familiaridade(),
				agora());
		return UsuarioResposta.de(u);
	}

	public void trocarSenha(UUID usuarioId, String senhaAtual, String novaSenha) {
		var u = usuario(usuarioId);
		if (!senhas.matches(senhaAtual, u.getSenhaHash())) {
			throw ErroApi.invalido("senhaAtual", "A senha atual não confere.");
		}
		if (senhas.matches(novaSenha, u.getSenhaHash())) {
			throw ErroApi.invalido("novaSenha", "Escolha uma senha diferente da atual.");
		}
		validarSenha(novaSenha, u.getEmail(), "novaSenha");
		u.trocarSenha(senhas.encode(novaSenha), agora());
		auditar(u, "conta.senha_trocada", "Trocou a senha");
	}

	// --- Perfil ------------------------------------------------------------------

	public UsuarioResposta editarConta(UUID usuarioId, EdicaoContaPedido p) {
		var u = usuario(usuarioId);
		boolean marketingAntes = u.isAceitouMarketing();
		u.editar(p.nome(), p.segmentoNegocio(), p.nomeNegocio(), p.cidade(), p.telefone(), p.aceitouMarketing(), agora());
		// Consentimento de marketing (LGPD): fica registrado quando muda.
		if (u.isAceitouMarketing() != marketingAntes) {
			auditar(u, "conta.marketing", u.isAceitouMarketing() ? "Aceitou receber e-mails de novidades"
					: "Deixou de receber e-mails de novidades");
		}
		return UsuarioResposta.de(u);
	}

	/** Troca de e-mail: só vale depois do clique no link enviado ao endereço novo. */
	public void pedirTrocaDeEmail(UUID usuarioId, String novoEmail, String senha) {
		var u = usuario(usuarioId);
		var chave = "troca-email:" + usuarioId;
		limitador.verificar(chave, LIMITE_EMAILS);
		limitador.registrarFalha(chave);
		if (!senhas.matches(senha, u.getSenhaHash())) {
			throw ErroApi.invalido("senha", "A senha não confere.");
		}
		var novo = normalizar(novoEmail);
		if (novo.equals(u.getEmail())) {
			throw ErroApi.invalido("novoEmail", "Este já é o seu e-mail.");
		}
		if (usuarios.existsByEmail(novo)) {
			throw ErroApi.conflito("novoEmail", "Já existe uma conta com este e-mail.");
		}
		u.pedirTrocaDeEmail(novo, agora());
		var token = emitir(u, TipoToken.TROCAR_EMAIL, VALIDADE_VERIFICACAO);
		enviar(new Email(novo, "Confirme seu novo e-mail na PotencIA", """
				Olá, %s.

				Você pediu para entrar na PotencIA com este e-mail. Para confirmar, abra o link
				abaixo (vale por 48 horas):

				%s/confirmar-email?token=%s

				Até lá, o e-mail antigo continua valendo. Se não foi você, ignore este e-mail.
				""".formatted(u.getNome(), webUrl, token)));
	}

	/** Confirma o e-mail novo, avisa o antigo e encerra as sessões (entra-se de novo com o novo). */
	public void confirmarTrocaDeEmail(String tokenPuro) {
		var token = tokenValido(tokenPuro, TipoToken.TROCAR_EMAIL);
		var u = usuario(token.getUsuarioId());
		if (u.getEmailNovo() == null) {
			throw ErroApi.invalido("Este link é inválido ou já expirou. Peça um novo.");
		}
		if (usuarios.existsByEmail(u.getEmailNovo())) {
			throw ErroApi.conflito(null, "Já existe uma conta com este e-mail.");
		}
		var antigo = u.getEmail();
		u.confirmarTrocaDeEmail(agora());
		token.usar(agora());
		usuarios.flush();
		enviar(new Email(antigo, "Seu e-mail na PotencIA foi alterado", """
				Olá, %s.

				O e-mail de acesso da sua conta na PotencIA mudou para %s.

				Se não foi você, responda este e-mail agora para a gente proteger a sua conta.
				""".formatted(u.getNome(), u.getEmail())));
		auditar(u, "conta.email_trocado", "Trocou o e-mail de acesso");
		sessoes.encerrarTodas(u.getId());
	}

	// --- LGPD ------------------------------------------------------------------------

	/** Os dados da conta (para "Baixar meus dados"). */
	@Transactional(readOnly = true)
	public Map<String, Object> exportar(UUID usuarioId) {
		var u = usuario(usuarioId);
		var dados = new LinkedHashMap<String, Object>();
		dados.put("nome", u.getNome());
		dados.put("email", u.getEmail());
		dados.put("papel", u.getPapel());
		dados.put("emailVerificadoEm", u.getEmailVerificadoEm());
		dados.put("segmentoNegocio", u.getSegmentoNegocio());
		dados.put("nomeNegocio", u.getNomeNegocio());
		dados.put("cidade", u.getCidade());
		dados.put("telefone", u.getTelefone());
		dados.put("objetivo", u.getObjetivo());
		dados.put("familiaridade", u.getFamiliaridade());
		dados.put("aceitouTermosEm", u.getAceitouTermosEm());
		dados.put("aceitouMarketing", u.isAceitouMarketing());
		dados.put("contaGoogleLigada", u.getGoogleSub() != null);
		dados.put("ultimoAcessoEm", u.getUltimoAcessoEm());
		dados.put("criadoEm", u.getCriadoEm());
		return dados;
	}

	/** Confirmação da exclusão: a pessoa digita o próprio e-mail. */
	@Transactional(readOnly = true)
	public void conferirConfirmacao(UUID usuarioId, String emailDigitado) {
		if (!normalizar(emailDigitado).equals(usuario(usuarioId).getEmail())) {
			throw ErroApi.invalido("email", "Digite o e-mail da sua conta, exatamente como aparece no perfil.");
		}
	}

	/** Último passo da exclusão: anonimiza a conta e encerra todas as sessões. */
	public void anonimizar(UUID usuarioId) {
		var u = usuario(usuarioId);
		var agora = agora();
		for (var tipo : TipoToken.values()) {
			tokens.invalidarAbertos(usuarioId, tipo, agora);
		}
		u.anonimizar(senhas.encode(Tokens.gerar().puro()), agora);
		auditar(u, "conta.excluida", "Excluiu a conta (dados pessoais anonimizados)");
		sessoes.encerrarTodas(usuarioId);
	}

	// --- Login com Google -------------------------------------------------------

	/**
	 * Entra com a conta Google: acha pelo "sub", senão liga à conta de mesmo
	 * e-mail (o Google confirmou o e-mail), senão cria a conta já verificada.
	 */
	public UsuarioSessao entrarComGoogle(String sub, String emailGoogle, boolean emailVerificado, String nome) {
		if (!emailVerificado) {
			throw ErroApi.proibido("O Google ainda não confirmou este e-mail. Entre com e-mail e senha.");
		}
		var agora = agora();
		var emailNormal = normalizar(emailGoogle);
		var u = usuarios.findByGoogleSub(sub).filter(Usuario::isAtivo).orElse(null);
		if (u == null) {
			u = usuarios.findByEmail(emailNormal).filter(Usuario::isAtivo).orElse(null);
			if (u != null) {
				u.ligarGoogle(sub, agora);
				auditar(u, "conta.google_ligado", "Ligou a conta Google");
			}
		}
		if (u == null) {
			var nomeConta = nome == null || nome.isBlank() ? emailNormal.substring(0, emailNormal.indexOf('@')) : nome;
			u = Usuario.novo(nomeConta, emailNormal, senhas.encode(Tokens.gerar().puro()), Papel.USUARIO, false, agora);
			u.ligarGoogle(sub, agora);
			u.verificarEmail(agora);
			// Id já atribuído: o save faz merge e devolve a cópia gerenciada.
			u = usuarios.saveAndFlush(u);
			auditar(u, "conta.criada_google", "Criou a conta com o Google");
		}
		if (u.isBloqueado()) {
			throw ErroApi.proibido("Esta conta está bloqueada. Fale com o suporte.");
		}
		u.verificarEmail(agora);
		u.registrarAcesso(agora);
		auditar(u, "conta.login", "Entrou com o Google");
		return u.paraSessao();
	}

	// -------------------------------------------------------------------------

	static String normalizar(String email) {
		return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
	}

	private void validarSenha(String senha, String emailNormal, String campo) {
		var minuscula = senha.toLowerCase(Locale.ROOT);
		if (minuscula.equals(emailNormal) || SENHAS_OBVIAS.contains(minuscula)
				|| minuscula.chars().distinct().count() < 4) {
			throw ErroApi.invalido(campo, "Essa senha é fácil de adivinhar. Misture palavras, números e símbolos.");
		}
	}

	private void enviarVerificacao(Usuario u) {
		var token = emitir(u, TipoToken.VERIFICAR_EMAIL, VALIDADE_VERIFICACAO);
		enviar(new Email(u.getEmail(), "Confirme seu e-mail na PotencIA", """
				Olá, %s.

				Falta só confirmar o seu e-mail. Abra o link abaixo (vale por 48 horas):

				%s/verificar-email?token=%s

				Se você não criou uma conta na PotencIA, ignore este e-mail.
				""".formatted(u.getNome(), webUrl, token)));
	}

	private String emitir(Usuario u, TipoToken tipo, Duration validade) {
		var agora = agora();
		tokens.invalidarAbertos(u.getId(), tipo, agora);
		var gerado = Tokens.gerar();
		tokens.save(TokenConta.novo(u.getId(), tipo, gerado.hash(), agora, agora.plus(validade)));
		return gerado.puro();
	}

	/** Falha no envio não desfaz a operação: o usuário pode pedir o e-mail de novo. */
	private void enviar(Email mensagem) {
		try {
			email.enviar(mensagem);
		}
		catch (RuntimeException e) {
			log.error("Falha ao enviar e-mail \"{}\"", mensagem.assunto(), e);
		}
	}

	private TokenConta tokenValido(String puro, TipoToken tipo) {
		return tokens.findByTokenHash(Tokens.hash(puro))
			.filter(t -> t.isValido(tipo, agora()))
			.orElseThrow(() -> ErroApi.invalido("Este link é inválido ou já expirou. Peça um novo."));
	}

	private Usuario usuario(UUID id) {
		return usuarios.findById(id)
			.filter(Usuario::isAtivo)
			.orElseThrow(() -> ErroApi.naoEncontrado("Conta não encontrada."));
	}

	private static ErroApi emailEmUso() {
		return ErroApi.conflito("email", "Já existe uma conta com este e-mail. Entre ou recupere a senha.");
	}

	private void auditar(Usuario u, String acao, String resumo) {
		eventos.publishEvent(EventoAuditoria.de(new Autor(u.getId(), u.getEmail()), acao, "usuario", u.getId(), resumo));
	}

	private Instant agora() {
		return relogio.instant();
	}

}
