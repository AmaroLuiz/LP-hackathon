package br.com.potencia.compartilhado;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Uma ação que precisa ficar registrada (ações de admin e eventos sensíveis de
 * conta). Publicada pelo módulo que fez a ação; o módulo de auditoria grava na
 * mesma transação.
 *
 * @param acao código estável, ex.: "curso.publicado", "usuario.papel"
 * @param antes campos como estavam (só os que mudaram)
 * @param depois campos como ficaram (só os que mudaram)
 */
public record EventoAuditoria(Autor autor, String acao, String alvoTipo, String alvoId, String resumo,
		Map<String, Object> antes, Map<String, Object> depois) {

	public static EventoAuditoria de(Autor autor, String acao, String alvoTipo, Object alvoId, String resumo) {
		return new EventoAuditoria(autor, acao, alvoTipo, String.valueOf(alvoId), resumo, Map.of(), Map.of());
	}

	/** Guarda só os campos que mudaram entre os dois retratos. */
	public static EventoAuditoria alteracao(Autor autor, String acao, String alvoTipo, Object alvoId, String resumo,
			Map<String, Object> antes, Map<String, Object> depois) {
		var a = new LinkedHashMap<String, Object>();
		var d = new LinkedHashMap<String, Object>();
		depois.forEach((campo, valor) -> {
			var anterior = antes.get(campo);
			if (!Objects.equals(anterior, valor)) {
				a.put(campo, anterior);
				d.put(campo, valor);
			}
		});
		return new EventoAuditoria(autor, acao, alvoTipo, String.valueOf(alvoId), resumo, a, d);
	}

	public boolean semMudancas() {
		return antes.isEmpty() && depois.isEmpty();
	}

}
