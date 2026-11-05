package br.com.potencia.compartilhado;

import java.util.UUID;

/** Quem fez uma ação (para a auditoria). Nulo quando é o próprio sistema. */
public record Autor(UUID id, String email) {

}
