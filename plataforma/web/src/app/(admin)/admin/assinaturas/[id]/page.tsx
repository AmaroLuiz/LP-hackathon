import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Reprocessar } from "@/components/admin/Reprocessar";
import { Esqueleto, Selo } from "@/components/ui/Exibicao";
import { METODOS, STATUS_ASSINATURA, STATUS_PAGAMENTO, type AssinaturaAdmin, type Pessoa } from "@/lib/assinatura";
import { preco } from "@/lib/formato";
import { exigirAdmin, pedirComSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Assinatura · Painel", robots: { index: false } };

const diaHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function quando(iso: string | null | undefined, comHora = true) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return comHora && iso.length > 10 ? diaHora.format(d) : dia.format(d);
}

type Detalhe = { detalhe: AssinaturaAdmin; pessoa: Pessoa | null; membros: Record<string, Pessoa> };

async function Conteudo({ params }: { params: PageProps<"/admin/assinaturas/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await exigirAdmin(`/admin/assinaturas/${id}`);
  const r = await pedirComSessao<Detalhe>(`/api/admin/assinaturas/${id}`);
  if (!r.ok) notFound();
  const { detalhe: d, pessoa, membros } = r.dados;
  const a = d.assinatura;
  const status = STATUS_ASSINATURA[a.status];

  return (
    <>
      <header className="painel-topo">
        <p className="olho">
          <Link href="/admin/assinaturas" className="link">
            Assinaturas
          </Link>{" "}
          / Detalhe
        </p>
        <h1 className="painel-topo__titulo">
          {a.planoNome} · {pessoa?.nome ?? "Conta removida"}
        </h1>
        <p className="editor__meta">
          <Selo tom={status.tom}>{status.texto}</Selo>
          {a.fundador && <Selo tom="ouro">Fundador</Selo>}
          {pessoa && (
            <Link href={`/admin/usuarios/${pessoa.id}`} className="link link--sublinhado">
              Ver a ficha de {pessoa.nome.split(" ")[0]}
            </Link>
          )}
        </p>
      </header>

      <div className="editor-grade">
        <section className="painel-bloco" aria-labelledby="ad-dados">
          <h2 id="ad-dados" className="painel-bloco__titulo">
            Assinatura
          </h2>
          <dl className="dados-conta dados-conta--densa">
            <div>
              <dt>E-mail</dt>
              <dd>{pessoa?.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Preço contratado</dt>
              <dd>{preco(a.precoCentavos)}/mês</dd>
            </div>
            <div>
              <dt>Próxima cobrança</dt>
              <dd>{a.status === "ATIVA" || a.status === "EM_ATRASO" ? `${preco(a.valorProximaCobranca)} em ${quando(a.fimPeriodoAtual, false)}` : "—"}</dd>
            </div>
            {d.planoAgendado && (
              <div>
                <dt>Troca agendada</dt>
                <dd>Para o {d.planoAgendado.nome} na próxima cobrança</dd>
              </div>
            )}
            <div>
              <dt>Início</dt>
              <dd>{quando(a.inicio)}</dd>
            </div>
            <div>
              <dt>Período pago até</dt>
              <dd>{quando(a.fimPeriodoAtual)}</dd>
            </div>
            <div>
              <dt>Cobranças pagas</dt>
              <dd>{d.pagamentosConfirmados}</dd>
            </div>
            {a.fundador && (
              <div>
                <dt>Condição de fundador</dt>
                <dd>
                  {d.descontoPercentual}% nas {d.mesesDesconto} primeiras cobranças
                  {d.precoTravadoAte && ` · preço travado até ${quando(d.precoTravadoAte, false)}`}
                </dd>
              </div>
            )}
            {a.canceladaEm && (
              <div>
                <dt>Cancelada em</dt>
                <dd>
                  {quando(a.canceladaEm)}
                  {d.motivoCancelamento && <span className="tabela__detalhe">Motivo: {d.motivoCancelamento}</span>}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="painel-bloco" aria-labelledby="ad-gateway">
          <h2 id="ad-gateway" className="painel-bloco__titulo">
            No gateway ({a.gateway})
          </h2>
          <dl className="dados-conta dados-conta--densa">
            <div>
              <dt>Assinatura</dt>
              <dd>
                <code className="codigo">{a.gatewayId ?? "ainda não informada"}</code>
                {d.linkNoGateway && (
                  <a href={d.linkNoGateway} className="link link--sublinhado" target="_blank" rel="noopener noreferrer">
                    Abrir no gateway<span className="sr-only"> (abre em outra aba)</span>
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>
                <code className="codigo">{d.gatewayCliente ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>Checkout</dt>
              <dd>
                <code className="codigo">{d.checkoutId ?? "—"}</code>
              </dd>
            </div>
          </dl>
          {d.equipe.length > 0 && (
            <>
              <h3 className="painel-bloco__subtitulo">Equipe</h3>
              <ul className="lista-simples">
                {d.equipe.map((m) => (
                  <li key={m.id}>
                    {m.usuarioId && membros[m.usuarioId] ? (
                      <Link href={`/admin/usuarios/${m.usuarioId}`} className="link link--sublinhado">
                        {membros[m.usuarioId].nome}
                      </Link>
                    ) : (
                      m.email
                    )}
                    <span className="tabela__detalhe">
                      {m.status === "ATIVO" ? `Na equipe desde ${quando(m.entrouEm, false)}` : m.status === "CONVIDADO" ? "Convite enviado" : "Removido"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="painel-bloco" aria-labelledby="ad-pagamentos">
        <h2 id="ad-pagamentos" className="painel-bloco__titulo">
          Cobranças
        </h2>
        {d.pagamentos.length === 0 ? (
          <p className="painel-bloco__apoio">Nenhuma cobrança registrada.</p>
        ) : (
          <div className="tabela-moldura">
            <table className="tabela tabela--densa">
              <caption className="sr-only">Cobranças desta assinatura</caption>
              <thead>
                <tr>
                  <th scope="col">Vencimento</th>
                  <th scope="col" className="tabela__numero">
                    Valor
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col">Forma</th>
                  <th scope="col">Pago em</th>
                  <th scope="col">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {d.pagamentos.map((p) => (
                  <tr key={p.id}>
                    <td>{quando(p.vencimento, false)}</td>
                    <td className="tabela__numero">{preco(p.valorCentavos)}</td>
                    <td>{STATUS_PAGAMENTO[p.status] ?? p.status}</td>
                    <td>{p.metodo ? METODOS[p.metodo] ?? p.metodo : "—"}</td>
                    <td>{quando(p.pagoEm)}</td>
                    <td>
                      {p.urlFatura ? (
                        <a href={p.urlFatura} className="link link--sublinhado" target="_blank" rel="noopener noreferrer">
                          Abrir<span className="sr-only"> a fatura (outra aba)</span>
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

      <section className="painel-bloco" aria-labelledby="ad-eventos">
        <h2 id="ad-eventos" className="painel-bloco__titulo">
          Eventos recebidos
        </h2>
        {d.eventos.length === 0 ? (
          <p className="painel-bloco__apoio">Nenhum evento ligado a esta assinatura.</p>
        ) : (
          <ol className="linha-do-tempo">
            {d.eventos.map((e) => (
              <li key={e.id}>
                <time dateTime={e.recebidoEm ?? undefined}>{quando(e.recebidoEm)}</time>
                <span>
                  <strong>{e.tipo}</strong> <span className="tabela__detalhe">{e.id}</span>
                  {e.erro && (
                    <>
                      <span className="campo__erro">{e.erro}</span>
                      <Reprocessar id={e.id} />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

export default function DetalheAssinatura(props: PageProps<"/admin/assinaturas/[id]">) {
  return (
    <section className="painel-pagina" aria-label="Detalhe da assinatura">
      <Suspense fallback={<Esqueleto altura="30rem" />}>
        <Conteudo params={props.params} />
      </Suspense>
    </section>
  );
}
