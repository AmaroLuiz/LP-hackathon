// Testes da busca, dos filtros e das recomendações. Rodam com o test runner do
// próprio Node (sem dependências): npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CursoCard, Plano } from "./api.ts";
import { filtrar, lerFiltros, normalizar, recomendar, relacionados, urlDosFiltros } from "./catalogo.ts";

function curso(parcial: Partial<CursoCard> & Pick<CursoCard, "id" | "numero" | "titulo">): CursoCard {
  return {
    slug: parcial.titulo.toLowerCase().replace(/\s+/g, "-"),
    subtitulo: "",
    capaUrl: null,
    capaAlt: null,
    nivel: "INICIANTE",
    categoria: { slug: "conteudo", nome: "Conteúdo" },
    instrutores: ["Equipe PotencIA"],
    notaMedia: 0,
    totalAvaliacoes: 0,
    totalAlunos: 0,
    totalAulas: 0,
    duracaoTotalSegundos: 0,
    ferramentas: ["Claude"],
    temPrevia: false,
    destaque: false,
    publicadoEm: "2026-10-01T00:00:00Z",
    ...parcial,
  };
}

const CURSOS: CursoCard[] = [
  curso({ id: 1, numero: 0, titulo: "Primeiros passos", categoria: { slug: "primeiros-passos", nome: "Primeiros passos" }, ferramentas: ["Claude", "GitHub"], temPrevia: true, duracaoTotalSegundos: 2400, totalAulas: 5 }),
  curso({ id: 2, numero: 1, titulo: "Estratégia de conteúdo" }),
  curso({ id: 3, numero: 2, titulo: "Vídeos em motion", categoria: { slug: "video", nome: "Vídeo" }, ferramentas: ["Claude", "Remotion"], duracaoTotalSegundos: 7200, totalAulas: 5, notaMedia: 4.8, totalAvaliacoes: 10, publicadoEm: "2026-10-20T00:00:00Z" }),
  curso({ id: 4, numero: 3, titulo: "Edição de takes reais", categoria: { slug: "video", nome: "Vídeo" }, ferramentas: ["Claude", "Remotion"], totalAlunos: 50 }),
  curso({ id: 5, numero: 6, titulo: "Da postagem à venda", categoria: { slug: "vendas", nome: "Vendas" }, destaque: true }),
];

const PLANOS: Plano[] = [
  { id: "essencial", nome: "Essencial", precoCentavos: 4900, maxPessoas: 1, itens: [], cursos: [1, 2] },
  { id: "completo", nome: "Completo", precoCentavos: 8900, maxPessoas: 1, itens: [], cursos: [1, 2, 3, 4, 5] },
];

const ids = (lista: CursoCard[]) => lista.map((c) => c.id);

describe("busca", () => {
  it("ignora acentos e maiúsculas", () => {
    assert.equal(normalizar("EDIÇÃO de Vídeo"), "edicao de video");
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ q: "edicao" }))), [4]);
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ q: "VÍDEOS" }))), [3]);
  });

  it("encontra pela ferramenta e põe o título na frente", () => {
    const r = filtrar(CURSOS, PLANOS, lerFiltros({ q: "remotion" }));
    assert.deepEqual(ids(r), [3, 4]);
  });

  it("exige todos os termos", () => {
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ q: "motion github" }))), []);
  });
});

describe("filtros", () => {
  it("combina tema, duração e prévia", () => {
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ categoria: ["video", "vendas"] }))), [3, 4, 5]);
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ duracao: "1-3h" }))), [3]);
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ previa: "1" }))), [1]);
  });

  it("filtra pelo plano e pela nota mínima", () => {
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ plano: "essencial" }))), [1, 2]);
    assert.deepEqual(ids(filtrar(CURSOS, PLANOS, lerFiltros({ nota: "4.5" }))), [3]);
  });

  it("descarta valores inválidos da URL", () => {
    const f = lerFiltros({ nivel: "MESTRE", nota: "2", ordem: "aleatoria", pagina: "-3", duracao: "10h" });
    assert.deepEqual(f.niveis, []);
    assert.equal(f.notaMinima, null);
    assert.equal(f.ordem, "relevancia");
    assert.equal(f.pagina, 1);
    assert.deepEqual(f.duracoes, []);
  });

  it("monta a URL de volta sem parâmetros vazios", () => {
    const f = lerFiltros({ q: "reels", categoria: ["video"], ordem: "novos" });
    assert.equal(urlDosFiltros(f), "/cursos?q=reels&categoria=video&ordem=novos");
    assert.equal(urlDosFiltros(f, { q: "", categorias: [], ordem: "relevancia" }), "/cursos");
  });
});

describe("ordenação", () => {
  it("ordena por novidade, nota e popularidade", () => {
    assert.equal(filtrar(CURSOS, PLANOS, lerFiltros({ ordem: "novos" }))[0].id, 3);
    assert.equal(filtrar(CURSOS, PLANOS, lerFiltros({ ordem: "avaliados" }))[0].id, 3);
    assert.equal(filtrar(CURSOS, PLANOS, lerFiltros({ ordem: "populares" }))[0].id, 4);
  });
});

describe("recomendações", () => {
  it("quem nunca usou IA começa pelos primeiros passos", () => {
    const r = recomendar(CURSOS, { objetivo: "VIDEOS", familiaridade: "NUNCA_USEI" });
    assert.deepEqual(ids(r), [1, 3, 4]);
  });

  it("sem perfil, cai nos destaques e depois na ordem do catálogo", () => {
    assert.deepEqual(ids(recomendar(CURSOS, { objetivo: null, familiaridade: null })), [5, 1, 2]);
  });

  it("relacionados priorizam a mesma categoria e nunca repetem o curso atual", () => {
    const r = relacionados(CURSOS, CURSOS[2]);
    assert.equal(r[0].id, 4);
    assert.ok(!ids(r).includes(3));
  });
});
