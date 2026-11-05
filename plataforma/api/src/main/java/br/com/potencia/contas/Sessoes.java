package br.com.potencia.contas;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;
import org.springframework.stereotype.Component;

/** Abre e encerra sessões (Spring Session JDBC, cookie httpOnly). */
@Component
class Sessoes {

	static final Duration LEMBRAR_POR = Duration.ofDays(30);

	private final SecurityContextRepository contextos = new HttpSessionSecurityContextRepository();

	private final FindByIndexNameSessionRepository<? extends Session> repositorio;

	Sessoes(FindByIndexNameSessionRepository<? extends Session> repositorio) {
		this.repositorio = repositorio;
	}

	void iniciar(UsuarioSessao usuario, boolean lembrar, HttpServletRequest req, HttpServletResponse res) {
		var autenticacao = UsernamePasswordAuthenticationToken.authenticated(usuario, null,
				List.of(new SimpleGrantedAuthority("ROLE_" + usuario.papel().name())));
		var contexto = SecurityContextHolder.createEmptyContext();
		contexto.setAuthentication(autenticacao);
		SecurityContextHolder.setContext(contexto);

		// Sessão nova a cada login: impede fixação de sessão.
		var anterior = req.getSession(false);
		if (anterior != null) {
			anterior.invalidate();
		}
		if (lembrar) {
			// Faz o cookie durar o mesmo que a sessão (em vez de sumir ao fechar o navegador).
			req.setAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR, true);
		}
		HttpSession sessao = req.getSession(true);
		if (lembrar) {
			sessao.setMaxInactiveInterval((int) LEMBRAR_POR.toSeconds());
		}
		sessao.setAttribute(APARELHO, aparelho(req.getHeader("User-Agent")));
		contextos.saveContext(contexto, req, res);
	}

	static final String APARELHO = "potencia.aparelho";

	/** "Chrome no Windows": o suficiente para a pessoa reconhecer a sessão no perfil. */
	static String aparelho(String agente) {
		if (agente == null || agente.isBlank()) {
			return "Aparelho desconhecido";
		}
		String navegador = agente.contains("Edg/") ? "Edge"
				: agente.contains("OPR/") ? "Opera"
				: agente.contains("Firefox/") ? "Firefox"
				: agente.contains("Chrome/") ? "Chrome"
				: agente.contains("Safari/") ? "Safari" : "Navegador";
		String sistema = agente.contains("Android") ? "Android"
				: agente.contains("iPhone") || agente.contains("iPad") ? "iPhone/iPad"
				: agente.contains("Windows") ? "Windows"
				: agente.contains("Mac OS") ? "Mac"
				: agente.contains("Linux") ? "Linux" : null;
		return sistema == null ? navegador : navegador + " no " + sistema;
	}

	/**
	 * O id da sessão vale como senha: para fora sai só um apelido (hash), que
	 * serve para encerrar aquela sessão sem revelar o id.
	 */
	static String apelido(String idSessao) {
		return Tokens.hash(idSessao).substring(0, 24);
	}

	List<ContasDtos.SessaoAtiva> listar(UUID usuarioId, HttpServletRequest req) {
		var atual = req.getSession(false);
		var idAtual = atual == null ? null : atual.getId();
		return repositorio.findByPrincipalName(usuarioId.toString())
			.values()
			.stream()
			.filter(s -> !s.isExpired())
			.map(s -> new ContasDtos.SessaoAtiva(apelido(s.getId()),
					s.getAttribute(APARELHO) instanceof String a ? a : "Aparelho desconhecido", s.getCreationTime(),
					s.getLastAccessedTime(), s.getId().equals(idAtual)))
			.sorted(java.util.Comparator.comparing(ContasDtos.SessaoAtiva::ultimoUso).reversed())
			.toList();
	}

	/** Encerra uma sessão do próprio usuário pelo apelido. */
	boolean encerrarPorApelido(UUID usuarioId, String apelido) {
		var alvo = repositorio.findByPrincipalName(usuarioId.toString())
			.keySet()
			.stream()
			.filter(id -> apelido(id).equals(apelido))
			.findFirst();
		alvo.ifPresent(repositorio::deleteById);
		return alvo.isPresent();
	}

	void encerrar(HttpServletRequest req) {
		SecurityContextHolder.clearContext();
		var sessao = req.getSession(false);
		if (sessao != null) {
			sessao.invalidate();
		}
	}

	/** Encerra as sessões do usuário em outros aparelhos, mantendo a atual. */
	void encerrarOutras(UUID usuarioId, HttpServletRequest req) {
		var atual = req.getSession(false);
		var idAtual = atual == null ? null : atual.getId();
		repositorio.findByPrincipalName(usuarioId.toString())
			.keySet()
			.stream()
			.filter(id -> !id.equals(idAtual))
			.toList()
			.forEach(repositorio::deleteById);
	}

	void encerrarTodas(UUID usuarioId) {
		repositorio.findByPrincipalName(usuarioId.toString()).keySet().stream().toList().forEach(repositorio::deleteById);
	}

	/** Sessões abertas do usuário (sem o id: o id da sessão vale como senha e nunca sai daqui). */
	List<Session> ativas(UUID usuarioId) {
		return repositorio.findByPrincipalName(usuarioId.toString())
			.values()
			.stream()
			.filter(s -> !s.isExpired())
			.map(Session.class::cast)
			.toList();
	}

}
