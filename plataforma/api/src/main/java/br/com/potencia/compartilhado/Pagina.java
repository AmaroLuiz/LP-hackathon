package br.com.potencia.compartilhado;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Resposta paginada padrão: { itens, pagina, tamanho, total }. Página começa em 1. */
public record Pagina<T>(List<T> itens, int pagina, int tamanho, long total) {

	public static final int TAMANHO_PADRAO = 25;

	public static final int TAMANHO_MAXIMO = 100;

	public static <E, T> Pagina<T> de(Page<E> pagina, Function<E, T> conversor) {
		return new Pagina<>(pagina.getContent().stream().map(conversor).toList(), pagina.getNumber() + 1,
				pagina.getSize(), pagina.getTotalElements());
	}

	/** Pedido seguro a partir dos parâmetros da URL (valores fora da faixa viram o padrão). */
	public static PageRequest pedido(Integer pagina, Integer tamanho, Sort ordem) {
		int p = pagina == null || pagina < 1 ? 1 : Math.min(pagina, 10_000);
		int t = tamanho == null || tamanho < 1 ? TAMANHO_PADRAO : Math.min(tamanho, TAMANHO_MAXIMO);
		return PageRequest.of(p - 1, t, ordem);
	}

}
