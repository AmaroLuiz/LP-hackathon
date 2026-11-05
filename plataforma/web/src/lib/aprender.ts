import type { AulaResumo, CursoCard } from "./api";

// Tipos das respostas de aprendizado da API (player, progresso, certificados).

export type Motivo =
  | "ADMIN"
  | "ASSINATURA"
  | "ACESSO_MANUAL"
  | "PREVIA"
  | "EMAIL_NAO_VERIFICADO"
  | "SEM_ACESSO"
  | "INDISPONIVEL";

export type MatriculaResumo = {
  ultimaAulaId: number | null;
  aulasConcluidas: number;
  totalAulas: number;
  percentual: number;
  concluido: boolean;
  iniciadaEm: string;
  certificadoCodigo: string | null;
};

export type AcessoCurso = {
  podeAssistir: boolean;
  motivo: Motivo;
  matricula: MatriculaResumo | null;
  primeiraAulaId: number | null;
};

export type AulaPainel = Omit<AulaResumo, "ordem"> & { concluida: boolean };

export type PainelCurso = {
  cursoId: number;
  slug: string;
  titulo: string;
  numero: number;
  certificadoHabilitado: boolean;
  modulos: { titulo: string; aulas: AulaPainel[]; concluidas: number }[];
  aulasConcluidas: number;
  totalAulas: number;
  percentual: number;
  concluido: boolean;
  continuarAulaId: number | null;
  certificadoCodigo: string | null;
};

export type Video = { url: string; tipo: "arquivo" | "hls"; poster: string | null; legenda: string | null };

export type AulaPlayer = {
  id: number;
  cursoSlug: string;
  cursoTitulo: string;
  moduloTitulo: string;
  titulo: string;
  tipo: AulaResumo["tipo"];
  resumo: string | null;
  conteudo: string | null;
  video: Video | null;
  duracaoSegundos: number | null;
  posicaoSegundos: number;
  concluida: boolean;
  anteriorId: number | null;
  proximaId: number | null;
  proximaTitulo: string | null;
  indice: number;
  total: number;
  /** Links assinados, de curta duração. */
  materiais: { nome: string; url: string; tamanhoBytes: number | null }[];
};

export type Conclusao = {
  aulasConcluidas: number;
  totalAulas: number;
  percentual: number;
  cursoConcluido: boolean;
  certificadoCodigo: string | null;
};

export type Anotacao = { id: string; posicaoSegundos: number; texto: string; criadoEm: string };

export type Previa = { id: number; titulo: string; cursoTitulo: string; duracaoSegundos: number | null; video: Video | null };

export type MeuCurso = { card: CursoCard; matricula: MatriculaResumo };

export type Certificado = {
  codigo: string;
  nomeAluno: string;
  tituloCurso: string;
  cursoSlug: string | null;
  cargaHorariaMinutos: number;
  emitidoEm: string;
};

