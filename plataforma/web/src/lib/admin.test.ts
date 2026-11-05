// Testes das regras puras do painel (endereço, reordenação do currículo,
// duração e tamanho de arquivo). Rodam com o test runner do Node: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AulaAdmin, ModuloAdmin } from "./admin.ts";
import { lerDuracao, mover, moverAula, slugDe, tamanhoArquivo } from "./admin.ts";
import { centavosDe, preco } from "./formato.ts";

function aula(id: number): AulaAdmin {
  return {
    id,
    ordem: id,
    titulo: `Aula ${id}`,
    tipo: "VIDEO",
    resumo: null,
    conteudo: null,
    videoId: null,
    duracaoSegundos: null,
    previa: false,
    legendaUrl: null,
    publicada: true,
    materiais: [],
  };
}

function modulo(id: number, aulas: number[]): ModuloAdmin {
  return { id, ordem: id, titulo: `Módulo ${id}`, descricao: null, aulas: aulas.map(aula) };
}

const ids = (modulos: ModuloAdmin[]) => modulos.map((m) => m.aulas.map((a) => a.id));

describe("slugDe", () => {
  it("tira acentos, pontuação e espaços, como a API", () => {
    assert.equal(slugDe("Edição de Takes Reais!"), "edicao-de-takes-reais");
    assert.equal(slugDe("  Vídeos   em motion  "), "videos-em-motion");
    assert.equal(slugDe("???"), "curso");
  });
});

describe("mover", () => {
  it("leva o item para a nova posição sem perder ninguém", () => {
    assert.deepEqual(mover(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(mover(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
    assert.deepEqual(mover(["a", "b"], 5, 0), ["a", "b"]);
  });
});

describe("moverAula", () => {
  const base = [modulo(1, [10, 11, 12]), modulo(2, [20])];

  it("desce dentro do mesmo módulo (soltar depois da próxima)", () => {
    assert.deepEqual(ids(moverAula(base, 10, 1, 2)), [[11, 10, 12], [20]]);
  });

  it("sobe dentro do mesmo módulo", () => {
    assert.deepEqual(ids(moverAula(base, 12, 1, 0)), [[12, 10, 11], [20]]);
  });

  it("passa para outro módulo, na posição pedida", () => {
    assert.deepEqual(ids(moverAula(base, 11, 2, 0)), [[10, 12], [11, 20]]);
    assert.deepEqual(ids(moverAula(base, 11, 2, 1)), [[10, 12], [20, 11]]);
  });

  it("entra num módulo vazio", () => {
    const comVazio = [...base, modulo(3, [])];
    assert.deepEqual(ids(moverAula(comVazio, 20, 3, 0)), [[10, 11, 12], [], [20]]);
  });

  it("soltar no mesmo lugar não muda nada", () => {
    assert.deepEqual(ids(moverAula(base, 11, 1, 1)), ids(base));
    assert.deepEqual(ids(moverAula(base, 11, 1, 2)), ids(base));
  });
});

describe("lerDuracao", () => {
  it("entende min:seg e h:min:seg", () => {
    assert.equal(lerDuracao("12:05"), 725);
    assert.equal(lerDuracao("1:02:05"), 3725);
    assert.equal(lerDuracao(""), null);
  });

  it("recusa formatos que não são tempo", () => {
    assert.ok(Number.isNaN(lerDuracao("12")));
    assert.ok(Number.isNaN(lerDuracao("5:75")));
    assert.ok(Number.isNaN(lerDuracao("cinco minutos")));
  });
});

describe("tamanhoArquivo", () => {
  it("escreve em bytes, KB e MB, com vírgula", () => {
    assert.equal(tamanhoArquivo(512), "512 bytes");
    assert.equal(tamanhoArquivo(1536), "1,5 KB");
    assert.equal(tamanhoArquivo(5 * 1024 * 1024), "5 MB");
    assert.equal(tamanhoArquivo(null), "");
  });
});

describe("centavosDe", () => {
  it("entende o preço como o admin digita", () => {
    assert.equal(centavosDe("89"), 8900);
    assert.equal(centavosDe("89,9"), 8990);
    assert.equal(centavosDe("R$ 149,90"), 14990);
    assert.equal(centavosDe("89.90"), 8990);
    assert.equal(centavosDe("1.490,00"), 149000);
    assert.equal(centavosDe("1.490"), 149000);
    assert.equal(centavosDe(""), null);
    assert.equal(centavosDe("abc"), null);
  });
});

describe("preco", () => {
  it("esconde os centavos em valores redondos e mostra quando existem", () => {
    // Intl usa espaço não separável entre "R$" e o número.
    const limpo = (s: string) => s.replace(/\s/g, " ");
    assert.equal(limpo(preco(8900)), "R$ 89");
    assert.equal(limpo(preco(6230)), "R$ 62,30");
    assert.equal(limpo(preco(4450)), "R$ 44,50");
  });
});
