package br.com.potencia.midia;

import java.time.Instant;

/**
 * Quem entrega os vídeos das aulas. Escolhido por {@code potencia.video.provedor}:
 * "exemplo" (local: um vídeo de amostra para todas as aulas, ou o vídeo enviado
 * pelo painel). O provedor real (Bunny Stream ou Panda Video, decisão em aberto)
 * gera uma URL assinada e curta, e recebe o envio direto do painel.
 *
 * Só é chamado depois de o acesso à aula ser verificado.
 */
public interface ProvedorVideo {

	/** Id de vídeo enviado pelo painel e guardado no armazenamento local. */
	String PREFIXO_LOCAL = "local:";

	/**
	 * @param videoId identificador do vídeo no provedor (pode ser nulo no provedor de exemplo)
	 */
	Reproducao reproducao(String videoId);

	/** Se aceita vídeos enviados pelo painel para o armazenamento local (só desenvolvimento). */
	default boolean recebeEnvioLocal() {
		return false;
	}

	/**
	 * @param url endereço para tocar o vídeo (assinado, quando o provedor suporta)
	 * @param tipo "arquivo" (MP4 tocado no player do site) ou "hls"
	 * @param expiraEm quando a URL deixa de valer (nulo se não expira)
	 */
	record Reproducao(String url, String tipo, String poster, Instant expiraEm) {
	}

}
