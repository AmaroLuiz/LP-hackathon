package br.com.potencia.midia;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Assina (HMAC-SHA256) as URLs de envio e as URLs de arquivos privados, para
 * que só valham pelo tempo e para o arquivo em que foram emitidas.
 */
@Component
class Assinador {

	private static final Logger log = LoggerFactory.getLogger(Assinador.class);

	private final byte[] chave;

	Assinador(@Value("${potencia.arquivos.segredo:}") String segredo) {
		if (segredo.isBlank()) {
			// Sem segredo configurado (local): um aleatório por partida. URLs antigas deixam de valer ao reiniciar.
			chave = new byte[32];
			new SecureRandom().nextBytes(chave);
			log.warn("ARQUIVOS_SEGREDO não definido: usando um segredo temporário (só para desenvolvimento).");
		}
		else {
			chave = segredo.getBytes(StandardCharsets.UTF_8);
		}
	}

	String assinar(String texto) {
		try {
			var mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(chave, "HmacSHA256"));
			return Base64.getUrlEncoder()
				.withoutPadding()
				.encodeToString(mac.doFinal(texto.getBytes(StandardCharsets.UTF_8)));
		}
		catch (GeneralSecurityException e) {
			throw new IllegalStateException(e);
		}
	}

	/** Comparação em tempo constante. */
	boolean confere(String texto, String assinatura) {
		if (assinatura == null) {
			return false;
		}
		return MessageDigest.isEqual(assinar(texto).getBytes(StandardCharsets.US_ASCII),
				assinatura.getBytes(StandardCharsets.US_ASCII));
	}

}
