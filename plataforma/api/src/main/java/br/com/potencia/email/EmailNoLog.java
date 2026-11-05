package br.com.potencia.email;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Desenvolvimento: o e-mail inteiro (com o link) vai para o log da API, e os
 * últimos ficam em memória para os testes de ponta a ponta lerem.
 * Nunca use em produção: os links de verificação e de senha ficariam nos logs.
 */
@Component
@ConditionalOnProperty(name = "potencia.email.provedor", havingValue = "log")
class EmailNoLog implements EnviadorEmail {

	private static final Logger log = LoggerFactory.getLogger(EmailNoLog.class);

	private static final int GUARDAR = 200;

	private final Deque<Email> recentes = new ArrayDeque<>();

	@Override
	public void enviar(Email email) {
		synchronized (recentes) {
			recentes.addFirst(email);
			while (recentes.size() > GUARDAR) {
				recentes.removeLast();
			}
		}
		log.info("""

				==== E-MAIL (só no log, ambiente de desenvolvimento) ====
				Para: {}
				Assunto: {}

				{}
				=========================================================""", email.para(), email.assunto(),
				email.texto());
	}

	/** Os mais recentes primeiro. */
	List<Email> recentesPara(String para) {
		synchronized (recentes) {
			return recentes.stream().filter(e -> e.para().equalsIgnoreCase(para)).toList();
		}
	}

}
