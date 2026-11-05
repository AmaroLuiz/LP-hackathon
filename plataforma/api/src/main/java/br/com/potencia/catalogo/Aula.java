package br.com.potencia.catalogo;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

@Entity
public class Aula {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	private Modulo modulo;

	private int ordem;

	private String titulo;

	@Enumerated(EnumType.STRING)
	private TipoAula tipo;

	private String resumo;

	private String conteudo;

	/** Identificador do vídeo no provedor. Só sai depois de checar o acesso do aluno. */
	private String videoId;

	private Integer duracaoSegundos;

	/** Aula de prévia: qualquer visitante assiste. */
	private boolean previa;

	private String legendaUrl;

	private boolean publicada;

	@OneToMany(mappedBy = "aula")
	@OrderBy("ordem, id")
	private List<Material> materiais = new ArrayList<>();

	protected Aula() {
	}

	/** O que a gaveta de edição da aula altera. */
	record Alteracao(String titulo, TipoAula tipo, String resumo, String conteudo, String videoId,
			Integer duracaoSegundos, boolean previa, String legendaUrl, boolean publicada) {
	}

	static Aula nova(Modulo modulo, int ordem, Alteracao a) {
		var aula = new Aula();
		aula.modulo = modulo;
		aula.ordem = ordem;
		aula.editar(a);
		return aula;
	}

	void editar(Alteracao a) {
		titulo = a.titulo().strip();
		tipo = a.tipo();
		resumo = vazioParaNulo(a.resumo());
		conteudo = vazioParaNulo(a.conteudo());
		videoId = vazioParaNulo(a.videoId());
		duracaoSegundos = a.duracaoSegundos();
		previa = a.previa();
		legendaUrl = vazioParaNulo(a.legendaUrl());
		publicada = a.publicada();
	}

	/** Arrastada para outra posição (ou outro módulo) no currículo. */
	void mover(Modulo destino, int novaOrdem) {
		modulo = destino;
		ordem = novaOrdem;
	}

	/** Cópia para um curso duplicado (os materiais apontam para os mesmos arquivos). */
	Alteracao alteracao() {
		return new Alteracao(titulo, tipo, resumo, conteudo, videoId, duracaoSegundos, previa, legendaUrl, publicada);
	}

	private static String vazioParaNulo(String s) {
		return s == null || s.isBlank() ? null : s.strip();
	}

	public Long getId() {
		return id;
	}

	public Modulo getModulo() {
		return modulo;
	}

	public int getOrdem() {
		return ordem;
	}

	public String getTitulo() {
		return titulo;
	}

	public TipoAula getTipo() {
		return tipo;
	}

	public String getResumo() {
		return resumo;
	}

	public String getConteudo() {
		return conteudo;
	}

	public String getVideoId() {
		return videoId;
	}

	public Integer getDuracaoSegundos() {
		return duracaoSegundos;
	}

	public boolean isPrevia() {
		return previa;
	}

	public String getLegendaUrl() {
		return legendaUrl;
	}

	public boolean isPublicada() {
		return publicada;
	}

	public List<Material> getMateriais() {
		return materiais;
	}

}
