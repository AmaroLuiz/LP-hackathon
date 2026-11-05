package br.com.potencia.midia;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;

/**
 * Formatos aceitos nos envios, reconhecidos pelos primeiros bytes do arquivo
 * (não pela extensão nem pelo tipo que o navegador declarou). SVG não entra:
 * pode carregar script.
 */
enum Formato {

	WEBP("webp", "image/webp"), JPEG("jpg", "image/jpeg"), PNG("png", "image/png"), VTT("vtt", "text/vtt"),
	PDF("pdf", "application/pdf"), ZIP("zip", "application/zip"),
	DOCX("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
	XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
	PPTX("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
	MP4("mp4", "video/mp4"), MOV("mov", "video/quicktime"), WEBM("webm", "video/webm");

	/** Bytes lidos do começo do arquivo para reconhecer o formato. */
	static final int CABECA = 32;

	final String extensao;

	final String tipoMime;

	Formato(String extensao, String tipoMime) {
		this.extensao = extensao;
		this.tipoMime = tipoMime;
	}

	boolean isImagem() {
		return this == WEBP || this == JPEG || this == PNG;
	}

	static Formato porExtensao(String extensao) {
		for (var f : values()) {
			if (f.extensao.equals(extensao)) {
				return f;
			}
		}
		return null;
	}

	/**
	 * @param nomeOriginal só desempata os formatos que são ZIP por dentro (docx, xlsx, pptx)
	 * @return o formato, ou nulo se não for nenhum dos aceitos
	 */
	static Formato detectar(byte[] b, String nomeOriginal) {
		if (comeca(b, 0, "RIFF") && comeca(b, 8, "WEBP")) {
			return WEBP;
		}
		if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
			return JPEG;
		}
		if (b.length >= 8 && Arrays.equals(Arrays.copyOf(b, 8),
				new byte[] { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' })) {
			return PNG;
		}
		if (comeca(b, 0, "%PDF-")) {
			return PDF;
		}
		if (b.length >= 4 && b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4) {
			var ext = extensao(nomeOriginal);
			return switch (ext) {
				case "docx" -> DOCX;
				case "xlsx" -> XLSX;
				case "pptx" -> PPTX;
				default -> ZIP;
			};
		}
		if (comeca(b, 4, "ftyp")) {
			return comeca(b, 8, "qt  ") ? MOV : MP4;
		}
		if (b.length >= 4 && (b[0] & 0xFF) == 0x1A && (b[1] & 0xFF) == 0x45 && (b[2] & 0xFF) == 0xDF
				&& (b[3] & 0xFF) == 0xA3) {
			return WEBM;
		}
		int inicio = b.length >= 3 && (b[0] & 0xFF) == 0xEF && (b[1] & 0xFF) == 0xBB && (b[2] & 0xFF) == 0xBF ? 3 : 0;
		if (comeca(b, inicio, "WEBVTT")) {
			return VTT;
		}
		return null;
	}

	static String extensao(String nome) {
		if (nome == null) {
			return "";
		}
		int ponto = nome.lastIndexOf('.');
		return ponto < 0 ? "" : nome.substring(ponto + 1).toLowerCase(Locale.ROOT);
	}

	private static boolean comeca(byte[] b, int desde, String texto) {
		var esperado = texto.getBytes(StandardCharsets.US_ASCII);
		if (b.length < desde + esperado.length) {
			return false;
		}
		return Arrays.equals(Arrays.copyOfRange(b, desde, desde + esperado.length), esperado);
	}

}
