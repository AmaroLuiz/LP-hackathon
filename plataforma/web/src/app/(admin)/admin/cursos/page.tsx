import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NovoCurso } from "@/components/admin/NovoCurso";
import { TabelaCursos } from "@/components/admin/TabelaCursos";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import { STATUS_CURSO, type CategoriaAdmin, type CursoLinha, type StatusCurso } from "@/lib/admin";
import { plural } from "@/lib/formato";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Cursos · Painel", robots: { index: false } };

function semAcento(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/cursos">["searchParams"] }) {
  await exigirAdmin("/admin/cursos");
  const p = await searchParams;
  const q = (Array.isArray(p.q) ? p.q[0] : p.q)?.trim().slice(0, 100) ?? "";
  const statusBruto = Array.isArray(p.status) ? p.status[0] : p.status;
  const status = statusBruto && statusBruto in STATUS_CURSO ? (statusBruto as StatusCurso) : null;

  const [cursos, categorias] = await Promise.all([
    buscarComSessao<CursoLinha[]>("/api/admin/cursos"),
    buscarComSessao<CategoriaAdmin[]>("/api/admin/categorias"),
  ]);
  const termo = semAcento(q);
  const filtrados = cursos.filter(
    (c) => (!status || c.status === status) && (!termo || semAcento(`${c.titulo} ${c.slug} ${c.categoria} ${c.numero}`).includes(termo)),
  );

  return (
    <>
      <div className="painel-barra">
        <form className="painel-filtros" method="get" role="search" aria-label="Filtrar cursos">
          <div className="campo">
            <label className="campo__rotulo" htmlFor="filtro-q">
              Buscar
            </label>
            <input id="filtro-q" name="q" type="search" className="campo__entrada" defaultValue={q} placeholder="Título, endereço ou número" />
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="filtro-status">
              Status
            </label>
            <select id="filtro-status" name="status" className="seletor" defaultValue={status ?? ""}>
              <option value="">Todos</option>
              {(Object.keys(STATUS_CURSO) as StatusCurso[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_CURSO[s].texto}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="botao botao--secundario botao--pequeno">
            Filtrar
          </button>
          {(q || status) && (
            <Link href="/admin/cursos" className="link link--sublinhado">
              Limpar filtros
            </Link>
          )}
        </form>
        <NovoCurso categorias={categorias} />
      </div>
      <p className="painel-contagem" aria-live="polite">
        {plural(filtrados.length, "curso", "cursos")}
        {filtrados.length !== cursos.length && ` de ${cursos.length}`}
      </p>
      {filtrados.length > 0 ? (
        <TabelaCursos cursos={filtrados} />
      ) : (
        <EstadoVazio titulo="Nenhum curso com esses filtros." acao={<BotaoLink href="/admin/cursos" variante="secundario">Ver todos os cursos</BotaoLink>}>
          Tente outra palavra ou outro status.
        </EstadoVazio>
      )}
    </>
  );
}

export default function PaginaCursos(props: PageProps<"/admin/cursos">) {
  return (
    <section className="painel-pagina" aria-labelledby="cursos-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="cursos-titulo" className="painel-topo__titulo">
          Cursos
        </h1>
      </header>
      <Suspense fallback={<Esqueleto altura="20rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
