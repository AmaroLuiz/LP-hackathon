import type { ReactNode } from "react";

// Peças pequenas de exibição: selo, estrelas, progresso, aviso, esqueleto,
// estado vazio e acordeão. Todas sem JavaScript no navegador.

export function Selo({
  tom = "neutro",
  children,
}: {
  tom?: "neutro" | "ouro" | "salvia" | "erro";
  children: ReactNode;
}) {
  return <span className={`selo selo--${tom}`}>{children}</span>;
}

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota de 0 a 5 em estrelas douradas, com o número ao lado para leitores de tela e para quem não vê cor. */
export function Estrelas({ nota, total }: { nota: number; total?: number }) {
  const largura = `${Math.max(0, Math.min(5, nota)) * 20}%`;
  return (
    <span className="estrelas">
      <span className="estrelas__nota">{decimal.format(nota)}</span>
      <span className="estrelas__trilho" aria-hidden="true">
        <span className="estrelas__cheias" style={{ width: largura }} />
      </span>
      <span className="sr-only">
        Nota {decimal.format(nota)} de 5{total !== undefined ? `, ${total} avaliações` : ""}
      </span>
      {total !== undefined && (
        <span className="estrelas__total" aria-hidden="true">
          ({total})
        </span>
      )}
    </span>
  );
}

export function BarraProgresso({ valor, rotulo }: { valor: number; rotulo: string }) {
  const pct = Math.round(Math.max(0, Math.min(100, valor)));
  return (
    <div className="progresso">
      <div
        className="progresso__trilho"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={rotulo}
      >
        <span className="progresso__feito" style={{ width: `${pct}%` }} />
      </div>
      <span className="progresso__texto">{pct}% concluído</span>
    </div>
  );
}

/** Mensagem dentro da página. Erro é anunciado na hora (alert); o resto, com calma (status). */
export function Aviso({
  tipo = "info",
  titulo,
  children,
}: {
  tipo?: "info" | "sucesso" | "erro";
  titulo?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === "erro" ? "alert" : "status"} tabIndex={tipo === "erro" ? -1 : undefined}>
      <span className="aviso__marca" aria-hidden="true" />
      <div>
        {titulo && <p className="aviso__titulo">{titulo}</p>}
        {children && <div className="aviso__texto">{children}</div>}
      </div>
    </div>
  );
}

export function Esqueleto({ largura = "100%", altura = "1em", proporcao }: { largura?: string; altura?: string; proporcao?: string }) {
  return (
    <span
      className="esqueleto"
      aria-hidden="true"
      style={proporcao ? { width: largura, aspectRatio: proporcao } : { width: largura, height: altura }}
    />
  );
}

export function EstadoVazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <p className="vazio__titulo">{titulo}</p>
      {children && <div className="vazio__texto">{children}</div>}
      {acao && <div className="vazio__acao">{acao}</div>}
    </div>
  );
}

/** Acordeão nativo (details/summary): teclado e leitor de tela sem JavaScript. */
export function Acordeao({
  titulo,
  detalhe,
  aberto,
  children,
}: {
  titulo: ReactNode;
  detalhe?: ReactNode;
  aberto?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="acordeao" open={aberto}>
      <summary className="acordeao__cabeca">
        <span className="acordeao__titulo">{titulo}</span>
        {detalhe && <span className="acordeao__detalhe">{detalhe}</span>}
        <span className="acordeao__sinal" aria-hidden="true" />
      </summary>
      <div className="acordeao__corpo">{children}</div>
    </details>
  );
}
