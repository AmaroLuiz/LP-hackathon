"use client";

import { useState } from "react";
import { Icone } from "@/components/ui/Icone";

/** Compartilha pelo menu do aparelho; sem ele, copia o link. */
export function BotaoCompartilhar({ titulo }: { titulo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: `${titulo} · PotencIA`, url });
        return;
      } catch {
        // Cancelado pelo usuário: não faz nada.
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <button type="button" className="botao botao--fantasma botao--pequeno compartilhar" onClick={compartilhar}>
      <Icone nome="compartilhar" tamanho={18} />
      <span aria-live="polite">{copiado ? "Link copiado" : "Compartilhar"}</span>
    </button>
  );
}
