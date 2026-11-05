"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Erro inesperado numa página (por exemplo, a API fora do ar). */
export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="secao" data-chao="preto" aria-labelledby="erro-titulo">
      <header className="topo">
        <p className="olho">Algo saiu do lugar</p>
        <h1 id="erro-titulo" className="titulo">
          Não conseguimos carregar esta página agora.
        </h1>
        <p className="topo__apoio">
          Pode ser uma instabilidade rápida no servidor. Tente de novo em alguns segundos.
        </p>
        <div className="acoes">
          <button type="button" className="botao botao--principal" onClick={() => retry()}>
            Tentar de novo
          </button>
          <Link href="/" className="botao botao--secundario">
            Ir para o início
          </Link>
        </div>
      </header>
    </section>
  );
}
