package br.com.potencia.assinaturas;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

/**
 * A assinatura de uma pessoa. Guarda o que foi contratado (plano, preço e a
 * condição de fundador) e o período pago. O acesso aos cursos sai de
 * {@link #daAcesso(Instant)}.
 */
@Entity
class Assinatura {

	/** Dias de acesso depois do vencimento enquanto o pagamento está atrasado. */
	static final Duration CARENCIA = Duration.ofDays(5);

	private static final java.time.ZoneId FUSO = java.time.ZoneId.of("America/Sao_Paulo");

	@Id
	private UUID id;

	private UUID usuarioId;

	private String planoId;

	@Enumerated(EnumType.STRING)
	private StatusAssinatura status;

	private String gateway;

	/** Id da assinatura no gateway (ex.: sub_... no Asaas). */
	private String gatewayId;

	private String gatewayCliente;

	private String checkoutId;

	private String checkoutUrl;

	private Instant inicio;

	private Instant fimPeriodoAtual;

	private Instant canceladaEm;

	private String motivoCancelamento;

	/** Preço cheio do plano na contratação (ou depois de uma troca de plano). */
	private int precoCentavos;

	private boolean fundador;

	private int descontoPercentual;

	private int mesesDesconto;

	/** Cupom usado na contratação (o desconto dele está em descontoPercentual/mesesDesconto). */
	private String cupomCodigo;

	/** Até quando o preço não sobe, mesmo que o plano fique mais caro (fundador). */
	private Instant precoTravadoAte;

	private int pagamentosConfirmados;

	/** Troca para um plano mais barato, que vale no próximo ciclo. */
	private String planoAgendadoId;

	private Instant criadaEm;

	private Instant atualizadaEm;

	protected Assinatura() {
	}

	/** Condição de fundador congelada na contratação. */
	record Fundador(int descontoPercentual, int mesesDesconto, Instant precoTravadoAte) {
	}

	static Assinatura nova(UUID usuarioId, Plano plano, String gateway, Fundador fundador, Instant agora) {
		var a = new Assinatura();
		a.id = UUID.randomUUID();
		a.usuarioId = usuarioId;
		a.planoId = plano.getId();
		a.precoCentavos = plano.getPrecoCentavos();
		a.gateway = gateway;
		a.status = StatusAssinatura.PENDENTE;
		a.inicio = agora;
		a.fimPeriodoAtual = agora;
		a.criadaEm = agora;
		a.atualizadaEm = agora;
		if (fundador != null) {
			a.fundador = true;
			a.descontoPercentual = fundador.descontoPercentual();
			a.mesesDesconto = fundador.mesesDesconto();
			a.precoTravadoAte = fundador.precoTravadoAte();
		}
		return a;
	}

	/** Se, neste momento, a assinatura dá acesso aos cursos do plano. */
	boolean daAcesso(Instant agora) {
		return switch (status) {
			case ATIVA -> true;
			case EM_ATRASO -> agora.isBefore(fimPeriodoAtual.plus(CARENCIA));
			case CANCELADA -> agora.isBefore(fimPeriodoAtual);
			case PENDENTE, EXPIRADA -> false;
		};
	}

	/**
	 * Quanto custa o ciclo de número {@code ciclo} (1 = primeira cobrança). O
	 * fundador (ou quem usou cupom) paga com desconto nos primeiros meses.
	 */
	int valorDoCiclo(int ciclo) {
		return valorComPreco(precoCentavos, ciclo);
	}

	/** O mesmo cálculo, com outro preço cheio (troca de plano agendada). */
	int valorComPreco(int preco, int ciclo) {
		if (descontoPercentual > 0 && ciclo <= mesesDesconto) {
			return Math.round(preco * (100 - descontoPercentual) / 100f);
		}
		return preco;
	}

	/**
	 * Cupom na contratação. Não soma com a condição de fundador: fica o que dá
	 * mais desconto no total (percentual × meses); o preço travado do fundador continua.
	 */
	boolean aplicarCupom(String codigo, int percentual, int meses) {
		if (percentual * meses <= descontoPercentual * mesesDesconto) {
			return false;
		}
		cupomCodigo = codigo;
		descontoPercentual = percentual;
		mesesDesconto = meses;
		return true;
	}

	/** O desconto acaba quando já se pagaram todas as cobranças com desconto. */
	boolean descontoAcabouAgora() {
		return descontoPercentual > 0 && mesesDesconto > 0 && pagamentosConfirmados == mesesDesconto;
	}

	int valorDaProximaCobranca() {
		return valorDoCiclo(pagamentosConfirmados + 1);
	}

	// --- Ligação com o gateway -------------------------------------------------

	void checkoutCriado(String checkoutId, String url, Instant agora) {
		this.checkoutId = checkoutId;
		this.checkoutUrl = url;
		atualizadaEm = agora;
	}

