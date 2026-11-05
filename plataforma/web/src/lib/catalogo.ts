import type { CursoCard, Nivel, Plano } from "./api";

// Busca, filtros, ordenação e recomendações sobre a lista de cursos publicados
// (que já vem em cache). Funções puras: os mesmos filtros valem na URL, no
// servidor e nos testes.

export const ORDENS = {
  relevancia: "Mais relevantes",
  novos: "Mais novos",
  avaliados: "Mais bem avaliados",
  populares: "Mais populares",
} as const;
export type Ordem = keyof typeof ORDENS;

export const DURACOES = {
  "ate-1h": "Até 1 hora",
  "1-3h": "De 1 a 3 horas",
  "3h-mais": "Mais de 3 horas",
} as const;
export type Duracao = keyof typeof DURACOES;

export const NOTAS_MINIMAS = [4.5, 4, 3.5] as const;

export type Filtros = {
  q: string;
  categorias: string[];
  niveis: Nivel[];
  duracoes: Duracao[];
  ferramentas: string[];
  notaMinima: number | null;
  plano: string | null;
  soPrevia: boolean;
  ordem: Ordem;
  pagina: number;
};

export const POR_PAGINA = 12;

type Parametros = Record<string, string | string[] | undefined>;

function lista(valor: string | string[] | undefined): string[] {
  if (valor === undefined) return [];
  return (Array.isArray(valor) ? valor : [valor]).filter(Boolean);
}

/** Lê os filtros da URL, descartando valores que não existem. */
export function lerFiltros(p: Parametros): Filtros {
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const ordem = um(p.ordem);
  const nota = Number(um(p.nota));
  const pagina = Number.parseInt(um(p.pagina), 10);
  return {
    q: um(p.q).trim().slice(0, 100),
    categorias: lista(p.categoria),
    niveis: lista(p.nivel).filter((n): n is Nivel => ["INICIANTE", "INTERMEDIARIO", "AVANCADO"].includes(n)),
    duracoes: lista(p.duracao).filter((d): d is Duracao => d in DURACOES),
    ferramentas: lista(p.ferramenta),
    notaMinima: (NOTAS_MINIMAS as readonly number[]).includes(nota) ? nota : null,
    plano: um(p.plano) || null,
    soPrevia: um(p.previa) === "1",
    ordem: ordem in ORDENS ? (ordem as Ordem) : "relevancia",
    pagina: Number.isFinite(pagina) && pagina > 1 ? Math.min(pagina, 50) : 1,
  };
}

/** Monta a URL de volta a partir dos filtros (para links de chips e paginação). */
export function urlDosFiltros(f: Filtros, mudancas: Partial<Filtros> = {}): string {
  const g = { ...f, ...mudancas };
  const p = new URLSearchParams();
  if (g.q) p.set("q", g.q);
  g.categorias.forEach((c) => p.append("categoria", c));
  g.niveis.forEach((n) => p.append("nivel", n));
  g.duracoes.forEach((d) => p.append("duracao", d));
  g.ferramentas.forEach((x) => p.append("ferramenta", x));
  if (g.notaMinima) p.set("nota", String(g.notaMinima));
  if (g.plano) p.set("plano", g.plano);
  if (g.soPrevia) p.set("previa", "1");
  if (g.ordem !== "relevancia") p.set("ordem", g.ordem);
  if (g.pagina > 1) p.set("pagina", String(g.pagina));
  const texto = p.toString();
  return texto ? `/cursos?${texto}` : "/cursos";
}

export function temFiltroAtivo(f: Filtros) {
  return Boolean(
    f.q || f.categorias.length || f.niveis.length || f.duracoes.length || f.ferramentas.length || f.notaMinima || f.plano || f.soPrevia,
  );
}

/** Minúsculas e sem acento: "edição" encontra "edicao" e vice-versa. */
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function faixaDeDuracao(segundos: number): Duracao | null {
  if (segundos <= 0) return null;
  if (segundos <= 3600) return "ate-1h";
  if (segundos <= 3 * 3600) return "1-3h";
  return "3h-mais";
}

/** Pontua a relevância de um curso para a busca (0 = não encontrado). */
function pontuar(curso: CursoCard, termos: string[]): number {
  const titulo = normalizar(curso.titulo);
  const resto = normalizar([curso.subtitulo, curso.categoria.nome, ...curso.ferramentas, ...curso.instrutores].join(" "));
  let pontos = 0;
  for (const termo of termos) {
    if (titulo.includes(termo)) pontos += 3;
    else if (resto.includes(termo)) pontos += 1;
    else return 0; // todos os termos precisam aparecer em algum lugar
  }
  return pontos;
}

