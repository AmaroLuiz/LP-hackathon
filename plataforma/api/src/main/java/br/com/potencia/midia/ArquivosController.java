package br.com.potencia.midia;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.midia.Envios.ArquivoEnviado;
import br.com.potencia.midia.Envios.PreparoEnvio;

/**
 * Envio pelo painel (/api/admin/uploads, só admin) e entrega dos arquivos
 * (/api/arquivos/..., públicos ou com URL assinada).
 */
@RestController
class ArquivosController {

	private final Envios envios;

	ArquivosController(Envios envios) {
		this.envios = envios;
	}

	record EnvioPedido(@NotNull(message = "Informe o tipo do arquivo.") TipoEnvio tipo,
			@NotBlank(message = "Informe o nome do arquivo.") @Size(max = 200, message = "Nome longo demais.") String nome,
			@NotNull(message = "Informe o tamanho.") @Positive(message = "O arquivo está vazio.") Long tamanho) {
	}

	@PostMapping("/api/admin/uploads")
	PreparoEnvio preparar(@Valid @RequestBody EnvioPedido pedido) {
		return envios.preparar(pedido.tipo(), pedido.nome(), pedido.tamanho());
	}

	/** Recebe o arquivo puro no corpo (não multipart), lido aos poucos direto para o disco. */
	@PutMapping("/api/admin/uploads/{token}")
	@ResponseStatus(HttpStatus.CREATED)
	ArquivoEnviado receber(@PathVariable String token, HttpServletRequest req) throws IOException {
		return envios.receber(token, req.getInputStream());
	}

	@GetMapping("/api/arquivos/{*caminho}")
	ResponseEntity<Resource> arquivo(@PathVariable String caminho, @RequestParam(required = false) Long expira,
			@RequestParam(required = false) String nome, @RequestParam(required = false) String assinatura) {
		var chave = caminho.startsWith("/") ? caminho.substring(1) : caminho;
		var publico = chave.startsWith("publico/");
		var arquivo = publico ? envios.abrirPublico(chave) : envios.abrirPrivado(chave, expira, nome, assinatura);
		if (arquivo.isEmpty()) {
			return ResponseEntity.notFound().build();
		}
		var resposta = ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(Envios.tipoMime(chave)))
			// Nome aleatório e conteúdo que não muda: pode ficar em cache por muito tempo.
			.cacheControl(publico ? CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable()
					: CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate())
			// Nada do que é servido aqui roda como página.
			.header("Content-Security-Policy", "default-src 'none'; sandbox");
		if (nome != null && !nome.isBlank()) {
			resposta.header(HttpHeaders.CONTENT_DISPOSITION,
					ContentDisposition.attachment().filename(nome, StandardCharsets.UTF_8).build().toString());
		}
		return resposta.body(arquivo.get());
	}

}
