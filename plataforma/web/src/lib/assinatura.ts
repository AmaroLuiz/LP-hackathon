// Tipos e textos da assinatura (área do aluno, convite da equipe e painel).
// Sem nada do servidor: componentes do navegador também importam daqui.

export type StatusAssinatura = "PENDENTE" | "ATIVA" | "EM_ATRASO" | "CANCELADA" | "EXPIRADA";

export const STATUS_ASSINATURA: Record<StatusAssinatura, { texto: string; tom: "ouro" | "salvia" | "neutro" | "erro" }> = {
  PENDENTE: { texto: "Esperando pagamento", tom: "ouro" },
  ATIVA: { texto: "Ativa", tom: "salvia" },
  EM_ATRASO: { texto: "Pagamento atrasado", tom: "erro" },
  CANCELADA: { texto: "Cancelada", tom: "neutro" },
  EXPIRADA: { texto: "Encerrada", tom: "neutro" },
};

export const STATUS_PAGAMENTO: Record<string, string> = {
  PENDENTE: "Em aberto",
  CONFIRMADO: "Pago",
  ATRASADO: "Atrasado",
  RECUSADO: "Recusado",
  ESTORNADO: "Estornado",
};

export const METODOS: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  PIX: "Pix",
  BOLETO: "Boleto",
  FALSO: "Teste (sem cobrança)",
};

export const MOTIVOS_CANCELAMENTO = [
  "Preço",
  "Não tenho tempo agora",
  "Já aprendi o que precisava",
  "Os cursos não eram o que eu esperava",
  "Problema com o pagamento",
  "Outro motivo",
] as const;

export type PlanoResumo = { id: string; nome: string; precoCentavos: number; maxPessoas: number };

export type Pagamento = {
  id: string;
  valorCentavos: number;
  metodo: string | null;
  status: string;
  vencimento: string | null;
  pagoEm: string | null;
  urlFatura: string | null;
};

export type MinhaAssinatura = {
  id: string;
  plano: PlanoResumo;
  status: StatusAssinatura;
  daAcesso: boolean;
  inicio: string;
  fimPeriodoAtual: string;
  fimCarencia: string | null;
  proximaCobranca: { data: string; valorCentavos: number } | null;
  metodo: string | null;
  fundador: boolean;
  descontoPercentual: number;
  mesesComDesconto: number;
  precoTravadoAte: string | null;
  planoAgendado: PlanoResumo | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  podeReativar: boolean;
  urlPagamento: string | null;
  pagamentos: Pagamento[];
  /** Cupom que deu o desconto (nulo: sem cupom ou o desconto de fundador era maior). */
  cupom: string | null;
};

export type MembroEquipe = {
  id: string;
  email: string;
  nome: string | null;
  status: "CONVIDADO" | "ATIVO" | "REMOVIDO";
  convidadoEm: string;
  entrouEm: string | null;
  conviteExpiraEm: string | null;
};

export type Equipe = { plano: string; maxPessoas: number; vagas: number; membros: MembroEquipe[] };

export type Participacao = { membroId: string; titular: string; plano: string; daAcesso: boolean };

export type Convite = { titular: string; plano: string; email: string; valido: boolean };

export type CondicaoPublica = { descontoPercentual: number; mesesDesconto: number; mesesPrecoTravado: number; validaAte: string | null };

// --- Painel -------------------------------------------------------------------

export type Pessoa = { id: string; nome: string; email: string };

export type AssinaturaLinha = {
  id: string;
  usuarioId: string;
  planoId: string;
  planoNome: string;
  status: StatusAssinatura;
  daAcesso: boolean;
  precoCentavos: number;
  valorProximaCobranca: number;
  fundador: boolean;
  gateway: string;
  gatewayId: string | null;
  inicio: string;
  fimPeriodoAtual: string;
  canceladaEm: string | null;
};

export type EventoGateway = { id: string; tipo: string | null; recebidoEm: string | null; processadoEm: string | null; tentativas: number; erro: string | null };

export type AssinaturaAdmin = {
  assinatura: AssinaturaLinha;
  gatewayCliente: string | null;
  checkoutId: string | null;
  motivoCancelamento: string | null;
  planoAgendado: PlanoResumo | null;
  descontoPercentual: number;
  mesesDesconto: number;
  precoTravadoAte: string | null;
  pagamentosConfirmados: number;
  linkNoGateway: string | null;
  pagamentos: Pagamento[];
  eventos: EventoGateway[];
  equipe: { id: string; email: string; usuarioId: string | null; status: string; convidadoEm: string; entrouEm: string | null }[];
};

export type PlanoAdmin = {
  id: string;
  nome: string;
  precoCentavos: number;
  maxPessoas: number;
  itens: string[];
  ativo: boolean;
  cursos: number[];
  assinantes: number;
};

export type FundadorAdmin = {
  ativa: boolean;
  descontoPercentual: number;
  mesesDesconto: number;
  mesesPrecoTravado: number;
  validaAte: string | null;
  emails: number;
  assinantesFundadores: number;
};
