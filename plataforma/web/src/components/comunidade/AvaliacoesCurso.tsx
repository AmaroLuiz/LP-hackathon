"use client";

import { useState } from "react";
import { Estrelas } from "@/components/ui/Exibicao";
import { NOTAS, percentualDaNota, type Avaliacoes } from "@/lib/comunidade";
import { dataPorExtenso, plural } from "@/lib/formato";

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Seção de avaliações da página do curso: média grande, distribuição 5→1 com
 * barras (cada barra filtra a lista), lista com "Ver mais". A primeira página
 * vem do servidor (em cache); filtro e páginas seguintes, do navegador.
 */
export function AvaliacoesCurso({ slug, inicial }: { slug: string; inicial: Avaliacoes }) {
  const [nota, setNota] = useState<number | null>(null);
  const [itens, setItens] = useState(inicial.itens);
  const [pagina, setPagina] = useState(1);
  const [totalFiltrado, setTotalFiltrado] = useState(inicial.totalFiltrado);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(novaNota: number | null, novaPagina: number) {
    setCarregando(true);
    setErro(null);
    const params = new URLSearchParams({ pagina: String(novaPagina) });
    if (novaNota) params.set("nota", String(novaNota));
    try {
      const r = await fetch(`/api/cursos/${slug}/avaliacoes?${params}`);
      if (!r.ok) throw new Error();
      const dados = (await r.json()) as Avaliacoes;
      setItens((atual) => (novaPagina === 1 ? dados.itens : [...atual, ...dados.itens]));
      setTotalFiltrado(dados.totalFiltrado);
      setPagina(novaPagina);
      setNota(novaNota);
    } catch {
      setErro("Não conseguimos carregar as avaliações. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  if (inicial.total === 0) {
    return (
      <p className="curso-bloco__resumo">
        Este curso ainda não tem avaliações. Elas aparecem aqui assim que os primeiros alunos avançarem no curso.
      </p>
    );
  }

  return (
    <div className="avaliacoes">
      <div className="avaliacoes__resumo">
        <p className="avaliacoes__media">
          <span className="avaliacoes__numero">{decimal.format(inicial.media)}</span>
          <Estrelas nota={inicial.media} />
          <span className="avaliacoes__total">{plural(inicial.total, "avaliação", "avaliações")}</span>
        </p>
        <ul className="avaliacoes__distribuicao" aria-label="Filtrar por nota">
          {NOTAS.map((n) => {
            const pct = percentualDaNota(inicial, n);
            const quantos = inicial.distribuicao[String(n)] ?? 0;
            return (
              <li key={n}>
                <button
                  type="button"
                  className="avaliacoes__barra"
                  aria-pressed={nota === n}
                  disabled={quantos === 0 || carregando}
                  onClick={() => buscar(nota === n ? null : n, 1)}
                >
                  <span className="avaliacoes__rotulo">
                    {n} {n === 1 ? "estrela" : "estrelas"}
                  </span>
                  <span className="avaliacoes__trilho" aria-hidden="true">
                    <span className="avaliacoes__feito" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="avaliacoes__pct">{pct}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="avaliacoes__lista-bloco" aria-live="polite" aria-busy={carregando}>
        {nota && (
          <p className="avaliacoes__filtro">
            Mostrando {plural(totalFiltrado, "avaliação", "avaliações")} de {nota} {nota === 1 ? "estrela" : "estrelas"}.{" "}
            <button type="button" className="link link--sublinhado" onClick={() => buscar(null, 1)}>
              Ver todas
            </button>
          </p>
        )}
        <ol className="avaliacoes__lista">
          {itens.map((a) => (
            <li key={a.id} className="avaliacao">
              <p className="avaliacao__topo">
                <span className="avaliacao__nome">{a.nome}</span>
                <Estrelas nota={a.nota} />
                <span className="avaliacao__data">{dataPorExtenso(a.criadoEm)}</span>
              </p>
              {a.comentario && <p className="avaliacao__comentario">{a.comentario}</p>}
              {a.respostaEquipe && (
                <div className="resposta resposta--equipe">
                  <p className="resposta__autor">
                    Equipe PotencIA<span className="resposta__expoente" aria-hidden="true" />
                  </p>
                  <p className="resposta__texto">{a.respostaEquipe}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
        {erro && <p className="campo__erro">{erro}</p>}
        {itens.length < totalFiltrado && (
          <button
            type="button"
            className="botao botao--secundario botao--pequeno"
            disabled={carregando}
            onClick={() => buscar(nota, pagina + 1)}
          >
            {carregando ? "Carregando…" : "Ver mais avaliações"}
          </button>
        )}
      </div>
    </div>
  );
}
