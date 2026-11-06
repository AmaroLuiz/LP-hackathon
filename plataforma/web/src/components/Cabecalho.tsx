import Link from "next/link";
import { Suspense } from "react";
import { BuscaCabecalho } from "@/components/BuscaCabecalho";
import { MenuCelular } from "@/components/MenuCelular";
import { AvisoVerificacao } from "@/components/conta/AvisoVerificacao";
import { BotaoSair } from "@/components/conta/BotaoSair";
import { MenuUsuario } from "@/components/conta/MenuUsuario";
import { naLanding } from "@/lib/landing";
import { obterUsuarioSeDisponivel as obterUsuario } from "@/lib/sessao";

export function Marca() {
  return (
    <Link href="/" className="marca" aria-label="PotencIA, início">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG pequeno, sem otimização a fazer */}
      <img className="marca__simbolo" src="/marca.svg" alt="" width={36} height={36} />
      <span className="marca__nome">PotencIA</span>
    </Link>
  );
}

/** Conta no desktop: entrar/criar conta ou o menu do usuário. */
async function AreaUsuario() {
  const usuario = await obterUsuario();
  if (!usuario) {
    return (
      <div className="cabecalho__conta">
        <Link href="/entrar" className="cabecalho__entrar">
          Entrar
        </Link>
        <Link href="/cadastro" className="botao botao--pequeno cabecalho__criar">
          Criar conta
        </Link>
      </div>
    );
  }
  return (
    <div className="cabecalho__conta">
      <MenuUsuario nome={usuario.nome} email={usuario.email} admin={usuario.papel === "ADMIN"} />
    </div>
  );
}

/** Conta no menu do celular: os mesmos destinos, em lista. */
async function ContaCelular() {
  const usuario = await obterUsuario();
  if (!usuario) {
    return (
      <div className="menu-celular__acoes">
        <Link href="/cadastro" className="botao botao--principal botao--largo">
          Criar conta
        </Link>
        <Link href="/entrar" className="botao botao--secundario botao--largo">
          Entrar
        </Link>
      </div>
    );
  }
  return (
    <>
      <p className="menu-celular__nome">{usuario.nome}</p>
      <ul className="menu-celular__lista menu-celular__lista--conta">
        <li>
          <Link href="/minha-conta/cursos">Meus cursos</Link>
        </li>
        <li>
          <Link href="/minha-conta/certificados">Certificados</Link>
        </li>
        <li>
          <Link href="/minha-conta/assinatura">Minha assinatura</Link>
        </li>
        <li>
          <Link href="/minha-conta">Minha conta</Link>
        </li>
        <li>
          <Link href="/minha-conta/senha">Trocar senha</Link>
        </li>
        {usuario.papel === "ADMIN" && (
          <li>
            <Link href="/admin">Painel admin</Link>
          </li>
        )}
      </ul>
      <BotaoSair className="menu-celular__sair" />
    </>
  );
}

async function FaixaVerificacao() {
  const usuario = await obterUsuario();
  if (!usuario || usuario.emailVerificado) return null;
  return <AvisoVerificacao email={usuario.email} />;
}

/**
 * Pílula de vidro da landing, presa no topo. No celular, navegação e conta
 * vão para o menu em tela cheia.
 */
export function Cabecalho() {
  return (
    <>
      <header className="cabecalho">
        <div className="cabecalho__pilula">
          <Marca />
          <nav className="cabecalho__nav" aria-label="Principal">
            <Link href="/cursos">Cursos</Link>
            <Link href="/planos">Planos</Link>
            <a href={naLanding()}>Sobre</a>
          </nav>
          <div className="cabecalho__direita">
            <BuscaCabecalho />
            <Suspense fallback={<div className="cabecalho__conta" aria-hidden="true" />}>
              <AreaUsuario />
            </Suspense>
            <MenuCelular
              conta={
                <Suspense fallback={null}>
                  <ContaCelular />
                </Suspense>
              }
            />
          </div>
        </div>
      </header>
      <Suspense fallback={null}>
        <FaixaVerificacao />
      </Suspense>
    </>
  );
}
