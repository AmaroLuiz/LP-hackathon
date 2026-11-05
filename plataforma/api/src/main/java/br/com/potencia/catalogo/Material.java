package br.com.potencia.catalogo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

/** Arquivo para baixar numa aula. Privado: o link é assinado na hora, só para quem tem acesso. */
@Entity
public class Material {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	private Aula aula;

	private String nome;

	/** Chave do arquivo no armazenamento (privado/materiais/...). */
	@Column(name = "arquivo_url")
	private String chave;

	private Long tamanhoBytes;

	private String tipoMime;

	private int ordem;

	protected Material() {
	}

	static Material novo(Aula aula, int ordem, String nome, String chave, Long tamanhoBytes, String tipoMime) {
		var m = new Material();
		m.aula = aula;
		m.ordem = ordem;
		m.nome = nome.strip();
		m.chave = chave;
		m.tamanhoBytes = tamanhoBytes;
		m.tipoMime = tipoMime;
		return m;
	}

	public Long getId() {
		return id;
	}

	public Aula getAula() {
		return aula;
	}

	public String getNome() {
		return nome;
	}

	public String getChave() {
		return chave;
	}

	public Long getTamanhoBytes() {
		return tamanhoBytes;
	}

	public String getTipoMime() {
		return tipoMime;
	}

	public int getOrdem() {
		return ordem;
	}

}
