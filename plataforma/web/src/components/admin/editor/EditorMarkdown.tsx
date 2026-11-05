"use client";

import { useState } from "react";
import { TextoMarkdown } from "@/components/ui/TextoMarkdown";

/**
 * Texto em Markdown simples, com "Ver como fica" ao lado. A página renderiza
 * com o mesmo componente (sem HTML cru), então a pré-visualização é fiel.
 */
export function EditorMarkdown({
  id,
  rotulo,
  valor,
  aoMudar,
  maximo,
  linhas = 10,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  maximo: number;
  linhas?: number;
  erro?: string;
}) {
  const [vendo, setVendo] = useState(false);
  return (
    <div className={`campo editor-markdown${erro ? " campo--erro" : ""}`}>
      <div className="editor-markdown__cabeca">
        <label className="campo__rotulo" htmlFor={id}>
          {rotulo}
        </label>
        <div className="alternancia" role="group" aria-label={`Modo de ${rotulo.toLowerCase()}`}>
          <button type="button" aria-pressed={!vendo} onClick={() => setVendo(false)}>
            Escrever
          </button>
          <button type="button" aria-pressed={vendo} onClick={() => setVendo(true)}>
            Ver como fica
          </button>
        </div>
      </div>
      {vendo ? (
        <div className="editor-markdown__previa" aria-live="polite">
          {valor.trim() ? <TextoMarkdown texto={valor} /> : <p className="campo__ajuda">Nada escrito ainda.</p>}
        </div>
      ) : (
        <textarea
          id={id}
          className="campo__entrada campo__area"
          rows={linhas}
          maxLength={maximo}
          value={valor}
          aria-invalid={erro ? true : undefined}
          aria-describedby={`${id}-ajuda${erro ? ` ${id}-erro` : ""}`}
          onChange={(e) => aoMudar(e.target.value)}
        />
      )}
      {erro && (
        <p className="campo__erro" id={`${id}-erro`}>
          {erro}
        </p>
      )}
      <p className="campo__ajuda" id={`${id}-ajuda`}>
        Linha em branco separa parágrafos. Comece a linha com &quot;- &quot; para lista e use **duas estrelas** para negrito.{" "}
        <span className="tabela__numero">
          {valor.length.toLocaleString("pt-BR")}/{maximo.toLocaleString("pt-BR")}
        </span>
      </p>
    </div>
  );
}
