package br.com.potencia.contas;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface TokenContaRepository extends JpaRepository<TokenConta, UUID> {

	Optional<TokenConta> findByTokenHash(String tokenHash);

	/** Ao emitir um link novo, os anteriores do mesmo tipo deixam de valer. */
	@Modifying
	@Query("""
			update TokenConta t set t.usadoEm = :agora
			where t.usuarioId = :usuarioId and t.tipo = :tipo and t.usadoEm is null
			""")
	void invalidarAbertos(UUID usuarioId, TipoToken tipo, Instant agora);

}
