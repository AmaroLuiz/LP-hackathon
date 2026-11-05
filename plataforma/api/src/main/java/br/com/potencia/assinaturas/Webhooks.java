package br.com.potencia.assinaturas;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import br.com.potencia.compartilhado.ErroApi;

/**
 * Eventos do gateway. Cada evento é guardado antes de processar (o id do
 * evento é a chave: entregue de novo, é ignorado). Se o processamento falha,
 * o evento fica com o erro e o admin reprocessa pelo painel; o gateway sempre
 * recebe 200, para não repetir sem fim.
 */
@Service
class Webhooks {

	private static final Logger log = LoggerFactory.getLogger(Webhooks.class);

	enum Resultado {

		PROCESSADO, REPETIDO, FALHOU

	}

	private final EventoGatewayRepository eventos;

	private final Cobrancas cobrancas;

	private final TransactionTemplate transacao;

	private final Clock relogio;

	private final String gatewayConfigurado;

	private final String token;

	Webhooks(EventoGatewayRepository eventos, Cobrancas cobrancas, PlatformTransactionManager transacoes, Clock relogio,
			@Value("${potencia.pagamentos.gateway:}") String gatewayConfigurado,
			@Value("${potencia.pagamentos.webhook-token:}") String token) {
		this.eventos = eventos;
		this.cobrancas = cobrancas;
		this.transacao = new TransactionTemplate(transacoes);
		this.relogio = relogio;
		this.gatewayConfigurado = gatewayConfigurado;
		this.token = token;
	}

	Resultado receber(String gateway, String tokenRecebido, String corpo) {
		if (gatewayConfigurado.isBlank() || !gatewayConfigurado.equals(gateway)) {
			throw ErroApi.naoEncontrado("Gateway não configurado.");
		}
		if (token.isBlank() || tokenRecebido == null || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),
				tokenRecebido.getBytes(StandardCharsets.UTF_8))) {
			throw ErroApi.naoAutenticado("Token do webhook inválido.");
		}
		LeitorAsaas.Cabecalho cabecalho;
		try {
			cabecalho = LeitorAsaas.cabecalho(corpo);
		}
		catch (IllegalArgumentException e) {
			throw ErroApi.invalido(e.getMessage());
		}
		try {
			transacao.executeWithoutResult(s -> eventos.saveAndFlush(
					EventoGateway.recebido(cabecalho.id(), gateway, cabecalho.tipo(), corpo, relogio.instant())));
		}
		catch (DataIntegrityViolationException repetido) {
			return Resultado.REPETIDO;
		}
		if (eventos.findById(cabecalho.id()).map(e -> e.getProcessadoEm() != null).orElse(false)) {
			return Resultado.REPETIDO;
		}
		return processar(cabecalho.id());
	}

	/** Processa (ou reprocessa) um evento guardado. */
	Resultado processar(String id) {
		try {
			transacao.executeWithoutResult(s -> {
				var evento = eventos.findById(id).orElseThrow(() -> ErroApi.naoEncontrado("Evento não encontrado."));
				if (evento.getProcessadoEm() != null) {
					return;
				}
				var assinaturaId = cobrancas.aplicar(LeitorAsaas.ler(evento.getPayload(), evento.getId()));
				evento.processado(assinaturaId, relogio.instant());
			});
			return Resultado.PROCESSADO;
		}
		catch (ErroApi e) {
			if (e.getStatus() == HttpStatus.NOT_FOUND) {
				throw e;
			}
			return falhou(id, e.getMessage());
		}
		catch (RuntimeException e) {
			log.warn("Evento {} do gateway não foi processado: {}", id, e.getMessage());
			return falhou(id, e.getMessage());
		}
	}

	List<EventoGateway> pendentes() {
		return eventos.findByProcessadoEmIsNullOrderByRecebidoEmDesc();
	}

	private Resultado falhou(String id, String motivo) {
		transacao.executeWithoutResult(s -> eventos.findById(id).ifPresent(e -> e.falhou(motivo, relogio.instant())));
		return Resultado.FALHOU;
	}

}

@RestController
class WebhookController {

	private final Webhooks webhooks;

	WebhookController(Webhooks webhooks) {
		this.webhooks = webhooks;
	}

	/** Público (sem sessão nem CSRF); protegido pelo token que o Asaas manda no cabeçalho. */
	@PostMapping("/api/webhooks/{gateway}")
	ResponseEntity<Void> receber(@PathVariable String gateway,
			@RequestHeader(name = "asaas-access-token", required = false) String token, @RequestBody String corpo) {
		webhooks.receber(gateway, token, corpo);
		return ResponseEntity.ok().build();
	}

}
