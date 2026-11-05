import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Player } from "@/components/aprender/Player";
import { TelaSemAcesso } from "@/components/aprender/TelaSemAcesso";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { AulaPlayer, PainelCurso } from "@/lib/aprender";
import { exigirUsuario, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Aula", robots: { index: false } };

async function ConteudoAula({ params }: { params: PageProps<"/aprender/[slug]/[aula]">["params"] }) {
  const { slug, aula: idTexto } = await params;
  const aulaId = Number.parseInt(idTexto, 10);
  if (!Number.isFinite(aulaId)) notFound();
  await exigirUsuario(`/aprender/${slug}/${aulaId}`);

  // A aula primeiro: é ela que matricula o aluno e marca "de onde parou".
  const aula = await pedirComSessao<AulaPlayer>(`/api/aulas/${aulaId}`);
  if (!aula.ok) {
    if (aula.status === 404) notFound();
    return <TelaSemAcesso slug={slug} codigo={aula.codigo} mensagem={aula.mensagem} />;
  }
  // Aula de outro curso no endereço: corrige o endereço.
  if (aula.dados.cursoSlug !== slug) redirect(`/aprender/${aula.dados.cursoSlug}/${aulaId}`);

  const painel = await pedirComSessao<PainelCurso>(`/api/aprender/${encodeURIComponent(slug)}`);
  if (!painel.ok) {
    if (painel.status === 404) notFound();
    return <TelaSemAcesso slug={slug} codigo={painel.codigo} mensagem={painel.mensagem} />;
  }
  return <Player key={aulaId} painel={painel.dados} aula={aula.dados} />;
}

export default function PaginaAula(props: PageProps<"/aprender/[slug]/[aula]">) {
  return (
    <Suspense
      fallback={
        <div className="player-carregando" aria-busy="true">
          <Esqueleto proporcao="16 / 9" />
          <span className="sr-only">Carregando a aula</span>
        </div>
      }
    >
      <ConteudoAula params={props.params} />
    </Suspense>
  );
}
