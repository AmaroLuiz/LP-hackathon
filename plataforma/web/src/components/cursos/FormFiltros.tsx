"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

/**
 * Formulário de filtros do catálogo. Com JavaScript, aplica sozinho a cada
 * mudança (texto com pequena espera) e limpa os parâmetros vazios da URL.
 * Sem JavaScript, é um GET comum em /cursos com o botão "Aplicar".
 *
 * `estado` é a query string atual: quando ela muda por fora (chip removido,
 * "Limpar tudo", voltar do navegador), as caixas e o texto acompanham.
 */
export function FormFiltros({ estado, children }: { estado: string; children: ReactNode }) {
  const router = useRouter();
  const formulario = useRef<HTMLFormElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [carregando, iniciar] = useTransition();

  useEffect(() => {
    const form = formulario.current;
    if (!form) return;
    const params = new URLSearchParams(estado);
    for (const el of Array.from(form.elements)) {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        const valores = params.getAll(el.name);
        el.checked = el.value === "" ? valores.length === 0 : valores.includes(el.value);
      } else if (el instanceof HTMLInputElement && el.type === "search" && document.activeElement !== el) {
        el.value = params.get(el.name) ?? "";
      } else if (el instanceof HTMLSelectElement) {
        el.value = params.get(el.name) ?? el.options[0]?.value ?? "";
      }
    }
  }, [estado]);

  function aplicar() {
    const form = formulario.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [nome, valor] of new FormData(form)) {
      // A página volta para a 1 a cada mudança de filtro.
      if (typeof valor === "string" && valor !== "" && nome !== "pagina" && !(nome === "ordem" && valor === "relevancia")) {
        params.append(nome, valor);
      }
    }
    const texto = params.toString();
    iniciar(() => router.push(texto ? `/cursos?${texto}` : "/cursos", { scroll: false }));
  }

  return (
    <form
      ref={formulario}
      id="filtros"
      action="/cursos"
      className="filtros"
      aria-busy={carregando || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        aplicar();
      }}
      onChange={(e) => {
        clearTimeout(espera.current);
        const alvo: EventTarget = e.target;
        const digitando = alvo instanceof HTMLInputElement && alvo.type === "search";
        espera.current = setTimeout(aplicar, digitando ? 450 : 0);
      }}
    >
      {children}
    </form>
  );
}

/** Ordenação: fica fora do <form> (atributo form="filtros") e o envia ao mudar. */
export function SeletorOrdem({ valor, opcoes }: { valor: string; opcoes: Record<string, string> }) {
  return (
    <select
      name="ordem"
      form="filtros"
      defaultValue={valor}
      className="seletor"
      onChange={() => (document.getElementById("filtros") as HTMLFormElement | null)?.requestSubmit()}
    >
      {Object.entries(opcoes).map(([v, rotulo]) => (
        <option key={v} value={v}>
          {rotulo}
        </option>
      ))}
    </select>
  );
}
