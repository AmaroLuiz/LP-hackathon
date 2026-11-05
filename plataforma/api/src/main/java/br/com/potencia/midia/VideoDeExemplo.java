package br.com.potencia.midia;

import java.time.Clock;
import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * SÓ PARA DESENVOLVIMENTO: toda aula toca o mesmo vídeo de amostra, servido
 * pelo site (web/public/videos). Serve para testar player, progresso e conclusão.
 * Vídeos enviados pelo painel ficam no armazenamento local e tocam por URL
 * assinada de 2 horas, como fará o provedor real.
 */
@Component
@ConditionalOnProperty(name = "potencia.video.provedor", havingValue = "exemplo")
class VideoDeExemplo implements ProvedorVideo {

	static final Duration VALIDADE = Duration.ofHours(2);

	private final Envios envios;

	private final Clock relogio;

	VideoDeExemplo(Envios envios, Clock relogio) {
		this.envios = envios;
		this.relogio = relogio;
	}

	@Override
	public Reproducao reproducao(String videoId) {
		if (videoId != null && videoId.startsWith(PREFIXO_LOCAL)) {
			var chave = videoId.substring(PREFIXO_LOCAL.length());
			return new Reproducao(envios.urlPrivada(chave, VALIDADE, null), "arquivo", null,
					relogio.instant().plus(VALIDADE));
		}
		return new Reproducao("/videos/exemplo.mp4", "arquivo", "/videos/exemplo-poster.webp", null);
	}

	@Override
	public boolean recebeEnvioLocal() {
		return true;
	}

}
