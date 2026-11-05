import Image from "next/image";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/Botao";
import { BarraProgresso, Selo } from "@/components/ui/Exibicao";
import type { MeuCurso } from "@/lib/aprender";
import { plural } from "@/lib/formato";

/** Card horizontal de "Meus cursos": capa, progresso e o próximo passo. */
export function CardMatricula({ item }: { item: MeuCurso }) {
  const { card, matricula: m } = item;
  return (
    <article className="matricula">
      <div className="matricula__capa">
        {card.capaUrl && <Image src={card.capaUrl} alt="" fill sizes="(min-width: 48em) 14rem, 92vw" />}
        <span className="card-curso__expoente" aria-hidden="true">
          {card.numero}
        </span>
      </div>
      <div className="matricula__corpo">
        <p className="card-curso__categoria">{card.categoria.nome}</p>
        <h3 className="matricula__titulo">
          <Link href={`/cursos/${card.slug}`} className="link">
            {card.titulo}
          </Link>
        </h3>
        {m.concluido ? (
          <Selo tom="salvia">Concluído</Selo>
        ) : (
          <BarraProgresso valor={m.percentual} rotulo={`Progresso em ${card.titulo}`} />
        )}
        <p className="matricula__meta">
          {plural(m.aulasConcluidas, "aula concluída", "aulas concluídas")} de {m.totalAulas}
        </p>
      </div>
      <div className="matricula__acoes">
        {m.concluido ? (
          <>
            {m.certificadoCodigo && (
              <BotaoLink href={`/certificados/${m.certificadoCodigo}`} pequeno>
                Certificado
              </BotaoLink>
            )}
            <BotaoLink href={`/aprender/${card.slug}`} variante="secundario" pequeno>
              Rever
            </BotaoLink>
          </>
        ) : (
          <BotaoLink href={`/aprender/${card.slug}`} pequeno>
            Continuar
          </BotaoLink>
        )}
      </div>
    </article>
  );
}
