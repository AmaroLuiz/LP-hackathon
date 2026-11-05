"use client";

import { useId, useRef, useState, type ReactNode } from "react";

type Aba = { id: string; rotulo: ReactNode; conteudo: ReactNode };

/**
 * Abas no padrão WAI-ARIA: setas esquerda/direita, Home e End trocam de aba;
 * só a aba ativa entra no Tab. Todos os painéis ficam montados (o que foi
 * digitado numa aba continua lá ao voltar). Pode ser controlada por fora
 * (`ativa` + `aoTrocar`).
 */
export function Abas({
  abas,
  rotulo,
  ativa: ativaExterna,
  aoTrocar,
}: {
  abas: Aba[];
  rotulo: string;
  ativa?: string;
  aoTrocar?: (id: string) => void;
}) {
  const [ativaInterna, setAtivaInterna] = useState(abas[0]?.id);
  const ativa = ativaExterna ?? ativaInterna;
  const base = useId();
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);

  function trocar(id: string) {
    setAtivaInterna(id);
    aoTrocar?.(id);
  }

  function teclado(e: React.KeyboardEvent, indice: number) {
    const ultimo = abas.length - 1;
    const destino =
      e.key === "ArrowRight" ? (indice === ultimo ? 0 : indice + 1)
      : e.key === "ArrowLeft" ? (indice === 0 ? ultimo : indice - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? ultimo
      : null;
    if (destino === null) return;
    e.preventDefault();
    trocar(abas[destino].id);
    botoes.current[destino]?.focus();
  }

  return (
    <div className="abas">
      <div role="tablist" aria-label={rotulo} className="abas__lista">
        {abas.map((aba, i) => (
          <button
            key={aba.id}
            ref={(el) => {
              botoes.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-aba-${aba.id}`}
            aria-selected={ativa === aba.id}
            aria-controls={`${base}-painel-${aba.id}`}
            tabIndex={ativa === aba.id ? 0 : -1}
            className="abas__aba"
            onClick={() => trocar(aba.id)}
            onKeyDown={(e) => teclado(e, i)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>
      {abas.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={`${base}-painel-${aba.id}`}
          aria-labelledby={`${base}-aba-${aba.id}`}
          hidden={ativa !== aba.id}
          tabIndex={0}
          className="abas__painel"
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
