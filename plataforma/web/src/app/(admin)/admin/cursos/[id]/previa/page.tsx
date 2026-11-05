import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetalheCurso } from "@/components/cursos/DetalheCurso";
import { Esqueleto, Selo } from "@/components/ui/Exibicao";
import { STATUS_CURSO, type CursoEdicao } from "@/lib/admin";
import type { CursoDetalhe, Plano } from "@/lib/api";
import { buscarComSessao, exigirAdmin, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Pré-visualização · Painel", robots: { index: false } };

async function Conteudo({ params }: { params: PageProps<"/admin/cursos/[id]/previa">["params"] }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  await exigirAdmin(`/admin/cursos/${id}/previa`);
  const [detalhe, edicao] = await Promise.all([
    pedirComSessao<CursoDetalhe>(`/api/admin/cursos/${id}/previa`),
    pedirComSessao<CursoEdicao>(`/api/admin/cursos/${id}`),
  ]);
  if (!detalhe.ok || !edicao.ok) notFound();
  // Planos sem cache: mostra o que está salvo agora, não o que o site ainda guarda.
  const planos = await buscarComSessao<Plano[]>("/api/planos");
  const status = STATUS_CURSO[edicao.dados.status];
  const primeira = edicao.dados.modulos.flatMap((m) => m.aulas).find((a) => a.publicada);

  return (
    <>
      <div className="previa-faixa" role="note">
        <p>
          <strong>Pré-visualização</strong> do jeito que o aluno vê. <Selo tom={status.tom}>{status.texto}</Selo>
        </p>
        <div className="previa-faixa__acoes">
          {primeira && (
            <Link href={`/aprender/${edicao.dados.slug}/${primeira.id}`} className="link link--sublinhado">
              Abrir no player
            </Link>
          )}
          <Link href={`/admin/cursos/${id}`} className="botao botao--secundario botao--pequeno">
            Voltar ao editor
          </Link>
        </div>
      </div>
      <DetalheCurso
        curso={detalhe.dados}
        planos={planos}
        acesso={<p className="curso-cartao__aviso">Aqui o aluno vê o botão de começar, continuar ou assinar, conforme o acesso dele.</p>}
      />
    </>
  );
}

export default function PreviaCurso(props: PageProps<"/admin/cursos/[id]/previa">) {
  return (
    <Suspense fallback={<Esqueleto altura="40rem" />}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}
