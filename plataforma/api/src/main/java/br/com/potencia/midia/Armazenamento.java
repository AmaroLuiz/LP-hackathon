package br.com.potencia.midia;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * Onde ficam capas, fotos, legendas, materiais e (no local) vídeos. Escolhido
 * por {@code potencia.armazenamento.provedor}: "local" (disco, desenvolvimento).
 * Em produção entra um Cloudflare R2/S3 com a mesma interface; sem nenhum
 * configurado, o envio responde que não está disponível.
 */
interface Armazenamento {

	/** Chaves válidas: pasta conhecida + UUID + extensão conhecida. Barra caminhos como "../". */
	Pattern CHAVE = Pattern.compile(
			"(publico/(capas|fotos|legendas)|privado/(materiais|videos))/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(webp|jpg|png|vtt|pdf|zip|docx|xlsx|pptx|mp4|mov|webm)");

	/** Move o arquivo temporário (já validado) para a chave. */
	void guardar(String chave, Path arquivo);

	Optional<Resource> abrir(String chave);

}

@Component
@ConditionalOnProperty(name = "potencia.armazenamento.provedor", havingValue = "local")
class ArmazenamentoLocal implements Armazenamento {

	private static final Logger log = LoggerFactory.getLogger(ArmazenamentoLocal.class);

	private final Path raiz;

	ArmazenamentoLocal(@Value("${potencia.armazenamento.pasta:dados/arquivos}") String pasta) {
		this.raiz = Path.of(pasta).toAbsolutePath().normalize();
		log.info("Arquivos enviados ficam em {}", raiz);
	}

	@Override
	public void guardar(String chave, Path arquivo) {
		var destino = caminho(chave);
		try {
			Files.createDirectories(destino.getParent());
			Files.move(arquivo, destino, StandardCopyOption.REPLACE_EXISTING);
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	@Override
	public Optional<Resource> abrir(String chave) {
		var arquivo = caminho(chave);
		return Files.isRegularFile(arquivo) ? Optional.of(new FileSystemResource(arquivo)) : Optional.empty();
	}

	private Path caminho(String chave) {
		if (!CHAVE.matcher(chave).matches()) {
			throw new IllegalArgumentException("Chave de arquivo inválida");
		}
		var caminho = raiz.resolve(chave).normalize();
		if (!caminho.startsWith(raiz)) {
			throw new IllegalArgumentException("Chave de arquivo inválida");
		}
		return caminho;
	}

}
