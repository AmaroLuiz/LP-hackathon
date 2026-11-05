package br.com.potencia.catalogo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

/** Perfil público de quem ensina. Não é uma conta: os cursos são criados pelos admins. */
@Entity
public class Instrutor {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String nome;

	private String titulo;

	private String bio;

	private String fotoUrl;

	protected Instrutor() {
	}

	static Instrutor novo(String nome, String titulo, String bio, String fotoUrl) {
		var i = new Instrutor();
		i.editar(nome, titulo, bio, fotoUrl);
		return i;
	}

	void editar(String nome, String titulo, String bio, String fotoUrl) {
		this.nome = nome.strip();
		this.titulo = vazioParaNulo(titulo);
		this.bio = vazioParaNulo(bio);
		this.fotoUrl = vazioParaNulo(fotoUrl);
	}

	private static String vazioParaNulo(String s) {
		return s == null || s.isBlank() ? null : s.strip();
	}

	public Long getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public String getTitulo() {
		return titulo;
	}

	public String getBio() {
		return bio;
	}

	public String getFotoUrl() {
		return fotoUrl;
	}

}
