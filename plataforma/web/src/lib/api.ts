import { cacheLife, cacheTag } from "next/cache";
import type { CondicaoPublica } from "./assinatura";
import type { Avaliacoes, Depoimento } from "./comunidade";

// Endereço da API Spring. No servidor do Next a chamada é direta; no navegador,
// /api/* passa pelo rewrite do next.config.ts.
export const API_URL = process.env.API_URL ?? "http://localhost:8080";

export type Nivel = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO";

export type CursoCard = {
  id: number;
  slug: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  capaUrl: string | null;
  capaAlt: string | null;
  nivel: Nivel;
  categoria: { slug: string; nome: string };
  instrutores: string[];
  notaMedia: number;
  totalAvaliacoes: number;
  totalAlunos: number;
  totalAulas: number;
  duracaoTotalSegundos: number;
  ferramentas: string[];
  temPrevia: boolean;
  destaque: boolean;
  publicadoEm: string | null;
};

export type AulaResumo = {
  id: number;
  ordem: number;
  titulo: string;
  tipo: "VIDEO" | "TEXTO" | "MATERIAL" | "EXERCICIO";
  duracaoSegundos: number | null;
  previa: boolean;
};

export type ModuloResumo = { ordem: number; titulo: string; descricao: string | null; aulas: AulaResumo[] };

export type Instrutor = { nome: string; titulo: string | null; bio: string | null; fotoUrl: string | null };

export type CursoDetalhe = {
  card: CursoCard;
  descricao: string | null;
  idioma: string;
  ferramentas: string[];
  oQueAprende: string[];
  requisitos: string[];
  paraQuemE: string[];
  resultadoFinal: string;
  certificadoHabilitado: boolean;
  publicadoEm: string | null;
  atualizadoEm: string;
  seoTitulo: string | null;
  seoDescricao: string | null;
  instrutores: Instrutor[];
  modulos: ModuloResumo[];
};

export type Categoria = { slug: string; nome: string; descricao: string | null };

export type Plano = {
  id: string;
  nome: string;
  precoCentavos: number;
  maxPessoas: number;
  itens: string[];
  /** Ids dos cursos que o plano libera. */
  cursos: number[];
};

async function buscar<T>(caminho: string): Promise<T | null> {
  const resposta = await fetch(`${API_URL}${caminho}`);
  if (resposta.status === 404) return null;
  if (!resposta.ok) {
    throw new Error(`A API respondeu ${resposta.status} em ${caminho}`);
  }
  return resposta.json() as Promise<T>;
}

// O catálogo é público e muda pouco: fica em cache por horas e é invalidado
// pela tag "catalogo" quando o conteúdo for editado no painel.

export async function listarCursos(): Promise<CursoCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  return (await buscar<CursoCard[]>("/api/cursos")) ?? [];
}

export async function buscarCurso(slug: string): Promise<CursoDetalhe | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo", `curso:${slug}`);
  return buscar<CursoDetalhe>(`/api/cursos/${encodeURIComponent(slug)}`);
}

export async function listarCategorias(): Promise<Categoria[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  return (await buscar<Categoria[]>("/api/categorias")) ?? [];
}

export async function listarPlanos(): Promise<Plano[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  return (await buscar<Plano[]>("/api/planos")) ?? [];
}

/** O plano mais barato que libera o curso (o que o card e a página anunciam). */
export function planoMinimo(planos: Plano[], cursoId: number): Plano | undefined {
  return planos
    .filter((p) => p.cursos.includes(cursoId))
    .sort((a, b) => a.precoCentavos - b.precoCentavos)[0];
}

/** A condição de fundador em vigor (null se não está valendo). Em cache com o catálogo. */
export async function condicaoFundador(): Promise<CondicaoPublica | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  const r = await fetch(`${API_URL}/api/condicao-fundador`);
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`A API respondeu ${r.status} em /api/condicao-fundador`);
  return r.json() as Promise<CondicaoPublica>;
}

// Avaliações: a API avisa (revalidação das tags do curso e do catálogo) quando
// uma avaliação entra, muda ou é moderada.

export async function avaliacoesDoCurso(slug: string): Promise<Avaliacoes | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo", `curso:${slug}`);
  return buscar<Avaliacoes>(`/api/cursos/${encodeURIComponent(slug)}/avaliacoes`);
}

/** Avaliações boas e com comentário, para a home. Vazio: a seção não aparece. */
export async function depoimentos(): Promise<Depoimento[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogo");
  return (await buscar<Depoimento[]>("/api/depoimentos")) ?? [];
}

/** Botões de "entrar com" ligados na API (Google só com GOOGLE_CLIENT_ID configurado). */
export async function provedoresDeLogin(): Promise<{ google: boolean }> {
  "use cache";
  cacheLife("hours");
  try {
    return (await buscar<{ google: boolean }>("/api/auth/provedores")) ?? { google: false };
  } catch {
    return { google: false };
  }
}
