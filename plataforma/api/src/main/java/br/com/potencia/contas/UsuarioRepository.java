package br.com.potencia.contas;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

interface UsuarioRepository extends JpaRepository<Usuario, UUID>, JpaSpecificationExecutor<Usuario> {

	Optional<Usuario> findByEmail(String email);

	boolean existsByEmail(String email);

	Optional<Usuario> findByGoogleSub(String googleSub);

	boolean existsByPapelAndExcluidoEmIsNull(Papel papel);

	/** Admins que conseguem entrar (nem excluídos nem bloqueados). */
	long countByPapelAndExcluidoEmIsNullAndBloqueadoEmIsNull(Papel papel);

	long countByPapelAndExcluidoEmIsNull(Papel papel);

	long countByPapelAndExcluidoEmIsNullAndEmailVerificadoEmIsNotNull(Papel papel);

	@Query("select u.criadoEm from Usuario u where u.papel = :papel and u.excluidoEm is null and u.criadoEm >= :desde")
	List<Instant> cadastrosDesde(Papel papel, Instant desde);

}
