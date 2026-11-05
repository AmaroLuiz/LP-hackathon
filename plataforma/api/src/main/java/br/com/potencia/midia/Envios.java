package br.com.potencia.midia;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import br.com.potencia.compartilhado.ErroApi;

/**
 * Envio de arquivos pelo painel e entrega dos arquivos guardados.
 *
 * Envio em dois passos, como num provedor de nuvem: o painel pede uma URL de
 * envio (assinada, vale 30 min, para um tipo e um arquivo) e manda o arquivo
 * para ela. Aqui o arquivo é conferido pelos primeiros bytes (não pela
 * extensão), pelo tamanho e, nas imagens, pela proporção; ganha um nome
 * aleatório e só então é guardado.
 *
 * Arquivos públicos (capas, fotos, legendas) têm URL fixa. Privados (materiais,
 * vídeos locais) só saem por URL assinada e curta, emitida depois de checar o acesso.
 */
@Service
public class Envios {

	static final Duration VALIDADE_ENVIO = Duration.ofMinutes(30);

	private static final double TOLERANCIA_PROPORCAO = 0.02;

	public record PreparoEnvio(String url, String metodo, Instant expiraEm, long tamanhoMaximo) {
	}

	/**
	 * @param chave onde o arquivo ficou guardado
	 * @param url endereço público (nulo nos privados)
	 * @param referencia o que gravar no cadastro: a URL pública, a chave do material
	 * ou o id do vídeo ("local:..." no provedor local)
	 */
	public record ArquivoEnviado(String chave, String url, String referencia, String nome, long tamanhoBytes,
			String tipoMime, Integer largura, Integer altura) {
	}

	private final ObjectProvider<Armazenamento> armazenamento;

	private final ObjectProvider<ProvedorVideo> videos;

	private final Assinador assinador;

	private final Clock relogio;

	Envios(ObjectProvider<Armazenamento> armazenamento, ObjectProvider<ProvedorVideo> videos, Assinador assinador,
			Clock relogio) {
		this.armazenamento = armazenamento;
		this.videos = videos;
		this.assinador = assinador;
		this.relogio = relogio;
	}

	PreparoEnvio preparar(TipoEnvio tipo, String nome, long tamanho) {
		guardador();
		if (tipo == TipoEnvio.VIDEO) {
			var provedor = videos.getIfAvailable();
			if (provedor == null || !provedor.recebeEnvioLocal()) {
				throw ErroApi.indisponivel(
						"O envio de vídeos abre quando o provedor de vídeo for configurado. Por enquanto, informe o id do vídeo.");
			}
		}
		if (tamanho <= 0) {
			throw ErroApi.invalido("tamanho", "O arquivo está vazio.");
		}
		if (tamanho > tipo.tamanhoMaximo) {
			throw ErroApi.invalido("tamanho", "O arquivo passa do limite de " + megas(tipo.tamanhoMaximo) + ".");
		}
		var expira = relogio.instant().plus(VALIDADE_ENVIO);
		var nomeSeguro = nome == null ? "" : nome.strip();
		var carga = tipo.name() + "|" + UUID.randomUUID() + "|" + expira.getEpochSecond() + "|"
				+ Base64.getUrlEncoder().withoutPadding().encodeToString(nomeSeguro.getBytes(StandardCharsets.UTF_8));
		var token = Base64.getUrlEncoder().withoutPadding().encodeToString(carga.getBytes(StandardCharsets.UTF_8)) + "."
				+ assinador.assinar(carga);
		return new PreparoEnvio("/api/admin/uploads/" + token, "PUT", expira, tipo.tamanhoMaximo);
	}

