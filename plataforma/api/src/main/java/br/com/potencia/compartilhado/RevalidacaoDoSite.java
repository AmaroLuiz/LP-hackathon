package br.com.potencia.compartilhado;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import jakarta.annotation.PreDestroy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;

/**
 * Avisa o site (Next) que o conteúdo público mudou: POST /api/revalidar com o
 * segredo compartilhado, que executa revalidateTag nas tags recebidas.
 * Roda depois do commit. Falha não desfaz a edição: o cache do site expira
 * sozinho em algumas horas.
 * <p>
 * O aviso vai duas vezes: na hora e {@link #REPETIR} depois. Se o site estava
 * regerando a página com os dados de antes (uma visita logo depois de outra
 * mudança), essa regeração pode terminar depois do primeiro aviso e gravar o
 * conteúdo velho como novo; o segundo aviso descarta.
 */
@Component
class RevalidacaoDoSite {

	private static final Logger log = LoggerFactory.getLogger(RevalidacaoDoSite.class);

	static final Duration REPETIR = Duration.ofSeconds(5);

	private final ScheduledExecutorService agenda = Executors.newSingleThreadScheduledExecutor(r -> {
		var t = new Thread(r, "revalidacao-do-site");
		t.setDaemon(true);
		return t;
	});

	private final RestClient cliente;

	private final String segredo;

	RevalidacaoDoSite(@Value("${potencia.web-url}") String webUrl,
			@Value("${potencia.revalidar.segredo:}") String segredo) {
		// HTTP/1.1: sem a tentativa de "upgrade" para HTTP/2 sem TLS, que o Next recusa.
		var http = HttpClient.newBuilder()
			.version(HttpClient.Version.HTTP_1_1)
			.connectTimeout(Duration.ofSeconds(2))
			.build();
		var fabrica = new JdkClientHttpRequestFactory(http);
		fabrica.setReadTimeout(Duration.ofSeconds(5));
		this.cliente = RestClient.builder().baseUrl(webUrl).requestFactory(fabrica).build();
		this.segredo = segredo;
	}

	@TransactionalEventListener(fallbackExecution = true)
	void aoMudar(SiteDesatualizado evento) {
		if (segredo.isBlank()) {
			log.debug("Revalidação do site desligada (sem REVALIDAR_SEGREDO): {}", evento.tags());
			return;
		}
		avisar(evento);
		agenda.schedule(() -> avisar(evento), REPETIR.toMillis(), TimeUnit.MILLISECONDS);
	}

	private void avisar(SiteDesatualizado evento) {
		try {
			cliente.post()
				.uri("/api/revalidar")
				.header("X-Revalidar-Segredo", segredo)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("tags", evento.tags()))
				.retrieve()
				.toBodilessEntity();
			log.info("Site revalidado: {}", evento.tags());
		}
		catch (RuntimeException e) {
			log.warn("Não foi possível revalidar o site ({}): {}", evento.tags(), e.getMessage());
		}
	}

	@PreDestroy
	void parar() {
		agenda.shutdownNow();
	}

}
