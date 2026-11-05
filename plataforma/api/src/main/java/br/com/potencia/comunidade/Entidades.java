package br.com.potencia.comunidade;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

// Entidades do módulo de comunidade (perguntas por aula e avaliações de curso).

@Entity
class Pergunta {

	@Id
	private UUID id;

	private Long aulaId;

	private Long cursoId;

	private UUID usuarioId;

	private String titulo;

	private String texto;

	/** Escondida pela moderação (ou apagada por quem perguntou). */
	private boolean oculta;

	private Instant criadoEm;

	private Instant atualizadoEm;

	protected Pergunta() {
	}

	static Pergunta nova(long aulaId, long cursoId, UUID usuarioId, String titulo, String texto, Instant agora) {
		var p = new Pergunta();
		p.id = UUID.randomUUID();
		p.aulaId = aulaId;
		p.cursoId = cursoId;
		p.usuarioId = usuarioId;
		p.titulo = titulo.strip();
		p.texto = texto.strip();
		p.criadoEm = agora;
		p.atualizadoEm = agora;
		return p;
	}

	void ocultar(boolean oculta, Instant agora) {
		this.oculta = oculta;
		atualizadoEm = agora;
	}

	void tocar(Instant agora) {
		atualizadoEm = agora;
	}

	UUID getId() {
		return id;
	}

	Long getAulaId() {
		return aulaId;
	}

	Long getCursoId() {
		return cursoId;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	String getTitulo() {
		return titulo;
	}

	String getTexto() {
		return texto;
	}

	boolean isOculta() {
		return oculta;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

	Instant getAtualizadoEm() {
		return atualizadoEm;
	}

}

@Entity
class Resposta {

	@Id
	private UUID id;

	private UUID perguntaId;

	private UUID usuarioId;

	private boolean daEquipe;

	private String texto;

	private boolean oculta;

	private Instant criadoEm;

	protected Resposta() {
	}

	static Resposta nova(UUID perguntaId, UUID usuarioId, boolean daEquipe, String texto, Instant agora) {
		var r = new Resposta();
		r.id = UUID.randomUUID();
		r.perguntaId = perguntaId;
		r.usuarioId = usuarioId;
		r.daEquipe = daEquipe;
		r.texto = texto.strip();
		r.criadoEm = agora;
		return r;
	}

	void ocultar(boolean oculta) {
		this.oculta = oculta;
	}

	UUID getId() {
		return id;
	}

	UUID getPerguntaId() {
		return perguntaId;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	boolean isDaEquipe() {
		return daEquipe;
	}

	String getTexto() {
		return texto;
	}

	boolean isOculta() {
		return oculta;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}

@Entity
@Table(name = "pergunta_util")
@IdClass(PerguntaUtil.Chave.class)
class PerguntaUtil {

	record Chave(UUID perguntaId, UUID usuarioId) implements Serializable {

		Chave() {
			this(null, null);
		}

	}

	@Id
	private UUID perguntaId;

	@Id
	private UUID usuarioId;

	protected PerguntaUtil() {
	}

	PerguntaUtil(UUID perguntaId, UUID usuarioId) {
		this.perguntaId = perguntaId;
		this.usuarioId = usuarioId;
	}

	UUID getPerguntaId() {
		return perguntaId;
	}

}

@Entity
class Avaliacao {

	enum Status {

		PUBLICADA, OCULTA

	}

	@Id
	private UUID id;

	private UUID usuarioId;

	private Long cursoId;

	private int nota;

	private String comentario;

	@Enumerated(EnumType.STRING)
	private Status status;

	private String respostaEquipe;

	private Instant respondidaEm;

	private Instant criadoEm;

	private Instant atualizadoEm;

	protected Avaliacao() {
	}

	static Avaliacao nova(UUID usuarioId, long cursoId, Instant agora) {
		var a = new Avaliacao();
		a.id = UUID.randomUUID();
		a.usuarioId = usuarioId;
		a.cursoId = cursoId;
		a.status = Status.PUBLICADA;
		a.criadoEm = agora;
		a.atualizadoEm = agora;
		return a;
	}

	void editar(int nota, String comentario, Instant agora) {
		this.nota = nota;
		this.comentario = comentario == null || comentario.isBlank() ? null : comentario.strip();
		atualizadoEm = agora;
	}

	void moderar(Status status, Instant agora) {
		this.status = status;
		atualizadoEm = agora;
	}

	void responder(String texto, Instant agora) {
		respostaEquipe = texto == null || texto.isBlank() ? null : texto.strip();
		respondidaEm = respostaEquipe == null ? null : agora;
		atualizadoEm = agora;
	}

	UUID getId() {
		return id;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	Long getCursoId() {
		return cursoId;
	}

	int getNota() {
		return nota;
	}

	String getComentario() {
		return comentario;
	}

	Status getStatus() {
		return status;
	}

	String getRespostaEquipe() {
		return respostaEquipe;
	}

	Instant getRespondidaEm() {
		return respondidaEm;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

	Instant getAtualizadoEm() {
		return atualizadoEm;
	}

}
