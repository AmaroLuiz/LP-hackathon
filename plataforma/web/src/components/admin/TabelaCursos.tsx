"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Selo } from "@/components/ui/Exibicao";
import { STATUS_CURSO, type CursoLinha } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import { atualizadoEm, duracao } from "@/lib/formato";

type Acao = "publicar" | "despublicar" | "arquivar";

type Coluna = "titulo" | "status" | "aulas" | "alunos" | "nota" | "atualizado";

const VALOR: Record<Coluna, (c: CursoLinha) => string | number> = {
  titulo: (c) => c.numero,
  status: (c) => c.status,
  aulas: (c) => c.totalAulas,
  alunos: (c) => c.totalAlunos,
  nota: (c) => (c.totalAvaliacoes > 0 ? c.notaMedia : -1),
  atualizado: (c) => c.atualizadoEm,
};

/** Cabeçalho que ordena: um clique ordena, outro inverte (aria-sort diz a ordem atual). */
function Cabecalho({ coluna, ordem, aoOrdenar, numero, children }: { coluna: Coluna; ordem: { coluna: Coluna; crescente: boolean }; aoOrdenar: (c: Coluna) => void; numero?: boolean; children: React.ReactNode }) {
  const ativa = ordem.coluna === coluna;
  return (
    <th scope="col" className={numero ? "tabela__numero" : undefined} aria-sort={ativa ? (ordem.crescente ? "ascending" : "descending") : undefined}>
      <button type="button" className="tabela__ordenar" onClick={() => aoOrdenar(coluna)}>
        {children}
        <span className="tabela__seta" aria-hidden="true">
          {ativa ? (ordem.crescente ? "↑" : "↓") : ""}
        </span>
      </button>
    </th>
  );
}

const ACOES: Record<Acao, { rotulo: string; feito: string }> = {
  publicar: { rotulo: "Publicar", feito: "publicado" },
  despublicar: { rotulo: "Voltar para rascunho", feito: "voltou para rascunho" },
  arquivar: { rotulo: "Arquivar", feito: "arquivado" },
};

