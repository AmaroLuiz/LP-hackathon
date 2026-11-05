import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorCurso } from "@/components/admin/editor/EditorCurso";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { CategoriaAdmin, CursoEdicao, InstrutorAdmin, PlanoDoCurso } from "@/lib/admin";
import { buscarComSessao, exigirAdmin, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Editar curso · Painel", robots: { index: false } };

async function Conteudo({ params }: { params: PageProps<"/admin/cursos/[id]">["params"] }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  await exigirAdmin(`/admin/cursos/${id}`);
  const curso = await pedirComSessao<CursoEdicao>(`/api/admin/cursos/${id}`);
  if (!curso.ok) notFound();
  const [categorias, instrutores, planos] = await Promise.all([
    buscarComSessao<CategoriaAdmin[]>("/api/admin/categorias"),
    buscarComSessao<InstrutorAdmin[]>("/api/admin/instrutores"),
    buscarComSessao<PlanoDoCurso[]>(`/api/admin/cursos/${id}/planos`),
  ]);
  return <EditorCurso key={curso.dados.id} inicial={curso.dados} categorias={categorias} instrutores={instrutores} planosIniciais={planos} />;
}

export default function PaginaEditor(props: PageProps<"/admin/cursos/[id]">) {
  return (
    <section className="painel-pagina" aria-label="Editor de curso">
      <Suspense
        fallback={
          <div aria-busy="true">
            <Esqueleto largura="40%" altura="3rem" />
            <Esqueleto altura="30rem" />
          </div>
        }
      >
        <Conteudo params={props.params} />
      </Suspense>
    </section>
  );
}
