package br.com.potencia.contas;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Gera tokens aleatórios (256 bits) e o hash SHA-256 que vai para o banco. */
final class Tokens {

	private static final SecureRandom ALEATORIO = new SecureRandom();

	private Tokens() {
	}

	record Gerado(String puro, String hash) {
	}

	static Gerado gerar() {
		byte[] bytes = new byte[32];
		ALEATORIO.nextBytes(bytes);
		String puro = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		return new Gerado(puro, hash(puro));
	}

	static String hash(String puro) {
		try {
			var digest = MessageDigest.getInstance("SHA-256").digest(puro.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
