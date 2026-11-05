import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { TelaSemAcesso } from "@/components/aprender/TelaSemAcesso";
import { Esqueleto } from "@/components/ui/Exibicao";
import type { PainelCurso } from "@/lib/aprender";
import { exigirUsuario, pedirComSessao } from "@/lib/sessao";

/** /aprender/slug: leva direto para a aula de onde o aluno parou (ou a primeira). */
async function Redirecionar({ params }: { params: PageProps<"/aprender/[slug]">["params"] }) {
  const { slug } = await params;
  await exigirUsuario(`/aprender/${slug}`);
  const painel = await pedirComSessao<PainelCurso>(`/api/aprender/${encodeURIComponent(slug)}`);
  if (!painel.ok) {
    if (painel.status === 404) notFound();
    return <TelaSemAcesso slug={slug} codigo={painel.codigo} mensagem={painel.mensagem} />;
  }
  if (!painel.dados.continuarAulaId) {
    return <TelaSemAcesso slug={slug} codigo="SEM_AULAS" mensagem="As aulas deste curso ainda estão sendo gravadas." />;
  }
  redirect(`/aprender/${slug}/${painel.dados.continuarAulaId}`);
}

export default function ContinuarCurso(props: PageProps<"/aprender/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="player-carregando" aria-busy="true">
          <Esqueleto proporcao="16 / 9" />
        </div>
      }
    >
      <Redirecionar params={props.params} />
    </Suspense>
  );
}
