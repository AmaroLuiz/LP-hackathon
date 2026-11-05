package br.com.potencia.midia;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import javax.imageio.ImageIO;

/** Largura e altura de uma imagem, lidas do cabeçalho (sem decodificar a imagem toda). */
record Dimensoes(int largura, int altura) {

	double proporcao() {
		return (double) largura / altura;
	}

	static Optional<Dimensoes> ler(Path arquivo, Formato formato) {
		try {
			return switch (formato) {
				case WEBP -> webp(arquivo);
				case JPEG, PNG -> imageIo(arquivo);
				default -> Optional.empty();
			};
		}
		catch (IOException | RuntimeException e) {
			return Optional.empty();
		}
	}

	private static Optional<Dimensoes> imageIo(Path arquivo) throws IOException {
		try (var entrada = ImageIO.createImageInputStream(arquivo.toFile())) {
			var leitores = ImageIO.getImageReaders(entrada);
			if (!leitores.hasNext()) {
				return Optional.empty();
			}
			var leitor = leitores.next();
			try {
				leitor.setInput(entrada);
				return Optional.of(new Dimensoes(leitor.getWidth(0), leitor.getHeight(0)));
			}
			finally {
				leitor.dispose();
			}
		}
	}

	/** WebP: VP8 (com perdas), VP8L (sem perdas) ou VP8X (estendido). */
	private static Optional<Dimensoes> webp(Path arquivo) throws IOException {
		byte[] b = new byte[30];
		try (InputStream in = Files.newInputStream(arquivo)) {
			if (in.readNBytes(b, 0, b.length) < b.length) {
				return Optional.empty();
			}
		}
		var bloco = new String(b, 12, 4, java.nio.charset.StandardCharsets.US_ASCII);
		return switch (bloco) {
			case "VP8 " -> Optional.of(new Dimensoes(le16(b, 26) & 0x3FFF, le16(b, 28) & 0x3FFF));
			case "VP8L" -> {
				int bits = (b[21] & 0xFF) | (b[22] & 0xFF) << 8 | (b[23] & 0xFF) << 16 | (b[24] & 0xFF) << 24;
				yield Optional.of(new Dimensoes(1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF)));
			}
			case "VP8X" -> Optional.of(new Dimensoes(1 + le24(b, 24), 1 + le24(b, 27)));
			default -> Optional.empty();
		};
	}

	private static int le16(byte[] b, int i) {
		return (b[i] & 0xFF) | (b[i + 1] & 0xFF) << 8;
	}

	private static int le24(byte[] b, int i) {
		return (b[i] & 0xFF) | (b[i + 1] & 0xFF) << 8 | (b[i + 2] & 0xFF) << 16;
	}

}
