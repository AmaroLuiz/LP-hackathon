import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AcoesCertificado } from "@/components/aluno/AcoesCertificado";
import { Esqueleto } from "@/components/ui/Exibicao";
import { API_URL } from "@/lib/api";
import type { Certificado } from "@/lib/aprender";
import { cargaHoraria, dataPorExtenso } from "@/lib/formato";

export const metadata: Metadata = { title: "Certificado", robots: { index: false } };

async function buscar(codigo: string): Promise<Certificado | null> {
  "use cache";
  const r = await fetch(`${API_URL}/api/certificados/${encodeURIComponent(codigo)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`A API respondeu ${r.status} ao validar o certificado`);
  return r.json() as Promise<Certificado>;
}

/**
 * Página pública de validação. Mostra só nome, curso, data e carga horária.
 * É também o próprio certificado: a impressão (A4 deitado) esconde o resto da página.
 */
async function Conteudo({ params }: { params: PageProps<"/certificados/[codigo]">["params"] }) {
  const { codigo } = await params;
  const c = await buscar(codigo.toUpperCase());
  if (!c) notFound();

  return (
    <>
      <p className="certificado__validacao" role="status">
        <span className="certificado__selo" aria-hidden="true" />
        Certificado válido, emitido pela PotencIA.
      </p>
      <article className="certificado" aria-label={`Certificado de ${c.nomeAluno}`}>
        <div className="certificado__topo">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG pequeno da marca */}
          <img src="/marca.svg" alt="" width={44} height={44} />
          <span className="certificado__marca">PotencIA</span>
        </div>
        <p className="certificado__rotulo">Certificado de conclusão</p>
        <p className="certificado__texto">Certificamos que</p>
        <p className="certificado__nome">{c.nomeAluno}</p>
        <p className="certificado__texto">concluiu o curso</p>
        <p className="certificado__curso">
          {c.tituloCurso}
          <span className="certificado__expoente" aria-hidden="true" />
        </p>
        <p className="certificado__texto">
          com carga horária de {cargaHoraria(c.cargaHorariaMinutos)}, em {dataPorExtenso(c.emitidoEm)}.
        </p>
        <footer className="certificado__rodape">
          <span>
            Código <strong>{c.codigo}</strong>
          </span>
          <span>Valide em {(process.env.SITE_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "")}/certificados/{c.codigo}</span>
        </footer>
      </article>
      <AcoesCertificado />
      {c.cursoSlug && (
        <p className="certificado__curso-link">
          <Link href={`/cursos/${c.cursoSlug}`} className="link link--sublinhado">
            Conhecer o curso
          </Link>
        </p>
      )}
    </>
  );
}

export default function PaginaCertificado(props: PageProps<"/certificados/[codigo]">) {
  return (
    <section className="secao pagina-certificado" data-chao="papel" aria-label="Certificado">
      <Suspense fallback={<Esqueleto proporcao="1.414 / 1" />}>
        <Conteudo params={props.params} />
      </Suspense>
    </section>
  );
}
