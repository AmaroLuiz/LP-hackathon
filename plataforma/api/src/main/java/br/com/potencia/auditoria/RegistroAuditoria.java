package br.com.potencia.auditoria;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Uma linha da auditoria: quem, o quê, quando, e os campos antes/depois (JSON). */
@Entity
@Table(name = "auditoria")
class RegistroAuditoria {

	@Id
	private UUID id;

	private Instant quando;

	private UUID autorId;

	private String autorEmail;

	private String acao;

	private String alvoTipo;

	private String alvoId;

	private String resumo;

	private String antes;

	private String depois;

	private String ip;

	protected RegistroAuditoria() {
	}

	static RegistroAuditoria novo(Instant quando, UUID autorId, String autorEmail, String acao, String alvoTipo,
			String alvoId, String resumo, String antes, String depois, String ip) {
		var r = new RegistroAuditoria();
		r.id = UUID.randomUUID();
		r.quando = quando;
		r.autorId = autorId;
		r.autorEmail = autorEmail;
		r.acao = acao;
		r.alvoTipo = alvoTipo;
		r.alvoId = alvoId;
		r.resumo = resumo;
		r.antes = antes;
		r.depois = depois;
		r.ip = ip;
		return r;
	}

	/** Edições seguidas do mesmo item viram um registro só (o "antes" fica o original). */
	void juntar(Instant quando, String resumo, String antes, String depois) {
		this.quando = quando;
		this.resumo = resumo;
		this.antes = antes;
		this.depois = depois;
	}

	UUID getId() {
		return id;
	}

	Instant getQuando() {
		return quando;
	}

	UUID getAutorId() {
		return autorId;
	}

	String getAutorEmail() {
		return autorEmail;
	}

	String getAcao() {
		return acao;
	}

	String getAlvoTipo() {
		return alvoTipo;
	}

	String getAlvoId() {
		return alvoId;
	}

	String getResumo() {
		return resumo;
	}

	String getAntes() {
		return antes;
	}

	String getDepois() {
		return depois;
	}

	String getIp() {
		return ip;
	}

}