	ArquivoEnviado receber(String token, InputStream corpo) {
		var envio = lerToken(token);
		var tipo = envio.tipo();
		Path temporario = null;
		try {
			temporario = Files.createTempFile("potencia-envio-", ".tmp");
			long tamanho;
			try (var saida = Files.newOutputStream(temporario)) {
				tamanho = copiarComLimite(corpo, saida, tipo.tamanhoMaximo);
			}
			if (tamanho == 0) {
				throw ErroApi.invalido("O arquivo está vazio.");
			}
			byte[] cabeca;
			try (var entrada = Files.newInputStream(temporario)) {
				cabeca = entrada.readNBytes(Formato.CABECA);
			}
			var formato = Formato.detectar(cabeca, envio.nome());
			if (formato == null || !tipo.formatos.contains(formato)) {
				throw ErroApi.invalido("Formato não aceito aqui. " + formatosAceitos(tipo));
			}
			Dimensoes dimensoes = null;
			if (formato.isImagem()) {
				dimensoes = Dimensoes.ler(temporario, formato)
					.orElseThrow(() -> ErroApi.invalido("Não foi possível ler esta imagem. Tente outro arquivo."));
				conferirProporcao(tipo, dimensoes);
			}
			var chave = tipo.pasta + "/" + envio.id() + "." + formato.extensao;
			guardador().guardar(chave, temporario);
			temporario = null;
			var url = tipo.isPublico() ? urlPublica(chave) : null;
			var referencia = switch (tipo) {
				case VIDEO -> ProvedorVideo.PREFIXO_LOCAL + chave;
				case MATERIAL -> chave;
				default -> url;
			};
			return new ArquivoEnviado(chave, url, referencia, envio.nome(), tamanho, formato.tipoMime,
					dimensoes == null ? null : dimensoes.largura(), dimensoes == null ? null : dimensoes.altura());
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		finally {
			if (temporario != null) {
				try {
					Files.deleteIfExists(temporario);
				}
				catch (IOException ignorado) {
					// O sistema limpa a pasta temporária depois.
				}
			}
		}
	}

	public String urlPublica(String chave) {
		return "/api/arquivos/" + chave;
	}

	/**
	 * URL de um arquivo privado que vale só por {@code validade}.
	 * @param nomeParaBaixar nome sugerido ao baixar (nulo: abre no navegador, como um vídeo)
	 */
	public String urlPrivada(String chave, Duration validade, String nomeParaBaixar) {
		long expira = relogio.instant().plus(validade).getEpochSecond();
		var nome = nomeParaBaixar == null ? "" : comExtensao(nomeParaBaixar, chave);
		var url = "/api/arquivos/" + chave + "?expira=" + expira;
		if (!nome.isEmpty()) {
			url += "&nome=" + URLEncoder.encode(nome, StandardCharsets.UTF_8).replace("+", "%20");
		}
		return url + "&assinatura=" + assinador.assinar(chave + "|" + expira + "|" + nome);
	}

	Optional<Resource> abrirPublico(String chave) {
		if (!chave.startsWith("publico/") || !Armazenamento.CHAVE.matcher(chave).matches()) {
			return Optional.empty();
		}
		return guardador().abrir(chave);
	}

	Optional<Resource> abrirPrivado(String chave, Long expira, String nome, String assinatura) {
		if (!chave.startsWith("privado/") || !Armazenamento.CHAVE.matcher(chave).matches() || expira == null) {
			return Optional.empty();
		}
		if (relogio.instant().getEpochSecond() > expira
				|| !assinador.confere(chave + "|" + expira + "|" + (nome == null ? "" : nome), assinatura)) {
			return Optional.empty();
		}
		return guardador().abrir(chave);
	}

	static String tipoMime(String chave) {
		var formato = Formato.porExtensao(Formato.extensao(chave));
		return formato == null ? "application/octet-stream" : formato.tipoMime;
	}

	// -------------------------------------------------------------------------

	private record Envio(TipoEnvio tipo, String id, String nome) {
	}

	private Envio lerToken(String token) {
		var partes = token == null ? new String[0] : token.split("\\.");
		if (partes.length != 2) {
			throw envioInvalido();
		}
		String carga;
		try {
			carga = new String(Base64.getUrlDecoder().decode(partes[0]), StandardCharsets.UTF_8);
		}
		catch (IllegalArgumentException e) {
			throw envioInvalido();
		}
		if (!assinador.confere(carga, partes[1])) {
			throw envioInvalido();
		}
		var campos = carga.split("\\|", -1);
		if (campos.length != 4 || relogio.instant().getEpochSecond() > Long.parseLong(campos[2])) {
			throw envioInvalido();
		}
		var nome = new String(Base64.getUrlDecoder().decode(campos[3]), StandardCharsets.UTF_8);
		return new Envio(TipoEnvio.valueOf(campos[0]), UUID.fromString(campos[1]).toString(), nome);
	}

	private Armazenamento guardador() {
		var a = armazenamento.getIfAvailable();
		if (a == null) {
			throw ErroApi.indisponivel("O envio de arquivos ainda não está configurado neste ambiente.");
		}
		return a;
	}

	private static void conferirProporcao(TipoEnvio tipo, Dimensoes d) {
		if (tipo == TipoEnvio.CAPA
				&& (Math.abs(d.proporcao() - 16.0 / 9.0) > TOLERANCIA_PROPORCAO * 16 / 9 || d.largura() < 640)) {
			throw ErroApi.invalido("A capa precisa estar em 16:9, com pelo menos 640 px de largura. Use o recorte do painel.");
		}
		if (tipo == TipoEnvio.FOTO && (Math.abs(d.proporcao() - 1) > TOLERANCIA_PROPORCAO || d.largura() < 160)) {
			throw ErroApi.invalido("A foto precisa ser quadrada, com pelo menos 160 px. Use o recorte do painel.");
		}
	}

	private static long copiarComLimite(InputStream entrada, java.io.OutputStream saida, long limite)
			throws IOException {
		byte[] buffer = new byte[64 * 1024];
		long total = 0;
		int lidos;
		while ((lidos = entrada.read(buffer)) != -1) {
			total += lidos;
			if (total > limite) {
				throw ErroApi.invalido("O arquivo passa do limite de " + megas(limite) + ".");
			}
			saida.write(buffer, 0, lidos);
		}
		return total;
	}

	private static String formatosAceitos(TipoEnvio tipo) {
		return switch (tipo) {
			case CAPA, FOTO -> "Envie uma imagem WebP, JPEG ou PNG.";
			case LEGENDA -> "Envie uma legenda no formato WebVTT (.vtt).";
			case MATERIAL -> "Envie PDF, ZIP, Word, Excel, PowerPoint ou imagem.";
			case VIDEO -> "Envie um vídeo MP4, MOV ou WebM.";
		};
	}

	private static String comExtensao(String nome, String chave) {
		var ext = Formato.extensao(chave);
		var limpo = nome.strip().replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "");
		return limpo.toLowerCase().endsWith("." + ext) ? limpo : limpo + "." + ext;
	}

	private static String megas(long bytes) {
		long mb = bytes / (1024 * 1024);
		return mb >= 1024 ? (mb / 1024) + " GB" : mb + " MB";
	}

	private static ErroApi envioInvalido() {
		return ErroApi.invalido("Este envio expirou ou é inválido. Escolha o arquivo de novo.");
	}

}
