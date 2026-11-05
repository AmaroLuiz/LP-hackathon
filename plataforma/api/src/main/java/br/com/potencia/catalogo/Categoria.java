package br.com.potencia.catalogo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Categoria {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String slug;

	private String nome;

	private String descricao;

	private int ordem;

	protected Categoria() {
	}

	static Categoria nova(String slug, String nome, String descricao, int ordem) {
		var c = new Categoria();
		c.ordem = ordem;
		c.editar(slug, nome, descricao);
		return c;
	}

	void editar(String slug, String nome, String descricao) {
		this.slug = slug;
		this.nome = nome.strip();
		this.descricao = descricao == null || descricao.isBlank() ? null : descricao.strip();
	}

	void reordenar(int ordem) {
		this.ordem = ordem;
	}

	public Long getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public String getNome() {
		return nome;
	}

	public String getDescricao() {
		return descricao;
	}

	public int getOrdem() {
		return ordem;
	}

}
