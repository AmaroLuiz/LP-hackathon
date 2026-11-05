package br.com.potencia.contas;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.support.GenericConversionService;
import org.springframework.core.serializer.support.DeserializingConverter;
import org.springframework.core.serializer.support.SerializingConverter;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
class SessaoConfig {

	/** Cookie da sessão: httpOnly, SameSite=Lax e Secure em produção. */
	@Bean
	CookieSerializer cookieSerializer(@Value("${potencia.sessao.cookie-segura}") boolean segura) {
		var cookie = new DefaultCookieSerializer();
		cookie.setCookieName("POTENCIA_SESSAO");
		cookie.setUseHttpOnlyCookie(true);
		cookie.setSameSite("Lax");
		cookie.setUseSecureCookie(segura);
		cookie.setRememberMeRequestAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR);
		return cookie;
	}

	/**
	 * Lê as sessões com o classloader da aplicação. Sem isso, o DevTools (que
	 * recarrega as classes) quebra a leitura do usuário salvo na sessão.
	 */
	@Bean("springSessionConversionService")
	GenericConversionService conversaoDaSessao() {
		var conversao = new GenericConversionService();
		conversao.addConverter(Object.class, byte[].class, new SerializingConverter());
		conversao.addConverter(byte[].class, Object.class, new DeserializingConverter(getClass().getClassLoader()));
		return conversao;
	}

}
