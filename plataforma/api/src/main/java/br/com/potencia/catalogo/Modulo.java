package br.com.potencia.catalogo;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

@Entity
public class Modulo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	private Curso curso;

	private int ordem;

	private String titulo;

	private String descricao;

	@OneToMany(mappedBy = "modulo")
	@OrderBy("ordem")
	private List<Aula> aulas = new ArrayList<>();

	protected Modulo() {
	}

	static Modulo novo(Curso curso, int ordem, String titulo, String descricao) {
		var m = new Modulo();
		m.curso = curso;
		m.ordem = ordem;
		m.editar(titulo, descricao);
		return m;
	}

	void editar(String titulo, String descricao) {
		this.titulo = titulo.strip();
		this.descricao = descricao == null || descricao.isBlank() ? null : descricao.strip();
	}

	void reordenar(int ordem) {
		this.ordem = ordem;
	}

	public Long getId() {
		return id;
	}

	public Curso getCurso() {
		return curso;
	}

	public int getOrdem() {
		return ordem;
	}

	public String getTitulo() {
		return titulo;
	}

	public String getDescricao() {
		return descricao;
	}

	public List<Aula> getAulas() {
		return aulas;
	}

}
