package br.com.potencia.catalogo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;

@Entity
public class Curso {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String slug;

	/** Aparece como expoente dourado na capa e no título. */
	private int numero;

	private String titulo;

	private String subtitulo;

	/** Markdown. */
	private String descricao;

	private String capaUrl;

	private String capaAlt;

	private String videoPreviaId;

	@Enumerated(EnumType.STRING)
	private Nivel nivel;

	private String idioma;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	private Categoria categoria;

	private String resultadoFinal;

	@Enumerated(EnumType.STRING)
	private StatusCurso status;

	private Instant publicadoEm;

	private Instant atualizadoEm;

	private BigDecimal notaMedia;

	private int totalAvaliacoes;

	private int totalAlunos;

	private boolean certificadoHabilitado;

	/** Aparece em "Em destaque" na home. */
	private boolean destaque;

	/** Carga horária do certificado. Nula: soma a duração das aulas publicadas. */
	private Integer cargaHorariaMinutos;

	private String seoTitulo;

	private String seoDescricao;

	@ElementCollection
	@CollectionTable(name = "curso_ferramenta", joinColumns = @JoinColumn(name = "curso_id"))
	@OrderColumn(name = "ordem")
	@Column(name = "texto")
	private List<String> ferramentas = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "curso_aprendizado", joinColumns = @JoinColumn(name = "curso_id"))
	@OrderColumn(name = "ordem")
	@Column(name = "texto")
	private List<String> oQueAprende = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "curso_requisito", joinColumns = @JoinColumn(name = "curso_id"))
	@OrderColumn(name = "ordem")
	@Column(name = "texto")
	private List<String> requisitos = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "curso_publico", joinColumns = @JoinColumn(name = "curso_id"))
	@OrderColumn(name = "ordem")
	@Column(name = "texto")
	private List<String> paraQuemE = new ArrayList<>();

	@ManyToMany
	@JoinTable(name = "curso_instrutor", joinColumns = @JoinColumn(name = "curso_id"),
			inverseJoinColumns = @JoinColumn(name = "instrutor_id"))
	@OrderColumn(name = "ordem")
	private List<Instrutor> instrutores = new ArrayList<>();

	@OneToMany(mappedBy = "curso")
	@OrderBy("ordem")
	private List<Modulo> modulos = new ArrayList<>();

	protected Curso() {
	}

	/** Curso novo criado pelo painel: rascunho, só com o essencial. */
	static Curso novo(String slug, int numero, String titulo, Categoria categoria, List<Instrutor> instrutores,
			Instant agora) {
		var c = new Curso();
		c.slug = slug;
		c.numero = numero;
		c.titulo = titulo.strip();
		c.subtitulo = "";
		c.resultadoFinal = "";
		c.nivel = Nivel.INICIANTE;
		c.idioma = "pt-BR";
		c.categoria = categoria;
		c.status = StatusCurso.RASCUNHO;
		c.notaMedia = BigDecimal.ZERO;
		c.certificadoHabilitado = true;
		c.instrutores.addAll(instrutores);
		c.atualizadoEm = agora;
		return c;
	}

	/** Tudo o que as abas "Página do curso", "Capa" e "Acesso" editam. */
	record Alteracao(String slug, int numero, String titulo, String subtitulo, String descricao, String capaUrl,
			String capaAlt, Nivel nivel, String idioma, List<String> ferramentas, List<String> oQueAprende,
			List<String> requisitos, List<String> paraQuemE, String resultadoFinal, boolean destaque,
			boolean certificadoHabilitado, Integer cargaHorariaMinutos, String seoTitulo, String seoDescricao) {
	}

	void editar(Alteracao a, Categoria categoria, List<Instrutor> instrutores, Instant agora) {
		slug = a.slug();
		numero = a.numero();
		titulo = a.titulo();
		subtitulo = a.subtitulo();
		descricao = a.descricao();
		capaUrl = a.capaUrl();
		capaAlt = a.capaAlt();
		nivel = a.nivel();
		idioma = a.idioma();
		this.categoria = categoria;
		trocar(ferramentas, a.ferramentas());
		trocar(oQueAprende, a.oQueAprende());
		trocar(requisitos, a.requisitos());
		trocar(paraQuemE, a.paraQuemE());
		resultadoFinal = a.resultadoFinal();
		// Arquivado não volta para a home.
		destaque = a.destaque() && status != StatusCurso.ARQUIVADO;
		certificadoHabilitado = a.certificadoHabilitado();
		cargaHorariaMinutos = a.cargaHorariaMinutos();
		seoTitulo = a.seoTitulo();
		seoDescricao = a.seoDescricao();
		var novos = List.copyOf(instrutores);
		this.instrutores.clear();
		this.instrutores.addAll(novos);
		atualizadoEm = agora;
	}

	/** Cópia para começar um curso parecido: rascunho, sem alunos nem avaliações. */
	Curso duplicar(String novoSlug, int novoNumero, String novoTitulo, Instant agora) {
		var c = novo(novoSlug, novoNumero, novoTitulo, categoria, instrutores, agora);
		c.editar(new Alteracao(novoSlug, novoNumero, novoTitulo, subtitulo, descricao, capaUrl, capaAlt, nivel, idioma,
				ferramentas, oQueAprende, requisitos, paraQuemE, resultadoFinal, false, certificadoHabilitado,
				cargaHorariaMinutos, seoTitulo, seoDescricao), categoria, instrutores, agora);
		return c;
	}

	void publicar(Instant agora) {
		status = StatusCurso.PUBLICADO;
		if (publicadoEm == null) {
			publicadoEm = agora;
		}
		atualizadoEm = agora;
	}

	void despublicar(Instant agora) {
		status = StatusCurso.RASCUNHO;
		atualizadoEm = agora;
	}

	void arquivar(Instant agora) {
		status = StatusCurso.ARQUIVADO;
		destaque = false;
		atualizadoEm = agora;
	}

	/** O currículo mudou (aula nova, ordem, edição): a página mostra a data nova. */
	void tocar(Instant agora) {
		atualizadoEm = agora;
	}

	private static void trocar(List<String> lista, List<String> novos) {
		var copia = List.copyOf(novos);
		lista.clear();
		lista.addAll(copia);
	}

	void registrarAluno() {
		totalAlunos++;
	}

	/** Média e total das avaliações publicadas (calculados no módulo de comunidade). */
	void atualizarNota(BigDecimal media, int total) {
		notaMedia = media;
		totalAvaliacoes = total;
	}

	public boolean isPublicado() {
		return status == StatusCurso.PUBLICADO;
	}

	public Long getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public int getNumero() {
		return numero;
	}

	public String getTitulo() {
		return titulo;
	}

	public String getSubtitulo() {
		return subtitulo;
	}

	public String getDescricao() {
		return descricao;
	}

	public String getCapaUrl() {
		return capaUrl;
	}

	public String getCapaAlt() {
		return capaAlt;
	}

	public String getVideoPreviaId() {
		return videoPreviaId;
	}

	public Nivel getNivel() {
		return nivel;
	}

	public String getIdioma() {
		return idioma;
	}

	public Categoria getCategoria() {
		return categoria;
	}

	public String getResultadoFinal() {
		return resultadoFinal;
	}

	public StatusCurso getStatus() {
		return status;
	}

	public Instant getPublicadoEm() {
		return publicadoEm;
	}

	public Instant getAtualizadoEm() {
		return atualizadoEm;
	}

	public BigDecimal getNotaMedia() {
		return notaMedia;
	}

	public int getTotalAvaliacoes() {
		return totalAvaliacoes;
	}

	public int getTotalAlunos() {
		return totalAlunos;
	}

	public boolean isDestaque() {
		return destaque;
	}

	public boolean isCertificadoHabilitado() {
		return certificadoHabilitado;
	}

	public Integer getCargaHorariaMinutos() {
		return cargaHorariaMinutos;
	}

	public String getSeoTitulo() {
		return seoTitulo;
	}

	public String getSeoDescricao() {
		return seoDescricao;
	}

	public List<String> getFerramentas() {
		return ferramentas;
	}

	public List<String> getOQueAprende() {
		return oQueAprende;
	}

	public List<String> getRequisitos() {
		return requisitos;
	}

	public List<String> getParaQuemE() {
		return paraQuemE;
	}

	public List<Instrutor> getInstrutores() {
		return instrutores;
	}

	public List<Modulo> getModulos() {
		return modulos;
	}

}
