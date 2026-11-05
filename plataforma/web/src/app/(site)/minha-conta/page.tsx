import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoLink } from "@/components/ui/Botao";
import { Aviso, Esqueleto, Selo } from "@/components/ui/Exibicao";
import { STATUS_ASSINATURA, type MinhaAssinatura } from "@/lib/assinatura";
import { dataPorExtenso } from "@/lib/formato";
import { exigirUsuario, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

async function Conteudo({ searchParams }: { searchParams: PageProps<"/minha-conta">["searchParams"] }) {
  const usuario = await exigirUsuario("/minha-conta");
  const { bemvindo } = await searchParams;
  const resposta = await pedirComSessao<MinhaAssinatura>("/api/me/assinatura");
  const assinatura = resposta.ok ? resposta.dados : null;

  return (
    <>
      {bemvindo === "1" && (
        <Aviso tipo="sucesso" titulo={`Conta criada. Boas-vindas, ${usuario.nome.split(" ")[0]}!`}>
          Mandamos um link para confirmar o seu e-mail. Enquanto isso, já dá para explorar os cursos.
        </Aviso>
      )}
      <dl className="dados-conta">
        <div>
          <dt>Nome</dt>
          <dd>{usuario.nome}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>
            {usuario.email}{" "}
            {usuario.emailVerificado ? <Selo tom="salvia">Confirmado</Selo> : <Selo tom="ouro">Aguardando confirmação</Selo>}
          </dd>
        </div>
        <div>
          <dt>Tipo de conta</dt>
          <dd>{usuario.papel === "ADMIN" ? "Administrador" : "Aluno"}</dd>
        </div>
        <div>
          <dt>Assinatura</dt>
          <dd>
            {assinatura ? (
              <>
                Plano {assinatura.plano.nome} <Selo tom={STATUS_ASSINATURA[assinatura.status].tom}>{STATUS_ASSINATURA[assinatura.status].texto}</Selo>
                {assinatura.daAcesso && <span className="campo__ajuda">até {dataPorExtenso(assinatura.fimPeriodoAtual)}</span>}
                <Link href="/minha-conta/assinatura" className="link link--sublinhado">
                  Gerenciar
                </Link>
              </>
            ) : (
              <>
                Nenhuma.{" "}
                <Link href="/planos" className="link link--sublinhado">
                  Ver planos
                </Link>
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="acoes">
        <BotaoLink href="/minha-conta/cursos">Meus cursos</BotaoLink>
        <BotaoLink href="/minha-conta/assinatura" variante="secundario">
          Minha assinatura
        </BotaoLink>
        <BotaoLink href="/minha-conta/certificados" variante="secundario">
          Certificados
        </BotaoLink>
        <BotaoLink href="/minha-conta/perfil" variante="secundario">
          Perfil e privacidade
        </BotaoLink>
        {usuario.papel === "ADMIN" && (
          <BotaoLink href="/admin" variante="fantasma">
            Painel admin
          </BotaoLink>
        )}
      </div>
    </>
  );
}

export default function MinhaConta(props: PageProps<"/minha-conta">) {
  return (
    <section className="secao" data-chao="papel" aria-labelledby="conta-titulo">
      <header className="topo topo--compacto">
        <p className="olho">Área do aluno</p>
        <h1 id="conta-titulo" className="titulo">
          Minha conta
        </h1>
      </header>
      <Suspense
        fallback={
          <div className="dados-conta" aria-busy="true">
            <Esqueleto largura="60%" altura="1.25rem" />
            <Esqueleto largura="45%" altura="1.25rem" />
          </div>
        }
      >
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
