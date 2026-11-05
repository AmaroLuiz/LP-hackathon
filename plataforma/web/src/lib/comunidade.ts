// Tipos da comunidade (perguntas por aula e avaliações de curso). Só tipos e
// funções puras: pode ser importado por componentes do navegador.

export type Autoria = { nome: string; equipe: boolean; voce: boolean };

export type RespostaItem = { id: string; texto: string; autor: Autoria; criadoEm: string };

export type PerguntaItem = {
  id: string;
  titulo: string;
  texto: string;
  autor: Autoria;
  criadoEm: string;
  uteis: number;
  marcadaPorVoce: boolean;
  respondidaPelaEquipe: boolean;
  respostas: RespostaItem[];
};

export type AvaliacaoItem = {
  id: string;
  nome: string;
  nota: number;
  comentario: string | null;
  respostaEquipe: string | null;
  criadoEm: string;
};

export type Avaliacoes = {
  media: number;
  total: number;
  /** Quantidade por nota, de "5" a "1". */
  distribuicao: Record<string, number>;
  itens: AvaliacaoItem[];
  pagina: number;
  totalFiltrado: number;
};

export type MinhaAvaliacao = {
  podeAvaliar: boolean;
  percentual: number;
  minimo: number;
  nota: number | null;
  comentario: string | null;
  respostaEquipe: string | null;
};

export type Depoimento = { nome: string; nota: number; comentario: string; curso: string; cursoSlug: string };

export const NOTAS = [5, 4, 3, 2, 1] as const;

export const ROTULO_NOTA: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Razoável",
  4: "Bom",
  5: "Excelente",
};

/** Percentual de cada nota na distribuição (0 quando não há avaliações). */
export function percentualDaNota(a: Pick<Avaliacoes, "distribuicao" | "total">, nota: number): number {
  if (a.total === 0) return 0;
  return Math.round(((a.distribuicao[String(nota)] ?? 0) / a.total) * 100);
}
