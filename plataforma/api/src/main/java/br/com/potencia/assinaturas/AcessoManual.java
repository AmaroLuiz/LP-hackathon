package br.com.potencia.assinaturas;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Acesso concedido por um admin a um curso ou a todos os cursos de um plano. */
@Entity
class AcessoManual {

	@Id
	private UUID id;

	private UUID usuarioId;

	private Long cursoId;

	private String planoId;

	private String motivo;

	private UUID concedidoPor;

	private Instant expiraEm;

	private Instant criadoEm;

	protected AcessoManual() {
	}

	static AcessoManual novo(UUID usuarioId, Long cursoId, String planoId, String motivo, UUID concedidoPor,
			Instant expiraEm, Instant agora) {
		var a = new AcessoManual();
		a.id = UUID.randomUUID();
		a.usuarioId = usuarioId;
		a.cursoId = cursoId;
		a.planoId = planoId;
		a.motivo = motivo.strip();
		a.concedidoPor = concedidoPor;
		a.expiraEm = expiraEm;
		a.criadoEm = agora;
		return a;
	}

	boolean isVigente(Instant agora) {
		return expiraEm == null || agora.isBefore(expiraEm);
	}

	UUID getId() {
		return id;
	}

	Long getCursoId() {
		return cursoId;
	}

	String getPlanoId() {
		return planoId;
	}

	Instant getExpiraEm() {
		return expiraEm;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	String getMotivo() {
		return motivo;
	}

	UUID getConcedidoPor() {
		return concedidoPor;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}
