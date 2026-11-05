import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorCupons, type CupomAdmin } from "@/components/admin/EditorCupons";
import { EditorFundador, EditorPlanos, ListaDeEspera } from "@/components/admin/EditorPlanos";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { CursoLinha } from "@/lib/admin";
import type { FundadorAdmin, PlanoAdmin } from "@/lib/assinatura";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Planos · Painel", robots: { index: false } };

async function Conteudo() {
  await exigirAdmin("/admin/planos");
  const [planos, cursos, fundador, cupons] = await Promise.all([
    buscarComSessao<PlanoAdmin[]>("/api/admin/planos"),
    buscarComSessao<CursoLinha[]>("/api/admin/cursos"),
    buscarComSessao<FundadorAdmin>("/api/admin/fundador"),
    buscarComSessao<CupomAdmin[]>("/api/admin/cupons"),
  ]);
  return (
    <>
      <EditorPlanos iniciais={planos} cursos={cursos.map((c) => ({ id: c.id, numero: c.numero, titulo: c.titulo, status: c.status }))} />
      <section className="painel-bloco" aria-labelledby="fundador-titulo">
        <h2 id="fundador-titulo" className="painel-bloco__titulo">
          Condição de fundador
        </h2>
        <p className="painel-bloco__apoio">
          Quem assina com um e-mail da lista de espera ganha o desconto nas primeiras cobranças e o preço travado. A condição fica congelada na
          assinatura: mudar as regras aqui só vale para quem assinar depois.
        </p>
        <EditorFundador inicial={fundador} />
        <h3 className="painel-bloco__subtitulo">Lista de espera</h3>
        <ListaDeEspera total={fundador.emails} />
      </section>
      <section className="painel-bloco" aria-labelledby="cupons-titulo">
        <h2 id="cupons-titulo" className="painel-bloco__titulo">
          Cupons de desconto
        </h2>
        <p className="painel-bloco__apoio">
          O aluno digita o cupom na página de planos. O desconto vale nas primeiras cobranças e não soma com a condição de fundador: na
          contratação, fica o maior. Um uso conta quando a primeira cobrança é paga.
        </p>
        <EditorCupons iniciais={cupons} planos={planos.map((p) => ({ id: p.id, nome: p.nome }))} />
      </section>
    </>
  );
}

export default function PaginaPlanos() {
  return (
    <section className="painel-pagina" aria-labelledby="planos-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="planos-titulo" className="painel-topo__titulo">
          Planos
        </h1>
        <p className="painel-topo__apoio">Preço, itens e cursos de cada plano. O site atualiza sozinho ao salvar.</p>
      </header>
      <Suspense fallback={<Esqueleto altura="30rem" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}
