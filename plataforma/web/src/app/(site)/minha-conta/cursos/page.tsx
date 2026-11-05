import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardMatricula } from "@/components/aluno/CardMatricula";
import { CardCurso } from "@/components/cursos/CardCurso";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import type { CursoCard } from "@/lib/api";
import type { MeuCurso } from "@/lib/aprender";
import { buscarComSessao, exigirUsuario } from "@/lib/sessao";

export const metadata: Metadata = { title: "Meus cursos", robots: { index: false } };

const ABAS = [
  ["andamento", "Em andamento"],
  ["concluidos", "Concluídos"],
  ["desejos", "Lista de desejos"],
] as const;

type Aba = (typeof ABAS)[number][0];

async function Conteudo({ searchParams }: { searchParams: PageProps<"/minha-conta/cursos">["searchParams"] }) {
  await exigirUsuario("/minha-conta/cursos");
  const { aba: abaBruta } = await searchParams;
  const aba: Aba = ABAS.some(([id]) => id === abaBruta) ? (abaBruta as Aba) : "andamento";
  const [meus, desejos] = await Promise.all([
    buscarComSessao<MeuCurso[]>("/api/me/cursos"),
    buscarComSessao<CursoCard[]>("/api/me/lista-desejos"),
  ]);
  const andamento = meus.filter((m) => !m.matricula.concluido);
  const concluidos = meus.filter((m) => m.matricula.concluido);
  const contagem: Record<Aba, number> = { andamento: andamento.length, concluidos: concluidos.length, desejos: desejos.length };

  return (
    <>
      <nav className="abas-links" aria-label="Seus cursos">
        {ABAS.map(([id, rotulo]) => (
          <Link
            key={id}
            href={id === "andamento" ? "/minha-conta/cursos" : `/minha-conta/cursos?aba=${id}`}
            className="abas-links__item"
            aria-current={aba === id ? "page" : undefined}
            scroll={false}
          >
            {rotulo} <span className="abas-links__total">{contagem[id]}</span>
          </Link>
        ))}
      </nav>

      {aba === "andamento" &&
        (andamento.length ? (
          <ul className="matriculas">
            {andamento.map((m) => (
              <li key={m.card.slug}>
                <CardMatricula item={m} />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio titulo="Nenhum curso em andamento." acao={<BotaoLink href="/cursos">Escolher um curso</BotaoLink>}>
            Quando você começar um curso, ele aparece aqui com o seu progresso.
          </EstadoVazio>
        ))}

      {aba === "concluidos" &&
        (concluidos.length ? (
          <ul className="matriculas">
            {concluidos.map((m) => (
              <li key={m.card.slug}>
                <CardMatricula item={m} />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio titulo="Você ainda não concluiu nenhum curso.">
            Ao terminar todas as aulas de um curso, ele vem para cá com o certificado.
          </EstadoVazio>
        ))}

      {aba === "desejos" &&
        (desejos.length ? (
          <ul className="grade-cursos">
            {desejos.map((c) => (
              <li key={c.slug}>
                <CardCurso curso={c} />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio titulo="Sua lista de desejos está vazia." acao={<BotaoLink href="/cursos" variante="secundario">Ver cursos</BotaoLink>}>
            Toque no coração de um curso para guardar e voltar a ele depois.
          </EstadoVazio>
        ))}
    </>
  );
}

export default function MeusCursos(props: PageProps<"/minha-conta/cursos">) {
  return (
    <section className="secao" data-chao="preto" aria-labelledby="meus-cursos-titulo">
      <header className="topo topo--compacto">
        <p className="olho">Área do aluno</p>
        <h1 id="meus-cursos-titulo" className="titulo">
          Meus cursos
        </h1>
      </header>
      <Suspense fallback={<Esqueleto altura="20rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
