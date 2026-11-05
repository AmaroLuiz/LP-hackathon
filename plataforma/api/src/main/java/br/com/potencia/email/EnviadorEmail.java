package br.com.potencia.email;

/**
 * Envio de e-mails transacionais. Implementações escolhidas por
 * {@code potencia.email.provedor}: "log" (desenvolvimento) ou "resend" (produção).
 */
public interface EnviadorEmail {

	void enviar(Email email);

	record Email(String para, String assunto, String texto) {
	}

}
