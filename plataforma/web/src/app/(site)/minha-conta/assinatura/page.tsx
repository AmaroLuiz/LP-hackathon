import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CancelarAssinatura, GerenciarEquipe, ReativarAssinatura, SairDaEquipe, TrocarPlano } from "@/components/assinatura/AcoesAssinatura";
import { BotaoLink } from "@/components/ui/Botao";
import { Aviso, EstadoVazio, Esqueleto, Selo } from "@/components/ui/Exibicao";
import { listarPlanos } from "@/lib/api";
import { METODOS, STATUS_ASSINATURA, STATUS_PAGAMENTO, type Equipe, type MinhaAssinatura, type Participacao } from "@/lib/assinatura";
import { dataPorExtenso, preco } from "@/lib/formato";
import { buscarComSessao, exigirUsuario, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Minha assinatura", robots: { index: false } };

const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function data(iso: string | null) {
  return iso ? dia.format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)) : "—";
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/minha-conta/assinatura">["searchParams"] }) {
  await exigirUsuario("/minha-conta/assinatura");
  const { checkout } = await searchParams;
  const [resposta, planos, participacoes, equipe] = await Promise.all([
    pedirComSessao<MinhaAssinatura>("/api/me/assinatura"),
    listarPlanos(),
    buscarComSessao<Participacao[]>("/api/me/participacoes"),
    pedirComSessao<Equipe>("/api/me/equipe"),
  ]);
  const a = resposta.ok ? resposta.dados : null;
  const status = a ? STATUS_ASSINATURA[a.status] : null;

  return (
    <>
      {checkout === "ok" && a?.status === "PENDENTE" && (
        <Aviso tipo="info" titulo="Estamos esperando a confirmação do pagamento.">
          Costuma levar menos de um minuto (no Pix, assim que você paga). Recarregue a página em instantes.
        </Aviso>
      )}
      {checkout === "ok" && a?.daAcesso && a.status === "ATIVA" && (
        <Aviso tipo="sucesso" titulo={`Assinatura do plano ${a.plano.nome} ativa.`}>
          <Link href="/minha-conta/cursos" className="link link--sublinhado">
            Ir para os cursos
          </Link>
        </Aviso>
      )}

      {participacoes.length > 0 && (
        <section className="assinatura-bloco" aria-labelledby="participacao-titulo">
          <h2 id="participacao-titulo" className="subtitulo">
            Equipe de que você participa
          </h2>
          <ul className="lista-simples">
            {participacoes.map((p) => (
              <li key={p.membroId}>
                <span>
                  <strong>{p.titular}</strong> incluiu você no plano {p.plano}.{" "}
                  {p.daAcesso ? <Selo tom="salvia">Com acesso</Selo> : <Selo>Sem acesso agora</Selo>}
                </span>
                <SairDaEquipe membroId={p.membroId} titular={p.titular} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!a || a.status === "EXPIRADA" ? (
        <EstadoVazio
          titulo={a ? "Sua assinatura terminou." : "Você ainda não assina a PotencIA."}
          acao={<BotaoLink href="/planos">Ver planos</BotaoLink>}
        >
          {a ? `O plano ${a.plano.nome} encerrou em ${dataPorExtenso(a.fimPeriodoAtual)}. Assine de novo quando quiser: seu progresso continua salvo.` : "Escolha um plano para liberar os cursos. Dá para cancelar quando quiser."}
        </EstadoVazio>
      ) : (
        <>
          <section className="assinatura-bloco" aria-labelledby="plano-titulo">
            <div className="assinatura-cabeca">
              <div>
                <p className="olho">Seu plano</p>
                <h2 id="plano-titulo" className="assinatura-cabeca__plano">
                  {a.plano.nome}
                </h2>
              </div>
              {status && <Selo tom={status.tom}>{status.texto}</Selo>}
            </div>

            {a.status === "PENDENTE" && a.urlPagamento && (
              <Aviso tipo="info" titulo="O pagamento ainda não foi concluído.">
                <a href={a.urlPagamento} className="link link--sublinhado">
                  Continuar o pagamento
                </a>{" "}
                ou escolha outro plano em{" "}
                <Link href="/planos" className="link link--sublinhado">
                  Planos
                </Link>
                .
              </Aviso>
            )}
            {a.status === "EM_ATRASO" && (
              <Aviso tipo="erro" titulo={`A última cobrança não foi paga. Seu acesso continua até ${dataPorExtenso(a.fimCarencia ?? a.fimPeriodoAtual)}.`}>
                {a.pagamentos.find((p) => p.urlFatura && p.status !== "CONFIRMADO")?.urlFatura ? (
                  <a href={a.pagamentos.find((p) => p.urlFatura && p.status !== "CONFIRMADO")!.urlFatura!} className="link link--sublinhado">
                    Pagar a fatura em aberto
                  </a>
                ) : (
                  "Confira o e-mail com o link da fatura."
                )}
              </Aviso>
            )}
            {a.status === "CANCELADA" && (
              <Aviso tipo="info" titulo={`Cancelada. Você tem acesso até ${dataPorExtenso(a.fimPeriodoAtual)} e nada mais será cobrado.`}>
                Mudou de ideia? Reative até lá, sem pagar nada agora: a cobrança volta só no fim do período.
              </Aviso>
            )}

            <dl className="dados-conta">
              {a.proximaCobranca && (
                <div>
                  <dt>Próxima cobrança</dt>
                  <dd>
                    {preco(a.proximaCobranca.valorCentavos)} em {dataPorExtenso(a.proximaCobranca.data)}
                    {a.planoAgendado && <Selo tom="ouro">Plano {a.planoAgendado.nome}</Selo>}
                  </dd>
                </div>
              )}
              {a.status !== "PENDENTE" && (
                <div>
                  <dt>{a.status === "CANCELADA" ? "Acesso até" : "Período pago até"}</dt>
                  <dd>{dataPorExtenso(a.fimPeriodoAtual)}</dd>
                </div>
              )}
              <div>
                <dt>Forma de pagamento</dt>
                <dd>{a.metodo ? METODOS[a.metodo] ?? a.metodo : "—"}</dd>
              </div>
              <div>
                <dt>Assinante desde</dt>
                <dd>{dataPorExtenso(a.inicio)}</dd>
              </div>
              {a.cupom && (
                <div>
                  <dt>Cupom {a.cupom}</dt>
                  <dd>
                    {a.mesesComDesconto > 0
                      ? `${a.descontoPercentual}% de desconto em mais ${a.mesesComDesconto} ${a.mesesComDesconto === 1 ? "cobrança" : "cobranças"}`
                      : "Desconto do cupom já usado"}
                  </dd>
                </div>
              )}
              {a.fundador && (
                <div>
                  <dt>Condição de fundador</dt>
                  <dd>
                    {a.cupom
                      ? "O cupom deu mais desconto e foi usado no lugar do desconto de lançamento"
                      : a.mesesComDesconto > 0
                        ? `${a.descontoPercentual}% de desconto em mais ${a.mesesComDesconto} ${a.mesesComDesconto === 1 ? "cobrança" : "cobranças"}`
                        : "Desconto de lançamento já usado"}
                    {a.precoTravadoAte && ` · preço travado até ${dataPorExtenso(a.precoTravadoAte)}`}
                  </dd>
                </div>
              )}
            </dl>

            {a.status === "CANCELADA" && a.podeReativar && <ReativarAssinatura />}
          </section>

          {(a.status === "ATIVA" || a.status === "EM_ATRASO") && (
            <section className="assinatura-bloco" aria-labelledby="trocar-titulo">
              <h2 id="trocar-titulo" className="subtitulo">
                Trocar de plano
              </h2>
              {a.status === "ATIVA" ? (
                <TrocarPlano assinatura={a} planos={planos.map((p) => ({ id: p.id, nome: p.nome, precoCentavos: p.precoCentavos, maxPessoas: p.maxPessoas }))} />
              ) : (
                <p className="painel-bloco__apoio">Pague a fatura em aberto para poder trocar de plano.</p>
              )}
            </section>
          )}

          {equipe.ok && (
            <section className="assinatura-bloco" aria-labelledby="equipe-titulo">
              <h2 id="equipe-titulo" className="subtitulo">
                Sua equipe
              </h2>
              <p className="painel-bloco__apoio">Cada pessoa tem a própria conta, com progresso e certificados.</p>
              <GerenciarEquipe inicial={equipe.dados} />
            </section>
          )}

          <section className="assinatura-bloco" aria-labelledby="pagamentos-titulo">
            <h2 id="pagamentos-titulo" className="subtitulo">
              Cobranças
            </h2>
            {a.pagamentos.length === 0 ? (
              <p className="painel-bloco__apoio">Nenhuma cobrança ainda.</p>
            ) : (
              <div className="tabela-moldura">
                <table className="tabela">
                  <caption className="sr-only">Histórico de cobranças</caption>
                  <thead>
                    <tr>
                      <th scope="col">Vencimento</th>
                      <th scope="col" className="tabela__numero">
                        Valor
                      </th>
                      <th scope="col">Situação</th>
                      <th scope="col">Fatura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.pagamentos.map((p) => (
                      <tr key={p.id}>
                        <td>{data(p.vencimento ?? p.pagoEm)}</td>
                        <td className="tabela__numero">{preco(p.valorCentavos)}</td>
                        <td>
                          <Selo tom={p.status === "CONFIRMADO" ? "salvia" : p.status === "RECUSADO" || p.status === "ATRASADO" ? "erro" : "neutro"}>
                            {STATUS_PAGAMENTO[p.status] ?? p.status}
                          </Selo>
                        </td>
                        <td>
                          {p.urlFatura ? (
                            <a href={p.urlFatura} className="link link--sublinhado" target="_blank" rel="noopener noreferrer">
                              Abrir fatura<span className="sr-only"> (abre em outra aba)</span>
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {(a.status === "ATIVA" || a.status === "EM_ATRASO") && (
            <section className="assinatura-bloco assinatura-bloco--discreto" aria-labelledby="cancelar-titulo">
              <h2 id="cancelar-titulo" className="subtitulo">
                Cancelar
              </h2>
              <p className="painel-bloco__apoio">Sem multa. O acesso continua até o fim do período já pago.</p>
              <CancelarAssinatura assinatura={a} />
            </section>
          )}
        </>
      )}
    </>
  );
}

export default function PaginaMinhaAssinatura(props: PageProps<"/minha-conta/assinatura">) {
  return (
    <section className="secao" data-chao="papel" aria-labelledby="assinatura-titulo">
      <header className="topo topo--compacto">
        <p className="olho">
          <Link href="/minha-conta" className="link">
            Minha conta
          </Link>
        </p>
        <h1 id="assinatura-titulo" className="titulo">
          Minha assinatura
        </h1>
      </header>
      <div className="assinatura">
        <Suspense fallback={<Esqueleto altura="20rem" />}>
          <Conteudo searchParams={props.searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