/** Tabela de cursos com seleção para ações em lote (publicar, despublicar, arquivar). */
export function TabelaCursos({ cursos }: { cursos: CursoLinha[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [ordem, setOrdem] = useState<{ coluna: Coluna; crescente: boolean }>({ coluna: "titulo", crescente: true });
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();
  const router = useRouter();

  const todos = cursos.length > 0 && selecionados.size === cursos.length;
  const ordenados = [...cursos].sort((a, b) => {
    const va = VALOR[ordem.coluna](a);
    const vb = VALOR[ordem.coluna](b);
    const comparacao = va < vb ? -1 : va > vb ? 1 : 0;
    return ordem.crescente ? comparacao : -comparacao;
  });
  const ordenar = (coluna: Coluna) => setOrdem((o) => ({ coluna, crescente: o.coluna === coluna ? !o.crescente : coluna === "titulo" || coluna === "status" }));

  function alternar(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function emLote(acao: Acao) {
    const alvo = cursos.filter((c) => selecionados.has(c.id));
    if (acao === "arquivar") {
      const ok = await confirmar({
        titulo: `Arquivar ${alvo.length === 1 ? "1 curso" : `${alvo.length} cursos`}?`,
        texto: "Cursos arquivados saem do site e deixam de abrir para os alunos. Dá para publicar de novo depois.",
        confirmar: "Arquivar",
        perigo: true,
      });
      if (!ok) return;
    }
    setOcupado(true);
    setFalhas([]);
    const erros: string[] = [];
    for (const c of alvo) {
      const r = await enviar(`/api/admin/cursos/${c.id}/${acao}`, {});
      if (!r.ok) erros.push(`${c.titulo}: ${r.mensagem}`);
    }
    setOcupado(false);
    setFalhas(erros);
    const certos = alvo.length - erros.length;
    if (certos > 0) avisar(`${certos === 1 ? "1 curso" : `${certos} cursos`}: ${ACOES[acao].feito}.`);
    setSelecionados(new Set());
    router.refresh();
  }

  return (
    <>
      {dialogo}
      <div className="lote" aria-live="polite">
        {selecionados.size > 0 ? (
          <>
            <span className="lote__total">{selecionados.size === 1 ? "1 selecionado" : `${selecionados.size} selecionados`}</span>
            {(Object.keys(ACOES) as Acao[]).map((a) => (
              <Botao key={a} pequeno variante={a === "arquivar" ? "perigo" : "secundario"} disabled={ocupado} onClick={() => emLote(a)}>
                {ACOES[a].rotulo}
              </Botao>
            ))}
            <button type="button" className="link link--sublinhado lote__limpar" onClick={() => setSelecionados(new Set())}>
              Limpar seleção
            </button>
          </>
        ) : (
          <span className="lote__dica">Marque cursos para publicar, despublicar ou arquivar vários de uma vez.</span>
        )}
      </div>
      {falhas.length > 0 && (
        <div className="aviso aviso--erro" role="alert">
          <span className="aviso__marca" aria-hidden="true" />
          <div>
            <p className="aviso__titulo">Alguns cursos não mudaram:</p>
            <ul className="aviso__texto">
              {falhas.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="tabela-moldura">
        <table className="tabela tabela--densa">
          <caption className="sr-only">Cursos cadastrados</caption>
          <thead>
            <tr>
              <th scope="col" className="tabela__marcar">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={todos}
                  onChange={() => setSelecionados(todos ? new Set() : new Set(cursos.map((c) => c.id)))}
                />
              </th>
              <Cabecalho coluna="titulo" ordem={ordem} aoOrdenar={ordenar}>
                Curso
              </Cabecalho>
              <Cabecalho coluna="status" ordem={ordem} aoOrdenar={ordenar}>
                Status
              </Cabecalho>
              <Cabecalho coluna="aulas" ordem={ordem} aoOrdenar={ordenar} numero>
                Aulas
              </Cabecalho>
              <Cabecalho coluna="alunos" ordem={ordem} aoOrdenar={ordenar} numero>
                Alunos
              </Cabecalho>
              <Cabecalho coluna="nota" ordem={ordem} aoOrdenar={ordenar} numero>
                Nota
              </Cabecalho>
              <Cabecalho coluna="atualizado" ordem={ordem} aoOrdenar={ordenar}>
                Atualizado
              </Cabecalho>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((c) => (
              <tr key={c.id} className={selecionados.has(c.id) ? "is-selecionada" : undefined}>
                <td className="tabela__marcar">
                  <input type="checkbox" aria-label={`Selecionar ${c.titulo}`} checked={selecionados.has(c.id)} onChange={() => alternar(c.id)} />
                </td>
                <td>
                  <div className="curso-linha">
                    <span className="curso-linha__capa">
                      {c.capaUrl && <Image src={c.capaUrl} alt="" fill sizes="5rem" />}
                      <span className="curso-linha__numero" aria-hidden="true">
                        {c.numero}
                      </span>
                    </span>
                    <span>
                      <Link href={`/admin/cursos/${c.id}`} className="link link--sublinhado curso-linha__titulo">
                        {c.titulo}
                      </Link>
                      <span className="curso-linha__meta">
                        {c.categoria}
                        {c.destaque && " · Em destaque na home"}
                      </span>
                    </span>
                  </div>
                </td>
                <td>
                  <Selo tom={STATUS_CURSO[c.status].tom}>{STATUS_CURSO[c.status].texto}</Selo>
                </td>
                <td className="tabela__numero">
                  {c.totalAulas}
                  {c.duracaoSegundos > 0 && <span className="tabela__detalhe">{duracao(c.duracaoSegundos)}</span>}
                </td>
                <td className="tabela__numero">{c.totalAlunos}</td>
                <td className="tabela__numero">{c.totalAvaliacoes > 0 ? c.notaMedia.toFixed(1).replace(".", ",") : "—"}</td>
                <td>{atualizadoEm(c.atualizadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
