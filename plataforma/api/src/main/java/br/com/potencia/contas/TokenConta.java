package br.com.potencia.contas;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

/** Link de uso único enviado por e-mail. Só o hash do token fica no banco. */
@Entity
class TokenConta {

	@Id
	private UUID id;

	private UUID usuarioId;

	@Enumerated(EnumType.STRING)
	private TipoToken tipo;

	private String tokenHash;

	private Instant expiraEm;

	private Instant usadoEm;

	private Instant criadoEm;

	protected TokenConta() {
	}

	static TokenConta novo(UUID usuarioId, TipoToken tipo, String tokenHash, Instant agora, Instant expiraEm) {
		var t = new TokenConta();
		t.id = UUID.randomUUID();
		t.usuarioId = usuarioId;
		t.tipo = tipo;
		t.tokenHash = tokenHash;
		t.criadoEm = agora;
		t.expiraEm = expiraEm;
		return t;
	}

	boolean isValido(TipoToken esperado, Instant agora) {
		return tipo == esperado && usadoEm == null && agora.isBefore(expiraEm);
	}

	void usar(Instant agora) {
		usadoEm = agora;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

}
