"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icone } from "@/components/ui/Icone";

/**
 * Faixa horizontal de cards (por categoria). Rola com o dedo, com a roda do
 * mouse + Shift, com Tab (cada card é um link) e com as setas.
 */
export function FaixaCursos({ titulo, id, acao, children }: { titulo: string; id: string; acao?: ReactNode; children: ReactNode }) {
  const trilho = useRef<HTMLUListElement>(null);
  const [inicio, setInicio] = useState(true);
  const [fim, setFim] = useState(false);

  const atualizar = useCallback(() => {
    const t = trilho.current;
    if (!t) return;
    setInicio(t.scrollLeft <= 4);
    setFim(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4);
  }, []);

  useEffect(() => {
    atualizar();
    const t = trilho.current;
    if (!t) return;
    const observador = new ResizeObserver(atualizar);
    observador.observe(t);
    return () => observador.disconnect();
  }, [atualizar]);

  const rolar = (sentido: 1 | -1) => {
    const t = trilho.current;
    if (!t) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.scrollBy({ left: sentido * t.clientWidth * 0.85, behavior: reduzir ? "auto" : "smooth" });
  };

  const unico = inicio && fim;

  return (
    <section className="faixa" aria-labelledby={id}>
      <div className="faixa__cabeca">
        <h2 id={id} className="subtitulo">
          {titulo}
        </h2>
        <div className="faixa__acoes">
          {acao}
          {!unico && (
            <>
              <button type="button" className="faixa__seta" onClick={() => rolar(-1)} disabled={inicio}>
                <Icone nome="esquerda" />
                <span className="sr-only">Cursos anteriores de {titulo}</span>
              </button>
              <button type="button" className="faixa__seta" onClick={() => rolar(1)} disabled={fim}>
                <Icone nome="direita" />
                <span className="sr-only">Próximos cursos de {titulo}</span>
              </button>
            </>
          )}
        </div>
      </div>
      <ul ref={trilho} className="faixa__trilho" onScroll={atualizar}>
        {children}
      </ul>
    </section>
  );
}
