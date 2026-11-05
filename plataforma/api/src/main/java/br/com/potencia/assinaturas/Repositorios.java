package br.com.potencia.assinaturas;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface AssinaturaRepository extends JpaRepository<Assinatura, UUID>, JpaSpecificationExecutor<Assinatura> {

	List<Assinatura> findByUsuarioIdOrderByCriadaEmDesc(UUID usuarioId);

	List<Assinatura> findByUsuarioIdIn(Collection<UUID> usuarioIds);

	List<Assinatura> findByStatusIn(Collection<StatusAssinatura> status);

	List<Assinatura> findByPlanoIdAndStatusIn(String planoId, Collection<StatusAssinatura> status);

	Optional<Assinatura> findFirstByGatewayId(String gatewayId);

	Optional<Assinatura> findFirstByCheckoutId(String checkoutId);

	Optional<Assinatura> findFirstByGatewayClienteOrderByCriadaEmDesc(String gatewayCliente);

	boolean existsByUsuarioIdAndFundadorTrue(UUID usuarioId);

}

interface AcessoManualRepository extends JpaRepository<AcessoManual, UUID> {

	List<AcessoManual> findByUsuarioId(UUID usuarioId);

	List<AcessoManual> findByUsuarioIdOrderByCriadoEmDesc(UUID usuarioId);

}

interface PagamentoRepository extends JpaRepository<Pagamento, UUID> {

	Optional<Pagamento> findByGatewayId(String gatewayId);

	List<Pagamento> findByAssinaturaIdOrderByCriadoEmDesc(UUID assinaturaId);

	List<Pagamento> findByStatusAndPagoEmGreaterThanEqual(Pagamento.Status status, Instant desde);

}

interface EventoGatewayRepository extends JpaRepository<EventoGateway, String> {

	List<EventoGateway> findByProcessadoEmIsNullOrderByRecebidoEmDesc();

	List<EventoGateway> findTop30ByAssinaturaIdOrderByRecebidoEmDesc(UUID assinaturaId);

}

interface MembroEquipeRepository extends JpaRepository<MembroEquipe, UUID> {

	List<MembroEquipe> findByAssinaturaIdOrderByConvidadoEm(UUID assinaturaId);

	List<MembroEquipe> findByUsuarioIdAndStatus(UUID usuarioId, MembroEquipe.Status status);

	Optional<MembroEquipe> findByTokenHash(String tokenHash);

}

interface CondicaoFundadorRepository extends JpaRepository<CondicaoFundador, Integer> {

}

interface FundadorEmailRepository extends JpaRepository<FundadorEmail, String> {

	List<FundadorEmail> findAllByOrderByEmail();

}

interface CupomRepository extends JpaRepository<Cupom, UUID> {

	Optional<Cupom> findByCodigo(String codigo);

	List<Cupom> findAllByOrderByCriadoEmDesc();

}
