package br.com.potencia.contas;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import br.com.potencia.compartilhado.ErroApi;

/**
 * Janela deslizante em memória: no máximo N falhas por chave em 15 minutos.
 * Vale para uma instância da API; com várias instâncias, trocar por Redis.
 */
@Component
class LimitadorTentativas {

	static final Duration JANELA = Duration.ofMinutes(15);

	private final Map<String, Deque<Instant>> falhas = new ConcurrentHashMap<>();

	private final Clock relogio;

	LimitadorTentativas(Clock relogio) {
		this.relogio = relogio;
	}

	/** Lança 429 se a chave já atingiu o limite dentro da janela. */
	void verificar(String chave, int limite) {
		var fila = falhas.get(chave);
		if (fila == null) {
			return;
		}
		var agora = relogio.instant();
		synchronized (fila) {
			descartarAntigas(fila, agora);
			if (fila.size() >= limite) {
				long segundos = Duration.between(agora, fila.peekFirst().plus(JANELA)).toSeconds();
				throw ErroApi.muitasTentativas(Math.max(1, segundos));
			}
		}
	}

	void registrarFalha(String chave) {
		var agora = relogio.instant();
		var fila = falhas.computeIfAbsent(chave, k -> new ArrayDeque<>());
		synchronized (fila) {
			descartarAntigas(fila, agora);
			fila.addLast(agora);
		}
	}

	void zerar(String chave) {
		falhas.remove(chave);
	}

	private static void descartarAntigas(Deque<Instant> fila, Instant agora) {
		while (!fila.isEmpty() && !fila.peekFirst().plus(JANELA).isAfter(agora)) {
			fila.pollFirst();
		}
	}

}
