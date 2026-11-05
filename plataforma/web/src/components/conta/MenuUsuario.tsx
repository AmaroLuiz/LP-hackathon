"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { enviar } from "@/lib/cliente";

type Props = { nome: string; email: string; admin: boolean };

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

/** Menu da conta no cabeçalho: abre com clique ou teclado, fecha com Esc ou clique fora. */
export function MenuUsuario({ nome, email, admin }: Props) {
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  async function sair() {
    setSaindo(true);
    await enviar("/api/auth/sair", {});
    setAberto(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="menu-usuario" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="menu-usuario__botao"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
      >
        <span className="menu-usuario__avatar" aria-hidden="true">
          {iniciais(nome)}
        </span>
        <span className="sr-only">Menu da conta de {nome}</span>
      </button>
      <div id={id} className="menu-usuario__painel" hidden={!aberto}>
        <p className="menu-usuario__nome">{nome}</p>
        <p className="menu-usuario__email">{email}</p>
        <ul className="menu-usuario__lista">
          <li>
            <Link href="/minha-conta/cursos" onClick={() => setAberto(false)}>
              Meus cursos
            </Link>
          </li>
          <li>
            <Link href="/minha-conta/certificados" onClick={() => setAberto(false)}>
              Certificados
            </Link>
          </li>
          <li>
            <Link href="/minha-conta/assinatura" onClick={() => setAberto(false)}>
              Minha assinatura
            </Link>
          </li>
          <li>
            <Link href="/minha-conta" onClick={() => setAberto(false)}>
              Minha conta
            </Link>
          </li>
          <li>
            <Link href="/minha-conta/perfil" onClick={() => setAberto(false)}>
              Perfil e privacidade
            </Link>
          </li>
          <li>
            <Link href="/minha-conta/senha" onClick={() => setAberto(false)}>
              Trocar senha
            </Link>
          </li>
          {admin && (
            <li>
              <Link href="/admin" onClick={() => setAberto(false)}>
                Painel admin
              </Link>
            </li>
          )}
        </ul>
        <button type="button" className="menu-usuario__sair" onClick={sair} disabled={saindo}>
          {saindo ? "Saindo…" : "Sair"}
        </button>
      </div>
    </div>
  );
}
