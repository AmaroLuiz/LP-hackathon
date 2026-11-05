"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Erro inesperado no painel (por exemplo, a API fora do ar). */
export default function ErroPainel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="painel-pagina" aria-labelledby="erro-titulo">
      <header className="painel-topo">
        <p className="olho">Algo saiu do lugar</p>
        <h1 id="erro-titulo" className="painel-topo__titulo">
          Não conseguimos carregar esta tela.
        </h1>
        <p className="painel-topo__apoio">
          A API pode estar fora do ar ou reiniciando. Confira se ela está rodando e tente de novo.
        </p>
      </header>
      <div className="acoes">
        <button type="button" className="botao botao--principal" onClick={() => retry()}>
          Tentar de novo
        </button>
        <Link href="/admin" className="botao botao--secundario">
          Voltar à visão geral
        </Link>
      </div>
    </section>
  );
}
