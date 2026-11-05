"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icone } from "@/components/ui/Icone";

const ITENS = [
  ["/admin", "Visão geral"],
  ["/admin/cursos", "Cursos"],
  ["/admin/categorias", "Categorias"],
  ["/admin/instrutores", "Instrutores"],
  ["/admin/usuarios", "Usuários"],
  ["/admin/assinaturas", "Assinaturas"],
  ["/admin/planos", "Planos"],
  ["/admin/avaliacoes", "Avaliações"],
  ["/admin/perguntas", "Perguntas"],
  ["/admin/auditoria", "Auditoria"],
  ["/admin/design", "Componentes"],
] as const;

/** Enquanto o endereço não é conhecido (pré-renderização): os mesmos links, sem marcar o ativo. */
export function NavAdminCarregando() {
  return (
    <nav className="painel__nav" aria-label="Painel admin">
      <ul>
        {ITENS.map(([href, texto]) => (
          <li key={href}>
            <Link href={href} className="painel__link">
              {texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ativo(caminho: string, href: string) {
  return href === "/admin" ? caminho === "/admin" : caminho === href || caminho.startsWith(`${href}/`);
}

/**
 * Navegação lateral do painel. O item da página atual leva o expoente dourado.
 * No celular vira um menu que abre por baixo da barra do topo.
 */
export function NavAdmin() {
  const caminho = usePathname();
  // Guarda em que página o menu foi aberto: trocou de página, ele fecha sozinho.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === caminho;
  const setAberto = (abrir: (atual: boolean) => boolean) => setAbertoEm(abrir(aberto) ? caminho : null);

  return (
    <>
      <button
        type="button"
        className="painel__menu"
        aria-expanded={aberto}
        aria-controls="nav-admin"
        onClick={() => setAberto((a) => !a)}
      >
        <Icone nome={aberto ? "fechar" : "menu"} />
        <span>{aberto ? "Fechar menu" : "Menu"}</span>
      </button>
      <nav id="nav-admin" className={`painel__nav${aberto ? " is-aberta" : ""}`} aria-label="Painel admin">
        <ul>
          {ITENS.map(([href, texto]) => (
            <li key={href}>
              <Link href={href} className="painel__link" aria-current={ativo(caminho, href) ? "page" : undefined}>
                {texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
