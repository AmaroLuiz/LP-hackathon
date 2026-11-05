package br.com.potencia.aprendizado;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

// Entidades do módulo de aprendizado. Ficam juntas porque são pequenas e só
// este módulo as usa (os outros falam com o AprendizadoService).

@Entity
class Matricula {

	@Id
	private UUID id;

	private UUID usuarioId;

	private Long cursoId;

	private Instant iniciadaEm;

	private Instant atualizadaEm;

	private Instant concluidaEm;

	private Long ultimaAulaId;

	protected Matricula() {
	}

	static Matricula nova(UUID usuarioId, long cursoId, Instant agora) {
		var m = new Matricula();
		m.id = UUID.randomUUID();
		m.usuarioId = usuarioId;
		m.cursoId = cursoId;
		m.iniciadaEm = agora;
		m.atualizadaEm = agora;
		return m;
	}

	void abriuAula(long aulaId, Instant agora) {
		ultimaAulaId = aulaId;
		atualizadaEm = agora;
	}

	void concluir(Instant agora) {
		if (concluidaEm == null) {
			concluidaEm = agora;
		}
		atualizadaEm = agora;
	}

	/** Aula desmarcada depois de concluir: volta para "em andamento" (o certificado continua válido). */
	void reabrir(Instant agora) {
		concluidaEm = null;
		atualizadaEm = agora;
	}

	Long getCursoId() {
		return cursoId;
	}

	Instant getIniciadaEm() {
		return iniciadaEm;
	}

	Instant getAtualizadaEm() {
		return atualizadaEm;
	}

	Instant getConcluidaEm() {
		return concluidaEm;
	}

	Long getUltimaAulaId() {
		return ultimaAulaId;
	}

}

@Entity
@IdClass(ProgressoAula.Chave.class)
class ProgressoAula {

	record Chave(UUID usuarioId, Long aulaId) implements Serializable {

		// O Hibernate precisa de um construtor sem argumentos na classe de chave.
		Chave() {
			this(null, null);
		}

	}

	@Id
	private UUID usuarioId;

	@Id
	private Long aulaId;

	private int posicaoSegundos;

	private Instant concluidaEm;

	private Instant atualizadoEm;

	protected ProgressoAula() {
	}

	static ProgressoAula novo(UUID usuarioId, long aulaId, Instant agora) {
		var p = new ProgressoAula();
		p.usuarioId = usuarioId;
		p.aulaId = aulaId;
		p.atualizadoEm = agora;
		return p;
	}

	void posicao(int segundos, Instant agora) {
		posicaoSegundos = Math.max(0, segundos);
		atualizadoEm = agora;
	}

	void concluida(boolean sim, Instant agora) {
		concluidaEm = sim ? (concluidaEm == null ? agora : concluidaEm) : null;
		atualizadoEm = agora;
	}

	Long getAulaId() {
		return aulaId;
	}

	int getPosicaoSegundos() {
		return posicaoSegundos;
	}

	boolean isConcluida() {
		return concluidaEm != null;
	}

}

@Entity
class Anotacao {

	@Id
	private UUID id;

	private UUID usuarioId;

	private Long aulaId;

	private int posicaoSegundos;

	private String texto;

	private Instant criadoEm;

	private Instant atualizadoEm;

	protected Anotacao() {
	}

	static Anotacao nova(UUID usuarioId, long aulaId, int posicaoSegundos, String texto, Instant agora) {
		var a = new Anotacao();
		a.id = UUID.randomUUID();
		a.usuarioId = usuarioId;
		a.aulaId = aulaId;
		a.posicaoSegundos = Math.max(0, posicaoSegundos);
		a.texto = texto.strip();
		a.criadoEm = agora;
		a.atualizadoEm = agora;
		return a;
	}

	void editar(String novoTexto, Instant agora) {
		texto = novoTexto.strip();
		atualizadoEm = agora;
	}

	UUID getId() {
		return id;
	}

	Long getAulaId() {
		return aulaId;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	int getPosicaoSegundos() {
		return posicaoSegundos;
	}

	String getTexto() {
		return texto;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}

@Entity
@Table(name = "lista_desejos")
@IdClass(ItemListaDesejos.Chave.class)
class ItemListaDesejos {

	record Chave(UUID usuarioId, Long cursoId) implements Serializable {

		Chave() {
			this(null, null);
		}

	}

	@Id
	private UUID usuarioId;

	@Id
	private Long cursoId;

	private Instant criadoEm;

	protected ItemListaDesejos() {
	}

	ItemListaDesejos(UUID usuarioId, long cursoId, Instant agora) {
		this.usuarioId = usuarioId;
		this.cursoId = cursoId;
		this.criadoEm = agora;
	}

	Long getCursoId() {
		return cursoId;
	}

}

@Entity
class Certificado {

	@Id
	private UUID id;

	private String codigo;

	private UUID usuarioId;

	private Long cursoId;

	private String nomeAluno;

	private String tituloCurso;

	private int cargaHorariaMinutos;

	private Instant emitidoEm;

	protected Certificado() {
	}

	static Certificado novo(String codigo, UUID usuarioId, long cursoId, String nomeAluno, String tituloCurso,
			int cargaHorariaMinutos, Instant agora) {
		var c = new Certificado();
		c.id = UUID.randomUUID();
		c.codigo = codigo;
		c.usuarioId = usuarioId;
		c.cursoId = cursoId;
		c.nomeAluno = nomeAluno;
		c.tituloCurso = tituloCurso;
		c.cargaHorariaMinutos = cargaHorariaMinutos;
		c.emitidoEm = agora;
		return c;
	}

	String getCodigo() {
		return codigo;
	}

	Long getCursoId() {
		return cursoId;
	}

	String getNomeAluno() {
		return nomeAluno;
	}

	String getTituloCurso() {
		return tituloCurso;
	}

	int getCargaHorariaMinutos() {
		return cargaHorariaMinutos;
	}

	Instant getEmitidoEm() {
		return emitidoEm;
	}

}
