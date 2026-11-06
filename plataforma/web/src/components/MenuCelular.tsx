"use client";

import Form from "next/form";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AoNavegar } from "@/components/AoNavegar";
import { Icone } from "@/components/ui/Icone";
import { naLanding } from "@/lib/landing";

/**
 * Menu do celular em tela cheia: navegação, busca e a área da conta (que vem
 * pronta do servidor como `conta`). Fecha com Esc, ao navegar ou no botão.
 * Vai para o <body> por portal: dentro da pílula (que tem backdrop-filter),
 * position: fixed ficaria preso ao tamanho dela.
 */
export function MenuCelular({ conta }: { conta: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  // false no servidor, true no navegador (o portal precisa do document).
  const noNavegador = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Fecha ao trocar de página (função estável: ver AoNavegar).
  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    painel.current?.querySelector<HTMLElement>("a, button, input")?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <>
      <AoNavegar aoMudar={fechar} />
      <button
        ref={botao}
        type="button"
        className="cabecalho__menu"
        aria-expanded={aberto}
        aria-controls="menu-celular"
        onClick={() => setAberto((a) => !a)}
      >
        <Icone nome={aberto ? "fechar" : "menu"} />
        <span className="sr-only">{aberto ? "Fechar menu" : "Abrir menu"}</span>
      </button>
      {noNavegador &&
        createPortal(
      <div
        id="menu-celular"
        ref={painel}
        className="menu-celular"
        data-chao="preto"
        hidden={!aberto}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <Form action="/cursos" role="search" className="menu-celular__busca">
          <label htmlFor="busca-celular" className="sr-only">
            Buscar cursos
          </label>
          <input id="busca-celular" name="q" type="search" placeholder="Buscar cursos" className="campo__entrada" />
          <button type="submit" className="botao botao--secundario">
            <Icone nome="busca" />
            <span className="sr-only">Buscar</span>
          </button>
        </Form>
        <nav aria-label="Principal no celular">
          <ul className="menu-celular__lista">
            <li>
              <Link href="/cursos">Todos os cursos</Link>
            </li>
            <li>
              <Link href="/planos">Planos</Link>
            </li>
            <li>
              <a href={naLanding()}>Sobre a PotencIA</a>
            </li>
          </ul>
        </nav>
        <div className="menu-celular__conta" onClick={(e) => (e.target as HTMLElement).closest("a") && setAberto(false)}>
          {conta}
        </div>
      </div>,
          document.body,
        )}
    </>
  );
}
