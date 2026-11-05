package br.com.potencia.compartilhado;

import org.springframework.http.HttpStatus;

/**
 * Erro com status HTTP e mensagem pronta para o usuário (em português).
 * Vira um Problem Details (RFC 9457) no {@link ManipuladorDeErros}.
 */
public class ErroApi extends RuntimeException {

	private final HttpStatus status;

	/** Campo do formulário ao qual o erro se refere (opcional). */
	private final String campo;

	/** Segundos até poder tentar de novo (só em 429). */
	private final Long tenteEmSegundos;

	/** Código estável para o front decidir o que mostrar (ex.: SEM_ACESSO). */
	private final String codigo;

	private ErroApi(HttpStatus status, String mensagem, String campo, Long tenteEmSegundos) {
		this(status, mensagem, campo, tenteEmSegundos, null);
	}

	private ErroApi(HttpStatus status, String mensagem, String campo, Long tenteEmSegundos, String codigo) {
		super(mensagem);
		this.status = status;
		this.campo = campo;
		this.tenteEmSegundos = tenteEmSegundos;
		this.codigo = codigo;
	}

	public static ErroApi proibido(String codigo, String mensagem) {
		return new ErroApi(HttpStatus.FORBIDDEN, mensagem, null, null, codigo);
	}

	public static ErroApi invalido(String mensagem) {
		return new ErroApi(HttpStatus.BAD_REQUEST, mensagem, null, null);
	}

	public static ErroApi invalido(String campo, String mensagem) {
		return new ErroApi(HttpStatus.BAD_REQUEST, mensagem, campo, null);
	}

	public static ErroApi naoAutenticado(String mensagem) {
		return new ErroApi(HttpStatus.UNAUTHORIZED, mensagem, null, null);
	}

	public static ErroApi proibido(String mensagem) {
		return new ErroApi(HttpStatus.FORBIDDEN, mensagem, null, null);
	}

	public static ErroApi naoEncontrado(String mensagem) {
		return new ErroApi(HttpStatus.NOT_FOUND, mensagem, null, null);
	}

	public static ErroApi conflito(String campo, String mensagem) {
		return new ErroApi(HttpStatus.CONFLICT, mensagem, campo, null);
	}

	public static ErroApi indisponivel(String mensagem) {
		return new ErroApi(HttpStatus.SERVICE_UNAVAILABLE, mensagem, null, null);
	}

	public static ErroApi muitasTentativas(long segundos) {
		long minutos = Math.max(1, (segundos + 59) / 60);
		return new ErroApi(HttpStatus.TOO_MANY_REQUESTS,
				"Muitas tentativas seguidas. Tente de novo em " + minutos + (minutos == 1 ? " minuto." : " minutos."),
				null, segundos);
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getCampo() {
		return campo;
	}

	public String getCodigo() {
		return codigo;
	}

	public Long getTenteEmSegundos() {
		return tenteEmSegundos;
	}

}
