import type { Metadata } from "next";
import { Suspense } from "react";
import { GerenciarInstrutores } from "@/components/admin/GerenciarInstrutores";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { InstrutorAdmin } from "@/lib/admin";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Instrutores · Painel", robots: { index: false } };

async function Conteudo() {
  await exigirAdmin("/admin/instrutores");
  const instrutores = await buscarComSessao<InstrutorAdmin[]>("/api/admin/instrutores");
  return <GerenciarInstrutores iniciais={instrutores} />;
}

export default function PaginaInstrutores() {
  return (
    <section className="painel-pagina" aria-labelledby="instrutores-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="instrutores-titulo" className="painel-topo__titulo">
          Instrutores
        </h1>
        <p className="painel-topo__apoio">Perfis públicos de quem ensina. Não são contas: aparecem na página e no card do curso.</p>
      </header>
      <Suspense fallback={<Esqueleto altura="20rem" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}
