package br.com.potencia.midia;

import java.util.EnumSet;
import java.util.Set;

/** O que pode ser enviado pelo painel, para onde vai e com que limites. */
public enum TipoEnvio {

	/** Capa do curso, já recortada em 16:9 no navegador. Pública. */
	CAPA("publico/capas", 5L << 20, EnumSet.of(Formato.WEBP, Formato.JPEG, Formato.PNG)),

	/** Foto do instrutor, quadrada. Pública. */
	FOTO("publico/fotos", 5L << 20, EnumSet.of(Formato.WEBP, Formato.JPEG, Formato.PNG)),

	/** Legenda (WebVTT) de uma aula. */
	LEGENDA("publico/legendas", 1L << 20, EnumSet.of(Formato.VTT)),

	/** Material para baixar. Privado: só sai com URL assinada, depois de checar o acesso. */
	MATERIAL("privado/materiais", 50L << 20, EnumSet.of(Formato.PDF, Formato.ZIP, Formato.DOCX, Formato.XLSX,
			Formato.PPTX, Formato.PNG, Formato.JPEG, Formato.WEBP)),

	/** Vídeo de aula (só no provedor local; o provedor real recebe o envio direto). */
	VIDEO("privado/videos", 2048L << 20, EnumSet.of(Formato.MP4, Formato.MOV, Formato.WEBM));


	final String pasta;

	final long tamanhoMaximo;

	final Set<Formato> formatos;

	TipoEnvio(String pasta, long tamanhoMaximo, Set<Formato> formatos) {
		this.pasta = pasta;
		this.tamanhoMaximo = tamanhoMaximo;
		this.formatos = formatos;
	}

	public long getTamanhoMaximo() {
		return tamanhoMaximo;
	}

	boolean isPublico() {
		return pasta.startsWith("publico/");
	}

}
