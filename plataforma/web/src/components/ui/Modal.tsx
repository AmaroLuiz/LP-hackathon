"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icone } from "./Icone";

/**
 * Modal com o <dialog> nativo: prende o foco, fecha com Esc e devolve o foco
 * para quem abriu. Clicar no fundo também fecha. Escuro por padrão (vitrine e
 * player); `chao="papel"` no painel admin.
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  largo,
  chao,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  largo?: boolean;
  chao?: "papel";
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
    // Ao sair da tela (desmontar, ou a página ficar escondida pelo Next ao
    // navegar), fecha: um <dialog> modal aberto e invisível bloquearia os cliques.
    return () => {
      if (d.open) d.close();
    };
  }, [aberto]);

  return (
    <dialog
      ref={dialogo}
      className={`modal${largo ? " modal--largo" : ""}`}
      data-chao={chao}
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === dialogo.current) aoFechar();
      }}
    >
      <div className="modal__caixa">
        <header className="modal__cabeca">
          <h2 id={idTitulo} className="modal__titulo">
            {titulo}
          </h2>
          <button type="button" className="modal__fechar" onClick={aoFechar}>
            <Icone nome="fechar" />
            <span className="sr-only">Fechar</span>
          </button>
        </header>
        {aberto && children}
      </div>
    </dialog>
  );
}
