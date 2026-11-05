import type { Metadata } from "next";
import { Suspense } from "react";
import { AceitarConvite } from "@/components/assinatura/AcoesAssinatura";
import { MolduraConta } from "@/components/conta/MolduraConta";
import { BotaoLink } from "@/components/ui/Botao";
import { Aviso, Esqueleto } from "@/components/ui/Exibicao";
import { API_URL } from "@/lib/api";
import type { Convite } from "@/lib/assinatura";
import { obterUsuarioSeDisponivel } from "@/lib/sessao";

export const metadata: Metadata = { title: "Convite para a equipe", robots: { index: false } };

async function Conteudo({ searchParams }: { searchParams: PageProps<"/equipe/convite">["searchParams"] }) {
  const { token } = await searchParams;
  const valor = typeof token === "string" ? token : "";
  const resposta = valor ? await fetch(`${API_URL}/api/equipe/convites/${encodeURIComponent(valor)}`) : null;
  if (!resposta || !resposta.ok) {
    return (
      <Aviso tipo="erro" titulo="Este convite não existe ou já foi usado.">
        Peça um novo para quem convidou você.
      </Aviso>
    );
  }
  const convite = (await resposta.json()) as Convite;
  if (!convite.valido) {
    return (
      <Aviso tipo="erro" titulo="Este convite expirou.">
        Peça um novo para {convite.titular}.
      </Aviso>
    );
  }
  const usuario = await obterUsuarioSeDisponivel();
  const voltar = `/equipe/convite?token=${encodeURIComponent(valor)}`;
  return (
    <>
      <p className="moldura-conta__apoio">
        <strong>{convite.titular}</strong> convidou você para a assinatura do plano <strong>{convite.plano}</strong>, com acesso aos cursos. O
        convite foi para <strong>{convite.email}</strong>.
      </p>
      {usuario ? (
        <AceitarConvite token={valor} />
      ) : (
        <div className="acoes">
          <BotaoLink href={`/cadastro?voltar=${encodeURIComponent(voltar)}`}>Criar conta e aceitar</BotaoLink>
          <BotaoLink href={`/entrar?voltar=${encodeURIComponent(voltar)}`} variante="secundario">
            Já tenho conta
          </BotaoLink>
        </div>
      )}
    </>
  );
}

export default function PaginaConvite(props: PageProps<"/equipe/convite">) {
  return (
    <MolduraConta titulo="Convite para a equipe" painel="Aprenda junto com a sua equipe.">
      <Suspense fallback={<Esqueleto altura="8rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </MolduraConta>
  );
}
