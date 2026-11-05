import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartaoPergunta, type PerguntaAdmin } from "@/components/admin/Moderacao";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import { Paginacao } from "@/components/ui/Paginacao";
import type { Pagina } from "@/lib/admin";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Perguntas · Painel", robots: { index: false } };

const FILTROS = [
  ["sem-resposta", "Sem resposta da equipe"],
  ["todas", "Todas"],
  ["ocultas", "Escondidas"],
] as const;

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/perguntas">["searchParams"] }) {
  await exigirAdmin("/admin/perguntas");
  const p = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filtro = FILTROS.some(([f]) => f === um(p.filtro)) ? um(p.filtro) : "sem-resposta";
  const pagina = Math.max(1, Number.parseInt(um(p.pagina), 10) || 1);
  const r = await buscarComSessao<Pagina<PerguntaAdmin>>(`/api/admin/perguntas?filtro=${filtro}&pagina=${pagina}`);

  return (
    <>
      <nav className="filtro-abas" aria-label="Filtrar perguntas">
        {FILTROS.map(([f, texto]) => (
          <Link key={f} href={`/admin/perguntas?filtro=${f}`} className="filtro-abas__item" aria-current={f === filtro ? "page" : undefined}>
            {texto}
          </Link>
        ))}
      </nav>
      {r.itens.length === 0 ? (
        <EstadoVazio titulo={filtro === "sem-resposta" ? "Nenhuma pergunta esperando a equipe." : "Nenhuma pergunta aqui."}>
          {filtro === "sem-resposta" ? "Quando um aluno perguntar numa aula, a pergunta aparece nesta fila." : null}
        </EstadoVazio>
      ) : (
        <ol className="fila-moderacao">
          {r.itens.map((item) => (
            <li key={item.id}>
              <CartaoPergunta pergunta={item} />
            </li>
          ))}
        </ol>
      )}
      <Paginacao pagina={r.pagina} total={r.total} tamanho={r.tamanho} href={(n) => `/admin/perguntas?filtro=${filtro}&pagina=${n}`} />
    </>
  );
}

export default function PaginaPerguntas(props: PageProps<"/admin/perguntas">) {
  return (
    <section className="painel-pagina" aria-labelledby="perguntas-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="perguntas-titulo" className="painel-topo__titulo">
          Perguntas
        </h1>
        <p className="painel-topo__apoio">
          Dúvidas dos alunos nas aulas. A resposta da equipe aparece destacada no player, e o aluno recebe um e-mail.
        </p>
      </header>
      <Suspense fallback={<Esqueleto altura="30rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
