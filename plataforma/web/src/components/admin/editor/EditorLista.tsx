"use client";

import { useRef } from "react";
import { Icone } from "@/components/ui/Icone";
import { mover } from "@/lib/admin";

/**
 * Lista de frases curtas ("O que você vai aprender", requisitos...): um campo
 * por item, com subir/descer e remover. Enter num item cria o próximo.
 */
export function EditorLista({
  id,
  rotulo,
  ajuda,
  itens,
  aoMudar,
  maximo = 12,
  marcador = "Item",
  erro,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  itens: string[];
  aoMudar: (itens: string[]) => void;
  maximo?: number;
  /** Nome de cada item para leitores de tela ("Item 2", "Ferramenta 3"). */
  marcador?: string;
  erro?: string;
}) {
  const lista = useRef<HTMLOListElement>(null);

  function focar(indice: number) {
    requestAnimationFrame(() => lista.current?.querySelectorAll<HTMLInputElement>("input")[indice]?.focus());
  }

  function adicionar(depoisDe = itens.length - 1) {
    if (itens.length >= maximo) return;
    const novos = [...itens];
    novos.splice(depoisDe + 1, 0, "");
    aoMudar(novos);
    focar(depoisDe + 1);
  }

  return (
    <fieldset className={`editor-lista${erro ? " campo--erro" : ""}`} aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}>
      <legend className="campo__rotulo">{rotulo}</legend>
      {ajuda && (
        <p className="campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </p>
      )}
      <ol className="editor-lista__itens" ref={lista}>
        {itens.map((item, i) => (
          <li key={i} className="editor-lista__item">
            <input
              className="campo__entrada"
              aria-label={`${marcador} ${i + 1}`}
              value={item}
              maxLength={300}
              onChange={(e) => aoMudar(itens.map((v, j) => (j === i ? e.target.value : v)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionar(i);
                }
              }}
            />
            <button
              type="button"
              className="icone-botao"
              disabled={i === 0}
              onClick={() => {
                aoMudar(mover(itens, i, i - 1));
                focar(i - 1);
              }}
            >
              <Icone nome="cima" tamanho={16} />
              <span className="sr-only">Subir {marcador.toLowerCase()} {i + 1}</span>
            </button>
            <button
              type="button"
              className="icone-botao"
              disabled={i === itens.length - 1}
              onClick={() => {
                aoMudar(mover(itens, i, i + 1));
                focar(i + 1);
              }}
            >
              <Icone nome="baixo" tamanho={16} />
              <span className="sr-only">Descer {marcador.toLowerCase()} {i + 1}</span>
            </button>
            <button
              type="button"
              className="icone-botao icone-botao--perigo"
              onClick={() => {
                aoMudar(itens.filter((_, j) => j !== i));
                focar(Math.max(0, i - 1));
              }}
            >
              <Icone nome="fechar" tamanho={16} />
              <span className="sr-only">Remover {marcador.toLowerCase()} {i + 1}</span>
            </button>
          </li>
        ))}
      </ol>
      {erro && (
        <p className="campo__erro" id={`${id}-erro`}>
          {erro}
        </p>
      )}
      <button type="button" className="botao botao--fantasma botao--pequeno editor-lista__mais" disabled={itens.length >= maximo} onClick={() => adicionar()}>
        + Adicionar {marcador.toLowerCase()}
      </button>
    </fieldset>
  );
}
