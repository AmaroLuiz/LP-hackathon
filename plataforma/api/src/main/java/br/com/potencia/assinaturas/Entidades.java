package br.com.potencia.assinaturas;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Entidades pequenas do módulo de assinaturas (os outros módulos falam com o
// AssinaturasService, nunca com elas).

/** Uma cobrança da assinatura, como o gateway informou. */
@Entity
class Pagamento {

	enum Status {

		PENDENTE, CONFIRMADO, ATRASADO, RECUSADO, ESTORNADO

	}

	@Id
	private UUID id;

	private UUID assinaturaId;

	private String gatewayId;

	private int valorCentavos;

	/** CREDIT_CARD, PIX, BOLETO... (como o gateway chama). */
	private String metodo;

	@Enumerated(EnumType.STRING)
	private Status status;

	private LocalDate vencimento;

	private Instant pagoEm;

	private String urlFatura;

	private Instant criadoEm;

	private Instant atualizadoEm;

	protected Pagamento() {
	}

	static Pagamento novo(UUID assinaturaId, String gatewayId, Instant agora) {
		var p = new Pagamento();
		p.id = UUID.randomUUID();
		p.assinaturaId = assinaturaId;
		p.gatewayId = gatewayId;
		p.status = Status.PENDENTE;
		p.criadoEm = agora;
		p.atualizadoEm = agora;
		return p;
	}

	void atualizar(Integer valorCentavos, String metodo, LocalDate vencimento, String urlFatura, Instant agora) {
		if (valorCentavos != null) {
			this.valorCentavos = valorCentavos;
		}
		if (metodo != null) {
			this.metodo = metodo;
		}
		if (vencimento != null) {
			this.vencimento = vencimento;
		}
		if (urlFatura != null) {
			this.urlFatura = urlFatura;
		}
		atualizadoEm = agora;
	}

	/** @return true se é a primeira vez que este pagamento é confirmado */
	boolean confirmar(Instant pagoEm, Instant agora) {
		boolean primeira = status != Status.CONFIRMADO;
		status = Status.CONFIRMADO;
		if (this.pagoEm == null) {
			this.pagoEm = pagoEm == null ? agora : pagoEm;
		}
		atualizadoEm = agora;
		return primeira;
	}

	void mudarStatus(Status novo, Instant agora) {
		// Pagamento confirmado só volta atrás por estorno.
		if (status == Status.CONFIRMADO && novo != Status.ESTORNADO) {
			return;
		}
		status = novo;
		atualizadoEm = agora;
	}

	UUID getId() {
		return id;
	}

	UUID getAssinaturaId() {
		return assinaturaId;
	}

	String getGatewayId() {
		return gatewayId;
	}

	int getValorCentavos() {
		return valorCentavos;
	}

	String getMetodo() {
		return metodo;
	}

	Status getStatus() {
		return status;
	}

	LocalDate getVencimento() {
		return vencimento;
	}

	Instant getPagoEm() {
		return pagoEm;
	}

	String getUrlFatura() {
		return urlFatura;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}

/** Um evento recebido do gateway pelo webhook, guardado antes de processar. */
@Entity
@Table(name = "evento_gateway")
class EventoGateway {

	@Id
	private String id;

	private String gateway;

	private String tipo;

	private String payload;

	private UUID assinaturaId;

	private Instant recebidoEm;

	private Instant processadoEm;

	private int tentativas;

	private String erro;

	protected EventoGateway() {
	}

	static EventoGateway recebido(String id, String gateway, String tipo, String payload, Instant agora) {
		var e = new EventoGateway();
		e.id = id;
		e.gateway = gateway;
		e.tipo = tipo;
		e.payload = payload.length() > 20_000 ? payload.substring(0, 20_000) : payload;
		e.recebidoEm = agora;
		return e;
	}

	void processado(UUID assinaturaId, Instant agora) {
		this.assinaturaId = assinaturaId;
		processadoEm = agora;
		tentativas++;
		erro = null;
	}

	void falhou(String motivo, Instant agora) {
		tentativas++;
		erro = motivo == null ? "Erro sem mensagem" : motivo.length() > 500 ? motivo.substring(0, 500) : motivo;
		processadoEm = null;
	}

	String getId() {
		return id;
	}

	String getGateway() {
		return gateway;
	}

	String getTipo() {
		return tipo;
	}

	String getPayload() {
		return payload;
	}

	UUID getAssinaturaId() {
		return assinaturaId;
	}

	Instant getRecebidoEm() {
		return recebidoEm;
	}

	Instant getProcessadoEm() {
		return processadoEm;
	}

	int getTentativas() {
		return tentativas;
	}

	String getErro() {
		return erro;
	}

}

/** Convite e participação na equipe do plano Negócio. */
@Entity
@Table(name = "membro_equipe")
class MembroEquipe {

	enum Status {

		CONVIDADO, ATIVO, REMOVIDO

	}

	@Id
	private UUID id;

	private UUID assinaturaId;

	private String email;

	private UUID usuarioId;

	@Enumerated(EnumType.STRING)
	private Status status;

	/** Hash SHA-256 do token do convite; o token puro só vai no e-mail. */
	private String tokenHash;

	private Instant conviteExpiraEm;

	private Instant convidadoEm;

	private Instant entrouEm;

	private Instant removidoEm;

	protected MembroEquipe() {
	}

	static MembroEquipe convite(UUID assinaturaId, String email, String tokenHash, Instant agora, Instant expira) {
		var m = new MembroEquipe();
		m.id = UUID.randomUUID();
		m.assinaturaId = assinaturaId;
		m.email = email;
		m.tokenHash = tokenHash;
		m.status = Status.CONVIDADO;
		m.convidadoEm = agora;
		m.conviteExpiraEm = expira;
		return m;
	}

	boolean isConviteValido(Instant agora) {
		return status == Status.CONVIDADO && agora.isBefore(conviteExpiraEm);
	}

	/** Ocupa vaga: membro ativo ou convite ainda válido. */
	boolean ocupaVaga(Instant agora) {
		return status == Status.ATIVO || isConviteValido(agora);
	}

	void aceitar(UUID usuarioId, Instant agora) {
		this.usuarioId = usuarioId;
		status = Status.ATIVO;
		entrouEm = agora;
		tokenHash = null;
	}

	void remover(Instant agora) {
		status = Status.REMOVIDO;
		removidoEm = agora;
		tokenHash = null;
	}

	/** A pessoa excluiu a conta: sai da equipe e o e-mail dela não fica guardado aqui. */
	void esquecer(Instant agora) {
		if (status != Status.REMOVIDO) {
			remover(agora);
		}
		email = "conta-excluida@potencia.invalid";
	}

	UUID getId() {
		return id;
	}

	UUID getAssinaturaId() {
		return assinaturaId;
	}

	String getEmail() {
		return email;
	}

	UUID getUsuarioId() {
		return usuarioId;
	}

	Status getStatus() {
		return status;
	}

	Instant getConviteExpiraEm() {
		return conviteExpiraEm;
	}

	Instant getConvidadoEm() {
		return convidadoEm;
	}

	Instant getEntrouEm() {
		return entrouEm;
	}

}

/** Regras da condição de fundador (uma linha só, editada no painel). */
@Entity
@Table(name = "condicao_fundador")
class CondicaoFundador {

	@Id
	private Integer id;

	private boolean ativa;

	private int descontoPercentual;

	private int mesesDesconto;

	private int mesesPrecoTravado;

	private Instant validaAte;

	protected CondicaoFundador() {
	}

	boolean isVigente(Instant agora) {
		return ativa && (validaAte == null || agora.isBefore(validaAte));
	}

	void editar(boolean ativa, int descontoPercentual, int mesesDesconto, int mesesPrecoTravado, Instant validaAte) {
		this.ativa = ativa;
		this.descontoPercentual = descontoPercentual;
		this.mesesDesconto = mesesDesconto;
		this.mesesPrecoTravado = mesesPrecoTravado;
		this.validaAte = validaAte;
	}

	boolean isAtiva() {
		return ativa;
	}

	int getDescontoPercentual() {
		return descontoPercentual;
	}

	int getMesesDesconto() {
		return mesesDesconto;
	}

	int getMesesPrecoTravado() {
		return mesesPrecoTravado;
	}

	Instant getValidaAte() {
		return validaAte;
	}

}

/** E-mail da lista de espera da landing: quem tem direito à condição de fundador. */
@Entity
@Table(name = "fundador_email")
class FundadorEmail {

	@Id
	private String email;

	private Instant adicionadoEm;

	protected FundadorEmail() {
	}

	FundadorEmail(String email, Instant agora) {
		this.email = email;
		this.adicionadoEm = agora;
	}

	String getEmail() {
		return email;
	}

	Instant getAdicionadoEm() {
		return adicionadoEm;
	}

}

/** Cupom de desconto (criado no painel). Não soma com a condição de fundador: vale o maior. */
@Entity
class Cupom {

	@Id
	private UUID id;

	private String codigo;

	private String descricao;

	private int percentual;

	/** Em quantas cobranças o desconto vale. */
	private int meses;

	/** Só para este plano (nulo: qualquer plano). */
	private String planoId;

	private Instant validoAte;

	private Integer limiteUsos;

	/** Assinaturas que já pagaram a primeira cobrança com o cupom. */
	private int usos;

	private boolean ativo;

	private Instant criadoEm;

	protected Cupom() {
	}

	static Cupom novo(String codigo, Instant agora) {
		var c = new Cupom();
		c.id = UUID.randomUUID();
		c.codigo = normalizar(codigo);
		c.ativo = true;
		c.criadoEm = agora;
		return c;
	}

	static String normalizar(String codigo) {
		return codigo == null ? "" : codigo.strip().toUpperCase(java.util.Locale.ROOT);
	}

	void editar(String descricao, int percentual, int meses, String planoId, Instant validoAte, Integer limiteUsos,
			boolean ativo) {
		this.descricao = descricao == null || descricao.isBlank() ? null : descricao.strip();
		this.percentual = percentual;
		this.meses = meses;
		this.planoId = planoId == null || planoId.isBlank() ? null : planoId;
		this.validoAte = validoAte;
		this.limiteUsos = limiteUsos;
		this.ativo = ativo;
	}

	/** Por que o cupom não serve agora (nulo: serve). */
	String motivoRecusa(String planoId, Instant agora) {
		if (!ativo || (validoAte != null && !agora.isBefore(validoAte))) {
			return "Este cupom não está mais valendo.";
		}
		if (limiteUsos != null && usos >= limiteUsos) {
			return "Este cupom já foi usado o número máximo de vezes.";
		}
		if (this.planoId != null && !this.planoId.equals(planoId)) {
			return "Este cupom não vale para o plano escolhido.";
		}
		return null;
	}

	void registrarUso() {
		usos++;
	}

	UUID getId() {
		return id;
	}

	String getCodigo() {
		return codigo;
	}

	String getDescricao() {
		return descricao;
	}

	int getPercentual() {
		return percentual;
	}

	int getMeses() {
		return meses;
	}

	String getPlanoId() {
		return planoId;
	}

	Instant getValidoAte() {
		return validoAte;
	}

	Integer getLimiteUsos() {
		return limiteUsos;
	}

	int getUsos() {
		return usos;
	}

	boolean isAtivo() {
		return ativo;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

}
