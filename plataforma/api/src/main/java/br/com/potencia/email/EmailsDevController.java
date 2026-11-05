package br.com.potencia.email;

import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.email.EnviadorEmail.Email;

/**
 * Só no ambiente local (potencia.dev.emails=true e provedor "log"): os testes de
 * ponta a ponta leem aqui o link de verificação, sem caixa de e-mail de verdade.
 */
@RestController
@ConditionalOnProperty(name = "potencia.dev.emails", havingValue = "true")
class EmailsDevController {

	private final ObjectProvider<EmailNoLog> caixa;

	EmailsDevController(ObjectProvider<EmailNoLog> caixa) {
		this.caixa = caixa;
	}

	@GetMapping("/api/dev/emails")
	List<Email> emails(@RequestParam String para) {
		var c = caixa.getIfAvailable();
		return c == null ? List.of() : c.recentesPara(para);
	}

}
