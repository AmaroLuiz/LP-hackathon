package br.com.potencia.assinaturas;

public enum StatusAssinatura {

	/** Esperando o primeiro pagamento. Sem acesso. */
	PENDENTE,

	ATIVA,

	/** Pagamento atrasado: o acesso continua durante a carência. */
	EM_ATRASO,

	/** Cancelada pelo aluno: o acesso vai até o fim do período já pago. */
	CANCELADA,

	EXPIRADA

}
