package br.com.potencia.contas;

import java.io.Serializable;
import java.util.UUID;

import org.springframework.security.core.AuthenticatedPrincipal;

import br.com.potencia.compartilhado.Autor;

/**
 * Quem está logado, guardado na sessão. Leva só o essencial (sem a senha).
 * O nome do principal é o id: as sessões ficam indexadas por ele e podem ser
 * encerradas todas de uma vez (troca de senha, bloqueio).
 */
public record UsuarioSessao(UUID id, String email, String nome, Papel papel)
		implements AuthenticatedPrincipal, Serializable {

	@Override
	public String getName() {
		return id.toString();
	}

	public boolean isAdmin() {
		return papel == Papel.ADMIN;
	}

	/** Para a auditoria. */
	public Autor autor() {
		return new Autor(id, email);
	}

}
