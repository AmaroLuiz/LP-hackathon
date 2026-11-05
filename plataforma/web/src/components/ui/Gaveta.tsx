"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icone } from "./Icone";

/**
 * Gaveta lateral com o <dialog> nativo (prende o foco, fecha com Esc e devolve
 * o foco para quem abriu). No celular ocupa a tela; no desktop, a lateral direita.
 */
export function Gaveta({
  aberta,
  aoFechar,
  titulo,
  rodape,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  /** Ações fixas no pé da gaveta (Salvar, Cancelar). */
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
    // Ao sair da tela (desmontar, ou a página ficar escondida pelo Next ao
    // navegar), fecha: um <dialog> modal aberto e invisível bloquearia os cliques.
    return () => {
      if (d.open) d.close();
    };
  }, [aberta]);

  return (
    <dialog
      ref={dialogo}
      className="gaveta"
      data-chao="papel"
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === dialogo.current) aoFechar();
      }}
    >
      <div className="gaveta__caixa">
        <header className="gaveta__cabeca">
          <h2 id={idTitulo} className="gaveta__titulo">
            {titulo}
          </h2>
          <button type="button" className="gaveta__fechar" onClick={aoFechar}>
            <Icone nome="fechar" />
            <span className="sr-only">Fechar</span>
          </button>
        </header>
        <div className="gaveta__corpo">{aberta && children}</div>
        {rodape && <footer className="gaveta__rodape">{rodape}</footer>}
      </div>
    </dialog>
  );
}
