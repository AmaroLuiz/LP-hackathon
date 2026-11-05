import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoAssinar } from "@/components/cursos/BotaoAssinar";
import { CampoCupom } from "@/components/cursos/CampoCupom";
import { Acordeao, Aviso } from "@/components/ui/Exibicao";
import { condicaoFundador, listarCursos, listarPlanos, type CursoCard, type Plano } from "@/lib/api";
import { plural, preco } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Planos",
  description: "Assinatura mensal da PotencIA: compare os planos Essencial, Completo e Negócio e veja quais cursos cada um libera.",
  alternates: { canonical: "/planos" },
};

const PERGUNTAS = [
  ["Como funciona a cobrança?", "Mensal, no cartão de crédito ou no Pix, na página segura do Asaas (os dados do cartão não passam pela PotencIA). A assinatura renova sozinha todo mês até você cancelar."],
  ["E se o pagamento atrasar?", "Você recebe um e-mail com o link da fatura e continua com acesso por 5 dias. Depois disso, o acesso pausa até o pagamento; o seu progresso fica guardado."],
  ["Posso cancelar quando quiser?", "Sim, pela sua conta, sem multa. O acesso continua até o fim do mês já pago."],
  ["Posso trocar de plano?", "Sim. Ao subir de plano, os cursos novos liberam na hora. Ao descer, a troca vale a partir da próxima cobrança."],
  ["Como funciona o plano Negócio para a equipe?", "O titular convida até duas pessoas por e-mail. Cada uma tem a própria conta, com progresso e certificado."],
] as const;

/** Voltou da página de pagamento sem pagar (?checkout=cancelado|expirado). */
async function AvisoCheckout({ searchParams }: { searchParams: PageProps<"/planos">["searchParams"] }) {
  const { checkout } = await searchParams;
  if (checkout !== "cancelado" && checkout !== "expirado") return null;
  return (
    <div className="planos__aviso">
      <Aviso tipo="info" titulo={checkout === "expirado" ? "A página de pagamento expirou." : "O pagamento não foi concluído."}>
        Nada foi cobrado. Escolha o plano de novo quando quiser.
      </Aviso>
    </div>
  );
}

/** Aviso quando a pessoa chega vindo de um curso (?curso=slug). */
async function AvisoCurso({ searchParams, cursos, planos }: { searchParams: PageProps<"/planos">["searchParams"]; cursos: CursoCard[]; planos: Plano[] }) {
  const { curso: slug } = await searchParams;
  const curso = typeof slug === "string" ? cursos.find((c) => c.slug === slug) : undefined;
  if (!curso) return null;
  const nomes = planos.filter((p) => p.cursos.includes(curso.id)).map((p) => p.nome);
  return (
    <div className="planos__aviso">
      <Aviso tipo="info" titulo={`“${curso.titulo}” está ${nomes.length === 1 ? "no plano" : "nos planos"} ${nomes.join(", ")}.`}>
        <Link href={`/cursos/${curso.slug}`} className="link link--sublinhado">
          Voltar para o curso
        </Link>
      </Aviso>
    </div>
  );
}

export default async function Planos(props: PageProps<"/planos">) {
  const [planos, cursos, fundador] = await Promise.all([listarPlanos(), listarCursos(), condicaoFundador()]);

  return (
    <>
      <section className="secao" data-chao="papel" aria-labelledby="planos-titulo">
        <header className="topo">
          <p className="olho">Assinatura mensal · valores provisórios</p>
          <h1 id="planos-titulo" className="titulo">
            Escolha até onde quer ir.
          </h1>
          <p className="topo__apoio">Todos os planos recebem atualizações todo mês. Cancele quando quiser.</p>
        </header>

        <Suspense fallback={null}>
          <AvisoCheckout searchParams={props.searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <AvisoCurso searchParams={props.searchParams} cursos={cursos} planos={planos} />
        </Suspense>

        <Suspense fallback={null}>
          <CampoCupom planos={planos.map((p) => ({ id: p.id, nome: p.nome }))} />
        </Suspense>

        <ol className="planos">
          {planos.map((p, i) => (
            <li key={p.id} className="plano" style={{ "--degrau": i } as React.CSSProperties}>
              <h2 className="plano__nome">{p.nome}</h2>
              <p className="plano__preco">
                {preco(p.precoCentavos)}
                <span className="plano__mes">/mês</span>
              </p>
              <p className="plano__alcance">
                {p.cursos.length === cursos.length ? "Todos os cursos" : plural(p.cursos.length, "curso", "cursos")} ·{" "}
                {p.maxPessoas === 1 ? "1 pessoa" : `até ${p.maxPessoas} pessoas`}
              </p>
              <ul className="plano__itens">
                {p.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="plano__acao" data-chao={i === planos.length - 1 ? "preto" : undefined}>
                <Suspense fallback={null}>
                  <BotaoAssinar planoId={p.id} nome={p.nome} destaque={i === planos.length - 1} />
                </Suspense>
              </div>
            </li>
          ))}
        </ol>

        {fundador && (
          <div className="fundador">
            <p className="fundador__titulo">Condição de fundador</p>
            <p>
              Quem está na lista de espera paga {fundador.descontoPercentual}% a menos nas {fundador.mesesDesconto} primeiras cobranças e mantém
              o preço de lançamento por {fundador.mesesPrecoTravado} meses. Assine com o mesmo e-mail da lista: o desconto entra sozinho.
            </p>
          </div>
        )}
        <p className="planos__nota">Preços e itens ainda em validação.</p>
      </section>

      <section className="secao" data-chao="preto" aria-labelledby="comparar-titulo">
        <h2 id="comparar-titulo" className="titulo">
          O que cada plano libera
        </h2>
        <div className="tabela-moldura comparativo">
          <table className="tabela">
            <caption className="sr-only">Cursos incluídos em cada plano</caption>
            <thead>
              <tr>
                <th scope="col">Curso</th>
                {planos.map((p) => (
                  <th key={p.id} scope="col" className="comparativo__plano">
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <tr key={c.slug}>
                  <th scope="row">
                    <Link href={`/cursos/${c.slug}`} className="link">
                      <span className="comparativo__numero">{c.numero}</span>
                      {c.titulo}
                    </Link>
                  </th>
                  {planos.map((p) => (
                    <td key={p.id} className="comparativo__celula">
                      {p.cursos.includes(c.id) ? (
                        <>
                          <span className="comparativo__sim" aria-hidden="true" />
                          <span className="sr-only">Incluído</span>
                        </>
                      ) : (
                        <span className="comparativo__nao">
                          <span aria-hidden="true">–</span>
                          <span className="sr-only">Não incluído</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Pessoas na mesma assinatura</th>
                {planos.map((p) => (
                  <td key={p.id} className="comparativo__celula">
                    {p.maxPessoas}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="secao" data-chao="papel" aria-labelledby="perguntas-planos">
        <div className="perguntas">
          <h2 id="perguntas-planos" className="titulo">
            Dúvidas sobre a assinatura
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
