import type { Metadata } from "next";
import { Suspense } from "react";
import { GerenciarCategorias } from "@/components/admin/GerenciarCategorias";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { CategoriaAdmin } from "@/lib/admin";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Categorias · Painel", robots: { index: false } };

async function Conteudo() {
  await exigirAdmin("/admin/categorias");
  const categorias = await buscarComSessao<CategoriaAdmin[]>("/api/admin/categorias");
  return <GerenciarCategorias iniciais={categorias} />;
}

export default function PaginaCategorias() {
  return (
    <section className="painel-pagina" aria-labelledby="categorias-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="categorias-titulo" className="painel-topo__titulo">
          Categorias
        </h1>
        <p className="painel-topo__apoio">No site elas aparecem como temas: nos filtros do catálogo e nas faixas da home.</p>
      </header>
      <Suspense fallback={<Esqueleto altura="20rem" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}
