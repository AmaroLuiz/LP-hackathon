import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Reprocessar } from "@/components/admin/Reprocessar";
import { EstadoVazio, Esqueleto, Selo } from "@/components/ui/Exibicao";
import { Paginacao } from "@/components/ui/Paginacao";
import type { Pagina } from "@/lib/admin";
import { listarPlanos } from "@/lib/api";
import { STATUS_ASSINATURA, type AssinaturaLinha, type EventoGateway, type Pessoa, type StatusAssinatura } from "@/lib/assinatura";
import { inteiro, preco } from "@/lib/formato";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Assinaturas · Painel", robots: { index: false } };

const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
const diaHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

type Filtros = { q: string; status: string; plano: string; fundador: string; pagina: number };

function ler(p: Record<string, string | string[] | undefined>): Filtros {
  const um = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
  const pagina = Number.parseInt(um(p.pagina), 10);
  return {
    q: um(p.q).slice(0, 100),
    status: um(p.status) in STATUS_ASSINATURA ? um(p.status) : "",
    plano: um(p.plano).slice(0, 40),
    fundador: ["true", "false"].includes(um(p.fundador)) ? um(p.fundador) : "",
    pagina: Number.isFinite(pagina) && pagina > 1 ? pagina : 1,
  };
}

function consulta(f: Filtros, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...f, pagina: f.pagina > 1 ? String(f.pagina) : "", ...extra })) {
    if (valor) p.set(chave, String(valor));
  }
  return p.toString();
}

async function Eventos() {
  const eventos = await buscarComSessao<EventoGateway[]>("/api/admin/eventos-gateway");
  if (eventos.length === 0) return null;
  return (
    <section className="painel-bloco painel-bloco--alerta" aria-labelledby="eventos-titulo">
      <h2 id="eventos-titulo" className="painel-bloco__titulo">
        Eventos do gateway não processados ({eventos.length})
      </h2>
      <p className="painel-bloco__apoio">
        Em geral, uma cobrança que chegou antes do aviso de checkout pago. Depois que a assinatura é reconhecida, reprocessar resolve.
      </p>
      <div className="tabela-moldura">
        <table className="tabela tabela--densa">
          <caption className="sr-only">Eventos não processados</caption>
          <thead>
            <tr>
              <th scope="col">Recebido</th>
              <th scope="col">Evento</th>
              <th scope="col">Erro</th>
              <th scope="col">
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id}>
                <td>{e.recebidoEm ? diaHora.format(new Date(e.recebidoEm)) : "—"}</td>
                <td>
                  {e.tipo}
                  <span className="tabela__detalhe">
                    {e.id} · {e.tentativas} {e.tentativas === 1 ? "tentativa" : "tentativas"}
                  </span>
                </td>
                <td>{e.erro ?? "Ainda não processado"}</td>
                <td>
                  <Reprocessar id={e.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/assinaturas">["searchParams"] }) {
  await exigirAdmin("/admin/assinaturas");
  const f = ler(await searchParams);
  const [resultado, planos] = await Promise.all([
    buscarComSessao<Pagina<{ assinatura: AssinaturaLinha; pessoa: Pessoa | null }>>(`/api/admin/assinaturas?${consulta(f, { tamanho: "25" })}`),
    listarPlanos(),
  ]);
  const filtrando = Boolean(f.q || f.status || f.plano || f.fundador);

  return (
    <>
      <Eventos />
      <form className="painel-filtros" method="get" role="search" aria-label="Filtrar assinaturas">
        <div className="campo painel-filtros__busca">
          <label className="campo__rotulo" htmlFor="as-q">
            Nome ou e-mail
          </label>
          <input id="as-q" name="q" type="search" className="campo__entrada" defaultValue={f.q} />
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="as-status">
            Situação
          </label>
          <select id="as-status" name="status" className="seletor" defaultValue={f.status}>
            <option value="">Todas</option>
            {(Object.keys(STATUS_ASSINATURA) as StatusAssinatura[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_ASSINATURA[s].texto}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="as-plano">
            Plano
          </label>
          <select id="as-plano" name="plano" className="seletor" defaultValue={f.plano}>
            <option value="">Todos</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="as-fundador">
            Fundador
          </label>
          <select id="as-fundador" name="fundador" className="seletor" defaultValue={f.fundador}>
            <option value="">Todos</option>
            <option value="true">Só fundadores</option>
            <option value="false">Sem a condição</option>
          </select>
        </div>
        <button type="submit" className="botao botao--secundario botao--pequeno">
          Filtrar
        </button>
        {filtrando && (
          <Link href="/admin/assinaturas" className="link link--sublinhado">
            Limpar filtros
          </Link>
        )}
      </form>
      <p className="painel-contagem" aria-live="polite">
        {inteiro(resultado.total)} {resultado.total === 1 ? "assinatura" : "assinaturas"}
      </p>
      {resultado.itens.length === 0 ? (
        <EstadoVazio titulo={filtrando ? "Nenhuma assinatura com esses filtros." : "Nenhuma assinatura ainda."} />
      ) : (
        <div className="tabela-moldura">
          <table className="tabela tabela--densa">
            <caption className="sr-only">Assinaturas, das mais novas para as mais antigas</caption>
            <thead>
              <tr>
                <th scope="col">Pessoa</th>
                <th scope="col">Plano</th>
                <th scope="col">Situação</th>
                <th scope="col" className="tabela__numero">
                  Próxima cobrança
                </th>
                <th scope="col">Período até</th>
                <th scope="col">Início</th>
              </tr>
            </thead>
            <tbody>
              {resultado.itens.map(({ assinatura: a, pessoa }) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/assinaturas/${a.id}`} className="link link--sublinhado">
                      {pessoa?.nome ?? "Conta removida"}
                    </Link>
                    <span className="tabela__detalhe">{pessoa?.email}</span>
                  </td>
                  <td>
                    {a.planoNome}
                    {a.fundador && <span className="tabela__detalhe">Fundador</span>}
                  </td>
                  <td>
                    <Selo tom={STATUS_ASSINATURA[a.status].tom}>{STATUS_ASSINATURA[a.status].texto}</Selo>
                  </td>
                  <td className="tabela__numero">{a.status === "ATIVA" || a.status === "EM_ATRASO" ? preco(a.valorProximaCobranca) : "—"}</td>
                  <td>{dia.format(new Date(a.fimPeriodoAtual))}</td>
                  <td>{dia.format(new Date(a.inicio))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={resultado.pagina} total={resultado.total} tamanho={resultado.tamanho} href={(p) => `/admin/assinaturas?${consulta({ ...f, pagina: p })}`} rotulo="Páginas de assinaturas" />
    </>
  );
}

export default function PaginaAssinaturas(props: PageProps<"/admin/assinaturas">) {
  return (
    <section className="painel-pagina" aria-labelledby="assinaturas-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="assinaturas-titulo" className="painel-topo__titulo">
          Assinaturas
        </h1>
      </header>
      <Suspense fallback={<Esqueleto altura="24rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
