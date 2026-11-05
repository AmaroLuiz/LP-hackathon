import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { CardCurso } from "@/components/cursos/CardCurso";
import { DetalheCurso } from "@/components/cursos/DetalheCurso";
import { BotaoLink } from "@/components/ui/Botao";
import { BarraProgresso } from "@/components/ui/Exibicao";
import { AvaliacoesCurso } from "@/components/comunidade/AvaliacoesCurso";
import { avaliacoesDoCurso, buscarCurso, listarCursos, listarPlanos, planoMinimo, type CursoDetalhe, type Plano } from "@/lib/api";
import { relacionados } from "@/lib/catalogo";
import { NIVEIS } from "@/lib/formato";
import type { AcessoCurso as AcessoCursoApi } from "@/lib/aprender";
import { obterUsuarioSeDisponivel as obterUsuario, pedirComSessao } from "@/lib/sessao";

export async function generateStaticParams() {
  const cursos = await listarCursos();
  return cursos.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cursos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const curso = await buscarCurso(slug);
  if (!curso) return {};
  const { card } = curso;
  return {
    title: curso.seoTitulo ?? card.titulo,
    description: curso.seoDescricao ?? card.subtitulo,
    alternates: { canonical: `/cursos/${card.slug}` },
    openGraph: {
      title: card.titulo,
      description: card.subtitulo,
      type: "website",
      images: card.capaUrl ? [{ url: card.capaUrl, alt: card.capaAlt ?? "" }] : undefined,
    },
  };
}

// Os cursos conhecidos saem prontos do build (generateStaticParams). Um curso
// publicado depois espera a API na primeira visita, mas endereço inexistente
// responde 404 de verdade.
export const instant = false;

async function lerAcesso(slug: string): Promise<AcessoCursoApi | null> {
  try {
    const r = await pedirComSessao<AcessoCursoApi>(`/api/cursos/${encodeURIComponent(slug)}/acesso`);
    return r.ok ? r.dados : null;
  } catch (erro) {
    unstable_rethrow(erro);
    return null;
  }
}

/**
 * Botões do cartão: dependem de quem está vendo, então entram depois do resto
 * da página. Visitante → criar conta; sem plano → assinar; com acesso →
 * começar, continuar (com o progresso) ou ver o certificado.
 */
async function AcessoCurso({ slug, plano, temAulas }: { slug: string; plano?: Plano; temAulas: boolean }) {
  const usuario = await obterUsuario();
  if (!usuario) return <AcessoVisitante slug={slug} />;
  const acesso = await lerAcesso(slug);
  if (!acesso) return <AcessoVisitante slug={slug} />;

  if (acesso.motivo === "EMAIL_NAO_VERIFICADO") {
    return (
      <>
        <p className="curso-cartao__aviso">O curso está liberado para você. Falta confirmar o seu e-mail para assistir.</p>
        <BotaoLink href="/minha-conta" largo>
          Confirmar e-mail
        </BotaoLink>
      </>
    );
  }
  if (!acesso.podeAssistir) {
    return (
      <>
        <BotaoLink href={`/planos?curso=${slug}`} largo>
          {plano ? `Assinar o plano ${plano.nome}` : "Ver planos"}
        </BotaoLink>
        <p className="curso-cartao__aviso">Com a assinatura ativa, o curso abre aqui mesmo.</p>
      </>
    );
  }
  if (!temAulas) {
    return <p className="curso-cartao__aviso">O curso está liberado para você. As aulas aparecem aqui assim que ficarem prontas.</p>;
  }
  const m = acesso.matricula;
  if (m?.concluido) {
    return (
      <>
        <p className="curso-cartao__aviso curso-cartao__aviso--feito">Você concluiu este curso.</p>
        {m.certificadoCodigo && (
          <BotaoLink href={`/certificados/${m.certificadoCodigo}`} largo>
            Ver certificado
          </BotaoLink>
        )}
        <BotaoLink href={`/aprender/${slug}`} variante="secundario" largo>
          Rever o curso
        </BotaoLink>
      </>
    );
  }
  if (m) {
    return (
      <>
        <BarraProgresso valor={m.percentual} rotulo="Seu progresso no curso" />
        <BotaoLink href={`/aprender/${slug}`} largo>
          Continuar o curso
        </BotaoLink>
      </>
    );
  }
  return (
    <>
      {acesso.motivo === "ADMIN" && <p className="curso-cartao__aviso">Como admin, você vê todos os cursos.</p>}
      <BotaoLink href={`/aprender/${slug}`} largo>
        Começar o curso
      </BotaoLink>
    </>
  );
}

function AcessoVisitante({ slug }: { slug: string }) {
  return (
    <>
      <BotaoLink href={`/cadastro?voltar=/cursos/${slug}`} largo>
        Criar conta e começar
      </BotaoLink>
      <BotaoLink href={`/entrar?voltar=/cursos/${slug}`} variante="secundario" largo>
        Já tenho conta
      </BotaoLink>
    </>
  );
}

function dadosEstruturados(curso: CursoDetalhe, plano?: Plano) {
  const { card } = curso;
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: card.titulo,
    description: card.subtitulo,
    url: `${base}/cursos/${card.slug}`,
    image: card.capaUrl ? `${base}${card.capaUrl}` : undefined,
    inLanguage: "pt-BR",
    educationalLevel: NIVEIS[card.nivel],
    provider: { "@type": "Organization", name: "PotencIA", sameAs: base },
    ...(plano && {
      offers: {
        "@type": "Offer",
        category: "Subscription",
        price: (plano.precoCentavos / 100).toFixed(2),
        priceCurrency: "BRL",
      },
    }),
    ...(card.totalAvaliacoes > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: card.notaMedia, reviewCount: card.totalAvaliacoes },
    }),
  };
}

export default async function PaginaCurso({ params }: PageProps<"/cursos/[slug]">) {
  const { slug } = await params;
  const [curso, planos, cursos, avaliacoes] = await Promise.all([
    buscarCurso(slug),
    listarPlanos(),
    listarCursos(),
    avaliacoesDoCurso(slug),
  ]);
  if (!curso) notFound();

  const { card } = curso;
  const plano = planoMinimo(planos, card.id);
  const totalAulas = curso.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const parecidos = relacionados(cursos, card);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify escapa as aspas; "<" vira \u003c para não fechar a tag script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados(curso, plano)).replace(/</g, "\\u003c") }}
      />
      <DetalheCurso
        curso={curso}
        planos={planos}
        avaliacoes={avaliacoes ? <AvaliacoesCurso slug={card.slug} inicial={avaliacoes} /> : undefined}
        acesso={
          <Suspense fallback={<AcessoVisitante slug={card.slug} />}>
            <AcessoCurso slug={card.slug} plano={plano} temAulas={totalAulas > 0} />
          </Suspense>
        }
      />

      {parecidos.length > 0 && (
        <section className="secao" data-chao="preto" aria-labelledby="relacionados">
          <h2 id="relacionados" className="subtitulo relacionados__titulo">
            Quem faz este curso também faz
          </h2>
          <ul className="grade-cursos">
            {parecidos.map((c) => (
              <li key={c.slug}>
                <CardCurso curso={c} plano={planoMinimo(planos, c.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
