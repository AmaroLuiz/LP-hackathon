import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CardCurso } from "@/components/cursos/CardCurso";
import { FaixaCursos } from "@/components/cursos/FaixaCursos";
import { BotaoLink } from "@/components/ui/Botao";
import { Acordeao, Estrelas } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import { depoimentos, listarCursos, listarPlanos, planoMinimo, type CursoCard, type Plano } from "@/lib/api";
import { recomendar } from "@/lib/catalogo";
import { preco } from "@/lib/formato";
import { unstable_rethrow } from "next/navigation";
import { CardMatricula } from "@/components/aluno/CardMatricula";
import type { MeuCurso } from "@/lib/aprender";
import { obterUsuarioSeDisponivel as obterUsuario, pedirComSessao, type Usuario } from "@/lib/sessao";

const PASSOS = [
  ["Escolha o plano", "Um valor por mês libera um conjunto de cursos. Sem fidelidade."],
  ["Faça no seu ritmo", "Aulas curtas, no computador ou no celular. Cada passo mostrado na tela."],
  ["Publique e veja o resultado", "Cada curso termina com algo pronto para o seu negócio postar."],
] as const;

const PERGUNTAS = [
  [
    "Preciso entender de tecnologia?",
    "Não. O curso Primeiros passos começa da instalação, sem termo técnico. Se você usa WhatsApp e Instagram, consegue acompanhar.",
  ],
  ["Funciona no celular?", "As aulas abrem no celular e no computador. Para criar os vídeos e as artes, o computador é mais confortável."],
  ["Posso cancelar quando quiser?", "Sim. A assinatura é mensal e você cancela pela sua conta, sem multa."],
  ["Tem certificado?", "Sim. Ao concluir um curso, você recebe um certificado com link público de validação."],
  [
    "Os cursos são atualizados?",
    "Sim. As ferramentas de IA mudam rápido, e as aulas acompanham. Quem assina recebe as atualizações sem pagar nada a mais.",
  ],
] as const;

function Lista({ cursos, planos }: { cursos: CursoCard[]; planos: Plano[] }) {
  return cursos.map((c) => (
    <li key={c.slug}>
      <CardCurso curso={c} plano={planoMinimo(planos, c.id)} />
    </li>
  ));
}

async function cursosEmAndamento(): Promise<MeuCurso[]> {
  try {
    const r = await pedirComSessao<MeuCurso[]>("/api/me/cursos");
    return r.ok ? r.dados.filter((m) => !m.matricula.concluido).slice(0, 3) : [];
  } catch (erro) {
    unstable_rethrow(erro);
    return [];
  }
}

/**
 * Só para quem está logado: "Continue de onde parou" (cursos em andamento) e
 * as recomendações pelo onboarding, ou o convite para respondê-lo.
 */