export function filtrar(cursos: CursoCard[], planos: Plano[], f: Filtros): CursoCard[] {
  const termos = normalizar(f.q).split(/\s+/).filter((t) => t.length > 1);
  const plano = f.plano ? planos.find((p) => p.id === f.plano) : undefined;
  const pontos = new Map<number, number>();

  const resultado = cursos.filter((c) => {
    if (termos.length) {
      const p = pontuar(c, termos);
      if (!p) return false;
      pontos.set(c.id, p);
    }
    if (f.categorias.length && !f.categorias.includes(c.categoria.slug)) return false;
    if (f.niveis.length && !f.niveis.includes(c.nivel)) return false;
    if (f.duracoes.length) {
      const faixa = faixaDeDuracao(c.duracaoTotalSegundos);
      if (!faixa || !f.duracoes.includes(faixa)) return false;
    }
    if (f.ferramentas.length && !f.ferramentas.some((x) => c.ferramentas.includes(x))) return false;
    if (f.notaMinima && (c.totalAvaliacoes === 0 || c.notaMedia < f.notaMinima)) return false;
    if (f.plano && (!plano || !plano.cursos.includes(c.id))) return false;
    if (f.soPrevia && !c.temPrevia) return false;
    return true;
  });

  const porNumero = (a: CursoCard, b: CursoCard) => a.numero - b.numero;
  const comparadores: Record<Ordem, (a: CursoCard, b: CursoCard) => number> = {
    relevancia: (a, b) => (pontos.get(b.id) ?? 0) - (pontos.get(a.id) ?? 0) || porNumero(a, b),
    novos: (a, b) => (b.publicadoEm ?? "").localeCompare(a.publicadoEm ?? "") || porNumero(a, b),
    avaliados: (a, b) => b.notaMedia - a.notaMedia || b.totalAvaliacoes - a.totalAvaliacoes || porNumero(a, b),
    populares: (a, b) => b.totalAlunos - a.totalAlunos || porNumero(a, b),
  };
  return resultado.sort(comparadores[f.ordem]);
}

/** Opções que de fato existem no catálogo (nenhum filtro que dê sempre zero). */
export function opcoesDeFiltro(cursos: CursoCard[]) {
  const categorias = new Map<string, string>();
  const ferramentas = new Set<string>();
  const niveis = new Set<Nivel>();
  const duracoes = new Set<Duracao>();
  cursos.forEach((c) => {
    categorias.set(c.categoria.slug, c.categoria.nome);
    c.ferramentas.forEach((x) => ferramentas.add(x));
    niveis.add(c.nivel);
    const faixa = faixaDeDuracao(c.duracaoTotalSegundos);
    if (faixa) duracoes.add(faixa);
  });
  return {
    categorias: [...categorias].map(([slug, nome]) => ({ slug, nome })),
    ferramentas: [...ferramentas].sort((a, b) => a.localeCompare(b, "pt-BR")),
    niveis: [...niveis],
    duracoes: (Object.keys(DURACOES) as Duracao[]).filter((d) => duracoes.has(d)),
    temAvaliacoes: cursos.some((c) => c.totalAvaliacoes > 0),
    temPrevia: cursos.some((c) => c.temPrevia),
  };
}

// --- Recomendações ----------------------------------------------------------

export type Objetivo = "POSTAR_MAIS" | "VIDEOS" | "ARTES" | "VENDER_MAIS";
export type Familiaridade = "NUNCA_USEI" | "JA_USEI" | "USO_SEMPRE";

const CATEGORIAS_DO_OBJETIVO: Record<Objetivo, string[]> = {
  POSTAR_MAIS: ["conteudo", "design"],
  VIDEOS: ["video", "voz"],
  ARTES: ["design", "conteudo"],
  VENDER_MAIS: ["vendas", "conteudo"],
};

/**
 * Três cursos para quem respondeu o onboarding: quem nunca usou IA começa pelos
 * primeiros passos; depois, os cursos das categorias ligadas ao objetivo.
 */
export function recomendar(
  cursos: CursoCard[],
  perfil: { objetivo: Objetivo | null; familiaridade: Familiaridade | null },
  quantidade = 3,
): CursoCard[] {
  const escolhidos: CursoCard[] = [];
  const adicionar = (c?: CursoCard) => {
    if (c && !escolhidos.includes(c)) escolhidos.push(c);
  };
  if (perfil.familiaridade === "NUNCA_USEI") adicionar(cursos.find((c) => c.categoria.slug === "primeiros-passos"));
  const categorias = perfil.objetivo ? CATEGORIAS_DO_OBJETIVO[perfil.objetivo] : [];
  categorias.forEach((cat) => cursos.filter((c) => c.categoria.slug === cat).forEach(adicionar));
  cursos.filter((c) => c.destaque).forEach(adicionar);
  cursos.forEach(adicionar);
  return escolhidos.slice(0, quantidade);
}

/** Cursos parecidos: mesma categoria primeiro, depois ferramentas em comum. */
export function relacionados(cursos: CursoCard[], atual: CursoCard, quantidade = 3): CursoCard[] {
  const pontos = (c: CursoCard) =>
    (c.categoria.slug === atual.categoria.slug ? 3 : 0) + c.ferramentas.filter((x) => atual.ferramentas.includes(x)).length;
  return cursos
    .filter((c) => c.id !== atual.id)
    .sort((a, b) => pontos(b) - pontos(a) || a.numero - b.numero)
    .slice(0, quantidade);
}
