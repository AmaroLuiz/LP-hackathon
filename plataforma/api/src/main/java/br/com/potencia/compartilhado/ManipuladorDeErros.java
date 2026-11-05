package br.com.potencia.compartilhado;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Todos os erros saem como Problem Details (RFC 9457), com mensagens em português.
 * Erros de formulário trazem "campos": { nomeDoCampo: mensagem }.
 */
@RestControllerAdvice
class ManipuladorDeErros extends ResponseEntityExceptionHandler {

	@ExceptionHandler(ErroApi.class)
	ResponseEntity<ProblemDetail> erroApi(ErroApi erro) {
		var problema = ProblemDetail.forStatusAndDetail(erro.getStatus(), erro.getMessage());
		problema.setTitle(titulo(erro.getStatus()));
		if (erro.getCodigo() != null) {
			problema.setProperty("codigo", erro.getCodigo());
		}
		if (erro.getCampo() != null) {
			problema.setProperty("campos", Map.of(erro.getCampo(), erro.getMessage()));
		}
		var resposta = ResponseEntity.status(erro.getStatus());
		if (erro.getTenteEmSegundos() != null) {
			resposta.header(HttpHeaders.RETRY_AFTER, String.valueOf(erro.getTenteEmSegundos()));
		}
		return resposta.body(problema);
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> campos = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors().forEach(e -> campos.putIfAbsent(e.getField(), e.getDefaultMessage()));
		var problema = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Revise os campos destacados.");
		problema.setTitle(titulo(HttpStatus.BAD_REQUEST));
		problema.setProperty("campos", campos);
		return ResponseEntity.badRequest().body(problema);
	}

	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		var problema = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
				"Não foi possível ler os dados enviados.");
		problema.setTitle(titulo(HttpStatus.BAD_REQUEST));
		return ResponseEntity.badRequest().body(problema);
	}

	/**
	 * Demais erros tratados pelo Spring (método não permitido, tipo de mídia, rota
	 * inexistente...): mesmo formato, mas com título e mensagem em português.
	 */
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
			HttpStatusCode statusCode, WebRequest request) {
		// O Spring costuma mandar o corpo nulo e montá-lo depois a partir da exceção.
		Object corpo = body == null && ex instanceof ErrorResponse resposta ? resposta.getBody() : body;
		if (corpo instanceof ProblemDetail problema) {
			problema.setTitle(titulo(statusCode));
			problema.setDetail(detalhePadrao(statusCode));
		}
		return super.handleExceptionInternal(ex, corpo, headers, statusCode, request);
	}

	private static String detalhePadrao(HttpStatusCode status) {
		return switch (status.value()) {
			case 404 -> "Não encontramos o que você procurou.";
			case 405 -> "Esta ação não é permitida aqui.";
			case 406, 415 -> "Formato de dados não aceito.";
			default -> status.is5xxServerError() ? "Erro inesperado. Tente de novo em instantes."
					: "Não foi possível processar o pedido.";
		};
	}

	private static String titulo(HttpStatusCode status) {
		return switch (status.value()) {
			case 400 -> "Dados inválidos";
			case 401 -> "Não autenticado";
			case 403 -> "Acesso negado";
			case 404 -> "Não encontrado";
			case 405 -> "Método não permitido";
			case 409 -> "Conflito";
			case 429 -> "Muitas tentativas";
			case 503 -> "Indisponível";
			default -> "Erro";
		};
	}

}