	void ligarAoGateway(String gatewayId, String cliente, Instant agora) {
		if (gatewayId != null && this.gatewayId == null) {
			this.gatewayId = gatewayId;
		}
		if (cliente != null && gatewayCliente == null) {
			gatewayCliente = cliente;
		}
		atualizadaEm = agora;
	}

	// --- Ciclo de vida ---------------------------------------------------------

	/**
	 * Pagamento confirmado: acesso até um mês depois do vencimento pago (o dia
	 * conta no horário de Brasília: venceu em 2/11, vale até 2/12).
	 */
	void pagamentoConfirmado(LocalDate vencimento, boolean cicloNovo, Instant agora) {
		var base = vencimento == null ? agora.atZone(FUSO) : vencimento.atStartOfDay(FUSO);
		var fim = base.plusMonths(1).toInstant();
		if (fim.isAfter(fimPeriodoAtual)) {
			fimPeriodoAtual = fim;
		}
		if (cicloNovo) {
			pagamentosConfirmados++;
		}
		if (status != StatusAssinatura.CANCELADA) {
			status = StatusAssinatura.ATIVA;
		}
		atualizadaEm = agora;
	}

	/** Checkout pago (primeiro pagamento): ativa mesmo antes do evento da cobrança. */
	void ativar(Instant agora) {
		if (status == StatusAssinatura.PENDENTE || status == StatusAssinatura.EXPIRADA) {
			status = StatusAssinatura.ATIVA;
			if (!fimPeriodoAtual.isAfter(agora)) {
				fimPeriodoAtual = agora.atZone(FUSO).plusMonths(1).toInstant();
			}
		}
		atualizadaEm = agora;
	}

	void atrasou(Instant agora) {
		if (status == StatusAssinatura.ATIVA) {
			status = StatusAssinatura.EM_ATRASO;
		}
		atualizadaEm = agora;
	}

	void cancelar(String motivo, Instant agora) {
		status = StatusAssinatura.CANCELADA;
		canceladaEm = agora;
		motivoCancelamento = motivo;
		planoAgendadoId = null;
		atualizadaEm = agora;
	}

	void reativar(Instant agora) {
		status = StatusAssinatura.ATIVA;
		canceladaEm = null;
		motivoCancelamento = null;
		atualizadaEm = agora;
	}

	void expirar(Instant agora) {
		status = StatusAssinatura.EXPIRADA;
		atualizadaEm = agora;
	}

	/** Upgrade: o plano novo vale na hora (a próxima cobrança já é do plano novo). */
	void trocarPlanoAgora(Plano novo, Instant agora) {
		planoId = novo.getId();
		precoCentavos = novo.getPrecoCentavos();
		planoAgendadoId = null;
		atualizadaEm = agora;
	}

	void agendarPlano(String planoId, Instant agora) {
		planoAgendadoId = planoId;
		atualizadaEm = agora;
	}

	/** Ciclo novo começou: a troca agendada passa a valer. */
	boolean aplicarPlanoAgendado(Plano novo, Instant agora) {
		if (planoAgendadoId == null || !planoAgendadoId.equals(novo.getId())) {
			return false;
		}
		trocarPlanoAgora(novo, agora);
		return true;
	}

	void reajustarPreco(int novoPreco, Instant agora) {
		precoCentavos = novoPreco;
		atualizadaEm = agora;
	}

	boolean isPrecoTravado(Instant agora) {
		return precoTravadoAte != null && agora.isBefore(precoTravadoAte);
	}

	// --- Leitura ---------------------------------------------------------------

	UUID getId() {
		return id;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	String getPlanoId() {
		return planoId;
	}

	StatusAssinatura getStatus() {
		return status;
	}

	String getGateway() {
		return gateway;
	}

	String getGatewayId() {
		return gatewayId;
	}

	String getGatewayCliente() {
		return gatewayCliente;
	}

	String getCheckoutId() {
		return checkoutId;
	}

	String getCheckoutUrl() {
		return checkoutUrl;
	}

	Instant getInicio() {
		return inicio;
	}

	Instant getFimPeriodoAtual() {
		return fimPeriodoAtual;
	}

	Instant getCanceladaEm() {
		return canceladaEm;
	}

	String getMotivoCancelamento() {
		return motivoCancelamento;
	}

	int getPrecoCentavos() {
		return precoCentavos;
	}

	boolean isFundador() {
		return fundador;
	}

	int getDescontoPercentual() {
		return descontoPercentual;
	}

	int getMesesDesconto() {
		return mesesDesconto;
	}

	String getCupomCodigo() {
		return cupomCodigo;
	}

	Instant getPrecoTravadoAte() {
		return precoTravadoAte;
	}

	int getPagamentosConfirmados() {
		return pagamentosConfirmados;
	}

	String getPlanoAgendadoId() {
		return planoAgendadoId;
	}

	Instant getCriadaEm() {
		return criadaEm;
	}

}
