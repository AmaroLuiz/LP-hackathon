package br.com.potencia.assinaturas;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;

@Entity
public class Plano {

	/** Identificador legível: essencial, completo, negocio. */
	@Id
	private String id;

	private String nome;

	private int precoCentavos;

	/** Pessoas da equipe que podem usar a mesma assinatura. */
	private int maxPessoas;

	private int ordem;

	@ElementCollection
	@CollectionTable(name = "plano_item", joinColumns = @JoinColumn(name = "plano_id"))
	@OrderColumn(name = "ordem")
	@Column(name = "texto")
	private List<String> itens = new ArrayList<>();

	/** Ids dos cursos liberados pelo plano (o módulo não depende das entidades do catálogo). */
	@ElementCollection
	@CollectionTable(name = "plano_curso", joinColumns = @JoinColumn(name = "plano_id"))
	@Column(name = "curso_id")
	private Set<Long> cursos = new HashSet<>();

	/** Fora de venda: some do site; quem já assina continua. */
	private boolean ativo;

	protected Plano() {
	}

	void editar(String nome, int precoCentavos, int maxPessoas, List<String> itens, boolean ativo, Set<Long> cursos) {
		this.nome = nome.strip();
		this.precoCentavos = precoCentavos;
		this.maxPessoas = maxPessoas;
		var copia = List.copyOf(itens);
		this.itens.clear();
		this.itens.addAll(copia);
		this.ativo = ativo;
		this.cursos.clear();
		this.cursos.addAll(cursos);
	}

	public boolean isAtivo() {
		return ativo;
	}

	/** Plano para mais de uma pessoa (o titular convida a equipe). */
	public boolean temEquipe() {
		return maxPessoas > 1;
	}

	public String getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public int getPrecoCentavos() {
		return precoCentavos;
	}

	public int getMaxPessoas() {
		return maxPessoas;
	}

	public int getOrdem() {
		return ordem;
	}

	public List<String> getItens() {
		return itens;
	}

	public Set<Long> getCursos() {
		return cursos;
	}

	public boolean liberaCurso(long cursoId) {
		return cursos.contains(cursoId);
	}

	void definirCurso(long cursoId, boolean incluir) {
		if (incluir) {
			cursos.add(cursoId);
		}
		else {
			cursos.remove(cursoId);
		}
	}

}
