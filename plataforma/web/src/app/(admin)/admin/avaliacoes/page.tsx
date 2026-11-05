import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartaoAvaliacao, type AvaliacaoAdmin } from "@/components/admin/Moderacao";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import { Paginacao } from "@/components/ui/Paginacao";
import type { Pagina } from "@/lib/admin";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Avaliações · Painel", robots: { index: false } };

const FILTROS = [
  ["", "Todas"],
  ["sem-resposta", "Sem resposta"],
  ["PUBLICADA", "Publicadas"],
  ["OCULTA", "Escondidas"],
] as const;

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/avaliacoes">["searchParams"] }) {
  await exigirAdmin("/admin/avaliacoes");
  const p = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = FILTROS.some(([f]) => f === um(p.status)) ? um(p.status) : "";
  const nota = ["1", "2", "3", "4", "5"].includes(um(p.nota)) ? um(p.nota) : "";
  const pagina = Math.max(1, Number.parseInt(um(p.pagina), 10) || 1);
  const consulta = (extra: Record<string, string>) =>
    new URLSearchParams(Object.entries({ status, nota, ...extra }).filter(([, v]) => v)).toString();
  const r = await buscarComSessao<Pagina<AvaliacaoAdmin>>(`/api/admin/avaliacoes?${consulta({ pagina: String(pagina) })}`);

  return (
    <>
      <div className="painel-filtros painel-filtros--linha">
        <nav className="filtro-abas" aria-label="Filtrar avaliações">
          {FILTROS.map(([f, texto]) => (
            <Link
              key={f || "todas"}
              href={`/admin/avaliacoes?${consulta({ status: f })}`}
              className="filtro-abas__item"
              aria-current={f === status ? "page" : undefined}
            >
              {texto}
            </Link>
          ))}
        </nav>
        <form method="get" className="painel-filtros" aria-label="Filtrar por nota">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="campo">
            <label className="campo__rotulo" htmlFor="av-nota">
              Nota
            </label>
            <select id="av-nota" name="nota" className="seletor" defaultValue={nota}>
              <option value="">Todas</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "estrela" : "estrelas"}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="botao botao--secundario botao--pequeno">
            Filtrar
          </button>
        </form>
      </div>
      {r.itens.length === 0 ? (
        <EstadoVazio titulo="Nenhuma avaliação aqui.">
          Alunos avaliam depois de concluir 30% do curso. Notas e comentários aparecem nesta fila.
        </EstadoVazio>
      ) : (
        <ol className="fila-moderacao">
          {r.itens.map((item) => (
            <li key={item.id}>
              <CartaoAvaliacao avaliacao={item} />
            </li>
          ))}
        </ol>
      )}
      <Paginacao pagina={r.pagina} total={r.total} tamanho={r.tamanho} href={(n) => `/admin/avaliacoes?${consulta({ pagina: String(n) })}`} />
    </>
  );
}

export default function PaginaAvaliacoes(props: PageProps<"/admin/avaliacoes">) {
  return (
    <section className="painel-pagina" aria-labelledby="avaliacoes-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="avaliacoes-titulo" className="painel-topo__titulo">
          Avaliações
        </h1>
        <p className="painel-topo__apoio">
          Esconder uma avaliação tira a nota da média do curso na hora. Use para spam, ofensa ou dado pessoal; crítica honesta fica.
        </p>
      </header>
      <Suspense fallback={<Esqueleto altura="30rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