async function ParaVoce({ cursos, planos }: { cursos: CursoCard[]; planos: Plano[] }) {
  const usuario = await obterUsuario();
  if (!usuario) return null;
  const andamento = await cursosEmAndamento();
  return (
    <>
      {andamento.length > 0 && (
        <section className="secao secao--compacta" data-chao="preto" aria-labelledby="continue">
          <header className="faixa__cabeca">
            <h2 id="continue" className="subtitulo">
              Continue de onde parou
            </h2>
            <Link href="/minha-conta/cursos" className="link link--sublinhado faixa__link">
              Meus cursos
            </Link>
          </header>
          <ul className="matriculas">
            {andamento.map((m) => (
              <li key={m.card.slug}>
                <CardMatricula item={m} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <Recomendacoes usuario={usuario} cursos={cursos} planos={planos} />
    </>
  );
}

function Recomendacoes({ usuario, cursos, planos }: { usuario: Usuario; cursos: CursoCard[]; planos: Plano[] }) {
  const primeiroNome = usuario.nome.split(" ")[0];

  if (!usuario.onboardingConcluido) {
    return (
      <section className="secao secao--compacta" data-chao="preto" aria-labelledby="para-voce">
        <div className="convite-onboarding">
          <h2 id="para-voce" className="subtitulo">
            {primeiroNome}, por onde começar?
          </h2>
          <p>Responda três perguntas rápidas e mostramos os cursos certos para o seu negócio.</p>
          <BotaoLink href="/boas-vindas" pequeno>
            Responder agora
          </BotaoLink>
        </div>
      </section>
    );
  }

  const recomendados = recomendar(cursos, usuario);
  return (
    <section className="secao secao--compacta" data-chao="preto" aria-labelledby="para-voce">
      <header className="faixa__cabeca">
        <h2 id="para-voce" className="subtitulo">
          Para o seu negócio, {primeiroNome}
        </h2>
        <Link href="/boas-vindas" className="link link--sublinhado faixa__link">
          Mudar respostas
        </Link>
      </header>
      <ul className="grade-cursos">
        <Lista cursos={recomendados} planos={planos} />
      </ul>
    </section>
  );
}

export default async function Inicio() {
  const [cursos, planos, falas] = await Promise.all([listarCursos(), listarPlanos(), depoimentos()]);
  const destaques = cursos.filter((c) => c.destaque);
  const vitrine = (destaques.length >= 3 ? destaques : cursos).slice(0, 3);
  const categorias = [...new Map(cursos.map((c) => [c.categoria.slug, c.categoria.nome]))];
  const precoInicial = Math.min(...planos.map((p) => p.precoCentavos));

  return (
    <>
      <section className="heroi" data-chao="preto" aria-labelledby="heroi-titulo">
        <div className="heroi__texto">
          <p className="olho">Cursos de IA para pequenos negócios</p>
          <h1 id="heroi-titulo" className="heroi__titulo">
            Vídeos, artes e carrosséis com IA, no ritmo do seu negócio
            <span className="heroi__expoente" aria-hidden="true" />
          </h1>
          <p className="heroi__apoio">
            Da instalação ao post que vende. {cursos.length} cursos curtos, em português, sem termo técnico.
          </p>
          <Form action="/cursos" role="search" className="heroi__busca">
            <label htmlFor="busca-heroi" className="sr-only">
              Buscar cursos
            </label>
            <input id="busca-heroi" name="q" type="search" placeholder="Ex.: Reels, carrossel, voz" />
            <button type="submit">
              <Icone nome="busca" />
              <span className="sr-only">Buscar</span>
            </button>
          </Form>
          <div className="acoes">
            <BotaoLink href="/cursos">Ver todos os cursos</BotaoLink>
            {planos.length > 0 && (
              <Link href="/planos" className="link link--sublinhado">
                Planos a partir de {preco(precoInicial)}/mês
              </Link>
            )}
          </div>
        </div>
        <ol className="heroi__mosaico" aria-label="Cursos em destaque">
          {vitrine.map((c, i) => (
            <li key={c.slug} className={`heroi__peca heroi__peca--${i + 1}`}>
              <Link href={`/cursos/${c.slug}`} className="heroi__peca-link">
                {c.capaUrl && <Image src={c.capaUrl} alt="" fill sizes="(min-width: 64em) 22rem, 45vw" priority={i === 0} />}
                <span className="heroi__peca-expoente" aria-hidden="true">
                  {c.numero}
                </span>
                <span className="heroi__peca-titulo">{c.titulo}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <Suspense fallback={null}>
        <ParaVoce cursos={cursos} planos={planos} />
      </Suspense>

      <section className="secao secao--compacta" data-chao="preto" aria-label="Todos os cursos">
        <FaixaCursos
          id="todos-os-cursos"
          titulo="Todos os cursos"
          acao={
            <Link href="/cursos" className="link link--sublinhado faixa__link">
              Buscar e filtrar
            </Link>
          }
        >
          <Lista cursos={cursos} planos={planos} />
        </FaixaCursos>
      </section>

      <section className="secao" data-chao="papel" aria-labelledby="temas">
        <h2 id="temas" className="subtitulo temas__titulo">
          Explore por tema
        </h2>
        <ul className="temas">
          {categorias.map(([slug, nome]) => {
            const quantos = cursos.filter((c) => c.categoria.slug === slug).length;
            return (
              <li key={slug}>
                <Link href={`/cursos?categoria=${slug}`} className="tema">
                  <span className="tema__nome">{nome}</span>
                  <span className="tema__total">{quantos === 1 ? "1 curso" : `${quantos} cursos`}</span>
                  <span className="tema__seta" aria-hidden="true">
                    <Icone nome="direita" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Faixas por tema só quando o tema tem cursos suficientes para uma faixa. */}
        <div className="faixas">
          {categorias
            .filter(([slug]) => cursos.filter((c) => c.categoria.slug === slug).length >= 3)
            .map(([slug, nome]) => (
              <FaixaCursos
                key={slug}
                id={`faixa-${slug}`}
                titulo={nome}
                acao={
                  <Link href={`/cursos?categoria=${slug}`} className="link link--sublinhado faixa__link">
                    Ver tema
                  </Link>
                }
              >
                <Lista cursos={cursos.filter((c) => c.categoria.slug === slug)} planos={planos} />
              </FaixaCursos>
            ))}
        </div>
      </section>

      <section className="secao" data-chao="preto" aria-labelledby="como-funciona">
        <header className="topo topo--compacto">
          <p className="olho">Assinatura</p>
          <h2 id="como-funciona" className="titulo">
            Como funciona
          </h2>
        </header>
        <ol className="passos">
          {PASSOS.map(([titulo, texto], i) => (
            <li key={titulo} className="passo">
              <span className="passo__numero" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="passo__titulo">{titulo}</h3>
              <p className="passo__texto">{texto}</p>
            </li>
          ))}
        </ol>
        {planos.length > 0 && (
          <ul className="planos-resumo">
            {planos.map((p) => (
              <li key={p.id}>
                <span className="planos-resumo__nome">{p.nome}</span>
                <span className="planos-resumo__preco">
                  {preco(p.precoCentavos)}
                  <small>/mês</small>
                </span>
                <span className="planos-resumo__cursos">
                  {p.cursos.length === cursos.length ? "Todos os cursos" : `${p.cursos.length} cursos`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="acoes">
          <BotaoLink href="/planos" variante="secundario">
            Comparar planos
          </BotaoLink>
        </div>

        {/* Só avaliações reais, de quem fez pelo menos 30% do curso. Sem nenhuma, o bloco não aparece. */}
        {falas.length > 0 && (
          <div className="depoimentos">
            <h3 className="subtitulo">O que dizem os alunos</h3>
            <ul className="depoimentos__lista">
              {falas.slice(0, 3).map((d) => (
                <li key={d.nome + d.cursoSlug + d.comentario.slice(0, 20)} className="depoimento">
                  <Estrelas nota={d.nota} />
                  <blockquote className="depoimento__texto">
                    <p>{d.comentario}</p>
                  </blockquote>
                  <p className="depoimento__autor">
                    {d.nome}, sobre{" "}
                    <Link href={`/cursos/${d.cursoSlug}`} className="link link--sublinhado">
                      {d.curso}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="secao" data-chao="papel" aria-labelledby="perguntas">
        <div className="perguntas">
          <h2 id="perguntas" className="titulo">
            Perguntas frequentes
          </h2>
          <div className="acordeoes">
            {PERGUNTAS.map(([pergunta, resposta]) => (
              <Acordeao key={pergunta} titulo={pergunta}>
                <p>{resposta}</p>
              </Acordeao>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
