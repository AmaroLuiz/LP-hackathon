"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";

/** Imprimir (ou salvar em PDF pela janela de impressão) e copiar o link de validação. */
export function AcoesCertificado() {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="acoes certificado__acoes">
      <Botao onClick={() => window.print()}>Salvar em PDF ou imprimir</Botao>
      <Botao
        variante="secundario"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        }}
      >
        <span aria-live="polite">{copiado ? "Link copiado" : "Copiar link de validação"}</span>
      </Botao>
    </div>
  );
}
