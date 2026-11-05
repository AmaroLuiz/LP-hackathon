package br.com.potencia;

import java.io.IOException;
import java.time.Clock;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfException;

import br.com.potencia.contas.ContaService;
import br.com.potencia.contas.UsuarioSessao;

/**
 * Sessão no servidor (Spring Session JDBC) com cookie httpOnly; o navegador fala
 * com a API pelo rewrite do Next, no mesmo domínio. CSRF no padrão SPA: cookie
 * XSRF-TOKEN legível pelo front, devolvido no cabeçalho X-XSRF-TOKEN.
 */
@Configuration
class SecurityConfig {

	@Bean
	SecurityFilterChain api(HttpSecurity http, ContaService contas) throws Exception {
		// Webhook do gateway: chamado de fora, sem sessão; protegido pelo token no cabeçalho.
		http.csrf(csrf -> csrf.spa().ignoringRequestMatchers("/api/webhooks/**"))
			.authorizeHttpRequests(rotas -> rotas
				.requestMatchers(HttpMethod.GET, "/api/cursos", "/api/cursos/*", "/api/categorias", "/api/planos",
						"/api/aulas/*/previa", "/api/certificados/*", "/api/arquivos/**", "/api/equipe/convites/*", "/api/condicao-fundador",
						"/api/cursos/*/avaliacoes", "/api/depoimentos", "/api/dev/emails", "/api/cupons/*")
				.permitAll()
				.requestMatchers(HttpMethod.POST, "/api/webhooks/*")
				.permitAll()
				.requestMatchers("/api/auth/**")
				.permitAll()
				// Admin com senha provisória só entra no painel depois de trocá-la.
				.requestMatchers("/api/admin/**")
				.access((autenticacao, contexto) -> new AuthorizationDecision(
						autenticacao.get() != null && autenticacao.get().getPrincipal() instanceof UsuarioSessao u
								&& u.isAdmin() && !contas.precisaTrocarSenha(u.id())))
				.requestMatchers("/actuator/health")
				.permitAll()
				.anyRequest()
				.authenticated())
			.exceptionHandling(erros -> erros
				.authenticationEntryPoint((req, res, e) -> problema(res, 401, "Não autenticado",
						"Entre na sua conta para continuar."))
				.accessDeniedHandler((req, res, e) -> {
					if (e instanceof CsrfException) {
						problema(res, 403, "Acesso negado", "Sua sessão expirou. Recarregue a página e tente de novo.");
					}
					else {
						problema(res, 403, "Acesso negado", "Você não tem permissão para fazer isso.");
					}
				}))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.requestCache(AbstractHttpConfigurer::disable);
		return http.build();
	}

	/** bcrypt hoje, com prefixo {id}: dá para trocar de algoritmo sem invalidar senhas antigas. */
	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	Clock relogio() {
		return Clock.systemUTC();
	}

	private static void problema(HttpServletResponse res, int status, String titulo, String detalhe)
			throws IOException {
		res.setStatus(status);
		res.setContentType("application/problem+json");
		res.setCharacterEncoding("UTF-8");
		res.getWriter()
			.write("{\"type\":\"about:blank\",\"title\":\"%s\",\"status\":%d,\"detail\":\"%s\"}".formatted(titulo,
					status, detalhe));
	}

}
