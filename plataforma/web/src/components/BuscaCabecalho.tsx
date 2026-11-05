"use client";

import Form from "next/form";
import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/ui/Icone";

/**
 * Busca do cabeçalho: um ícone que abre o campo. Sem JavaScript, o formulário
 * continua funcionando (GET em /cursos?q=...).
 */
export function BuscaCabecalho() {
  const [aberta, setAberta] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberta) campo.current?.focus();
  }, [aberta]);

  return (
    <Form action="/cursos" role="search" className={`busca-cabecalho${aberta ? " is-aberta" : ""}`}>
      <label htmlFor="busca-cabecalho" className="sr-only">
        Buscar cursos
      </label>
      <input
        ref={campo}
        id="busca-cabecalho"
        name="q"
        type="search"
        placeholder="Buscar cursos"
        className="busca-cabecalho__campo"
        tabIndex={aberta ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAberta(false);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.value) setAberta(false);
        }}
      />
      <button
        type={aberta ? "submit" : "button"}
        className="busca-cabecalho__botao"
        aria-expanded={aberta}
        aria-controls="busca-cabecalho"
        onClick={() => {
          if (!aberta) setAberta(true);
        }}
      >
        <Icone nome="busca" />
        <span className="sr-only">{aberta ? "Buscar" : "Abrir busca"}</span>
      </button>
    </Form>
  );
}
