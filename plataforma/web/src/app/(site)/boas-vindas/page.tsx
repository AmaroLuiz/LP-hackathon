import type { Metadata } from "next";
import { Suspense } from "react";
import { FormOnboarding } from "@/components/conta/FormOnboarding";
import { Esqueleto } from "@/components/ui/Exibicao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata: Metadata = { title: "Boas-vindas", robots: { index: false } };

async function Conteudo() {
  const usuario = await exigirUsuario("/boas-vindas");
  return (
    <>
      <header className="topo topo--compacto">
        <p className="olho">Três perguntas rápidas</p>
        <h1 id="boas-vindas-titulo" className="titulo">
          Boas-vindas, {usuario.nome.split(" ")[0]}.
        </h1>
        <p className="topo__apoio">Com as suas respostas, mostramos na página inicial os cursos certos para começar.</p>
      </header>
      <FormOnboarding
        inicial={{
          segmentoNegocio: usuario.segmentoNegocio,
          nomeNegocio: usuario.nomeNegocio,
          objetivo: usuario.objetivo,
          familiaridade: usuario.familiaridade,
        }}
      />
    </>
  );
}

export default function BoasVindas() {
  return (
    <section className="secao" data-chao="papel" aria-labelledby="boas-vindas-titulo">
      <Suspense fallback={<Esqueleto altura="28rem" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}
