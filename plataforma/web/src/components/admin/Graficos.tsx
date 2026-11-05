import type { ReactNode } from "react";

// Gráficos simples do painel, em HTML e CSS (sem biblioteca): uma série por
// gráfico, barras finas em sálvia, valor na ponta e tabela equivalente logo
// abaixo para leitores de tela e para quem prefere números.

export function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className="indicador">
      <p className="indicador__rotulo">{rotulo}</p>
      <p className="indicador__valor">{valor}</p>
      {detalhe && <p className="indicador__detalhe">{detalhe}</p>}
    </div>
  );
}

type Barra = { rotulo: string; valor: number; texto?: string };

/** Comparação de magnitudes: uma barra por linha, valor escrito na ponta. */
export function BarrasHorizontais({ titulo, barras, maximo, vazio }: { titulo: string; barras: Barra[]; maximo?: number; vazio: string }) {
  if (barras.length === 0) return <p className="grafico__vazio">{vazio}</p>;
  const topo = Math.max(maximo ?? 0, ...barras.map((b) => b.valor), 1);
  return (
    <figure className="grafico">
      <figcaption className="sr-only">{titulo}</figcaption>
      <ul className="barras" aria-hidden="true">
        {barras.map((b) => (
          <li key={b.rotulo} className="barras__linha">
            <span className="barras__rotulo">{b.rotulo}</span>
            <span className="barras__trilho">
              <span className="barras__barra" style={{ width: `${(b.valor / topo) * 100}%` }} />
              <span className="barras__valor">{b.texto ?? b.valor}</span>
            </span>
          </li>
        ))}
      </ul>
      <TabelaEquivalente titulo={titulo} colunas={["Item", "Valor"]} linhas={barras.map((b) => [b.rotulo, b.texto ?? String(b.valor)])} />
    </figure>
  );
}

/** Evolução por dia (colunas). Passe o mouse numa coluna para ver o dia e o valor. */
export function ColunasPorDia({ titulo, dias }: { titulo: string; dias: { rotulo: string; valor: number }[] }) {
  const topo = Math.max(...dias.map((d) => d.valor), 1);
  const marcas = [topo, Math.round(topo / 2), 0].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <figure className="grafico">
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className="colunas" aria-hidden="true">
        <div className="colunas__eixo">
          {marcas.map((m) => (
            <span key={m} style={{ bottom: `${(m / topo) * 100}%` }}>
              {m}
            </span>
          ))}
        </div>
        <ol className="colunas__area">
          {dias.map((d) => (
            <li key={d.rotulo} className="colunas__dia" data-dica={`${d.rotulo}: ${d.valor}`}>
              <span className="colunas__coluna" style={{ height: `${(d.valor / topo) * 100}%` }} />
            </li>
          ))}
        </ol>
        <div className="colunas__datas">
          <span>{dias[0]?.rotulo}</span>
          <span>{dias[dias.length - 1]?.rotulo}</span>
        </div>
      </div>
      <TabelaEquivalente titulo={titulo} colunas={["Dia", "Cadastros"]} linhas={dias.map((d) => [d.rotulo, String(d.valor)])} />
    </figure>
  );
}

function TabelaEquivalente({ titulo, colunas, linhas }: { titulo: string; colunas: [string, string]; linhas: string[][] }) {
  return (
    <details className="grafico__tabela">
      <summary>Ver em tabela</summary>
      <div className="tabela-moldura">
        <table className="tabela tabela--densa">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr>
              <th scope="col">{colunas[0]}</th>
              <th scope="col" className="tabela__numero">
                {colunas[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(([a, b]) => (
              <tr key={a}>
                <td>{a}</td>
                <td className="tabela__numero">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
