import Image from "next/image";
import Link from "next/link";
import type { CursoCard, Plano } from "@/lib/api";
import { duracao, NIVEIS, plural } from "@/lib/formato";
import { BotaoDesejo, ProgressoDoCard } from "@/components/aluno/PartesDoCard";
import { Estrelas, Selo } from "@/components/ui/Exibicao";

type Props = {
  curso: CursoCard;
  /** Plano mais barato que libera o curso. */
  plano?: Plano;
  /** Carrega a capa com prioridade (cards visíveis sem rolar). */
  prioridade?: boolean;
};

/**
 * Card único do curso, usado em todo o site. Capa 16:9 com o número do curso
 * no expoente dourado; o card inteiro é um só link.
 */
export function CardCurso({ curso, plano, prioridade }: Props) {
  return (
    <article className="card-curso">
      <div className="card-curso__capa">
        {curso.capaUrl ? (
          <Image
            src={curso.capaUrl}
            alt={curso.capaAlt ?? ""}
            fill
            sizes="(min-width: 75em) 24rem, (min-width: 48em) 45vw, 92vw"
            priority={prioridade}
          />
        ) : null}
        <span className="card-curso__expoente" aria-hidden="true">
          {curso.numero}
        </span>
        <BotaoDesejo cursoId={curso.id} slug={curso.slug} titulo={curso.titulo} />
      </div>
      <div className="card-curso__corpo">
        <p className="card-curso__categoria">{curso.categoria.nome}</p>
        <h3 className="card-curso__titulo">
          <Link href={`/cursos/${curso.slug}`} className="card-curso__link">
            {curso.titulo}
          </Link>
        </h3>
        <p className="card-curso__instrutor">{curso.instrutores.join(", ")}</p>
        <p className="card-curso__nota">
          {curso.totalAvaliacoes > 0 ? <Estrelas nota={curso.notaMedia} total={curso.totalAvaliacoes} /> : <Selo>Novo</Selo>}
        </p>
        <p className="card-curso__meta">
          {curso.totalAulas > 0
            ? `${duracao(curso.duracaoTotalSegundos)} · ${plural(curso.totalAulas, "aula", "aulas")}`
            : "Aulas em gravação"}{" "}
          · {NIVEIS[curso.nivel]}
        </p>
        {plano && <p className="card-curso__plano">A partir do plano {plano.nome}</p>}
        <ProgressoDoCard cursoId={curso.id} />
      </div>
    </article>
  );
}
