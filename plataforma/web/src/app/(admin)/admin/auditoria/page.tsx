import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import { Paginacao } from "@/components/ui/Paginacao";
import { ACOES, nomeDaAcao, type Pagina, type RegistroAuditoria } from "@/lib/admin";
import { inteiro } from "@/lib/formato";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Auditoria · Painel", robots: { index: false } };

const dataHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const ALVOS: Record<string, string> = {
  curso: "Curso",
  aula: "Aula",
  modulo: "Módulo",
  categoria: "Categoria",
  instrutor: "Instrutor",
  usuario: "Usuário",
  plano: "Plano",
  fundador: "Condição de fundador",
  evento: "Evento do gateway",
};

type Filtros = { acao: string; autor: string; alvoTipo: string; alvoId: string; de: string; ate: string; pagina: number };

function ler(p: Record<string, string | string[] | undefined>): Filtros {
  const um = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
  const dia = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const pagina = Number.parseInt(um(p.pagina), 10);
  return {
    acao: um(p.acao) in ACOES ? um(p.acao) : "",
    autor: um(p.autor).slice(0, 120),
    alvoTipo: um(p.alvoTipo) in ALVOS ? um(p.alvoTipo) : "",
    alvoId: um(p.alvoId).slice(0, 80),
    de: dia(um(p.de)),
    ate: dia(um(p.ate)),
    pagina: Number.isFinite(pagina) && pagina > 1 ? pagina : 1,
  };
}

function consulta(f: Filtros) {
  const p = new URLSearchParams();
  for (const [chave, valor] of Object.entries(f)) {
    if (chave === "pagina" ? Number(valor) > 1 : valor) p.set(chave, String(valor));
  }
  return p.toString();
}

/** O que mudou, em uma linha: "status: RASCUNHO → PUBLICADO". */
function mudancas(r: RegistroAuditoria) {
  const campos = Object.keys({ ...r.antes, ...r.depois });
  if (campos.length === 0) return null;
  const texto = (v: unknown) => (v === null || v === undefined || v === "" ? "vazio" : Array.isArray(v) ? v.join(", ") || "vazio" : String(v));
  return (
    <details className="auditoria__mudancas">
      <summary>{campos.length === 1 ? "1 campo" : `${campos.length} campos`}</summary>
      <dl>
        {campos.map((c) => (
          <div key={c}>
            <dt>{c}</dt>
            <dd>
              <span className="auditoria__antes">{texto(r.antes[c])}</span> <span aria-hidden="true">→</span>
              <span className="sr-only"> passou para </span> {texto(r.depois[c])}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/auditoria">["searchParams"] }) {
  await exigirAdmin("/admin/auditoria");
  const f = ler(await searchParams);
  const api = new URLSearchParams();
  if (f.acao) api.set("acao", f.acao);
  if (f.autor) api.set("autor", f.autor);
  if (f.alvoTipo) api.set("alvoTipo", f.alvoTipo);
  if (f.alvoId) api.set("alvoId", f.alvoId);
  // Dias no horário de Brasília (o "até" vale o dia inteiro).
  if (f.de) api.set("de", new Date(`${f.de}T00:00:00-03:00`).toISOString());
  if (f.ate) api.set("ate", new Date(new Date(`${f.ate}T00:00:00-03:00`).getTime() + 86_400_000).toISOString());
  api.set("pagina", String(f.pagina));
  api.set("tamanho", "30");
  const resultado = await buscarComSessao<Pagina<RegistroAuditoria>>(`/api/admin/auditoria?${api}`);
  const filtrando = Boolean(f.acao || f.autor || f.alvoTipo || f.alvoId || f.de || f.ate);

  return (
    <>
      <form className="painel-filtros" method="get" role="search" aria-label="Filtrar auditoria">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="a-acao">
            Ação
          </label>
          <select id="a-acao" name="acao" className="seletor" defaultValue={f.acao}>
            <option value="">Todas</option>
            {Object.entries(ACOES).map(([chave, texto]) => (
              <option key={chave} value={chave}>
                {texto}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="a-alvo">
            Sobre
          </label>
          <select id="a-alvo" name="alvoTipo" className="seletor" defaultValue={f.alvoTipo}>
            <option value="">Tudo</option>
            {Object.entries(ALVOS).map(([chave, texto]) => (
              <option key={chave} value={chave}>
                {texto}
              </option>
            ))}
          </select>
        </div>
        <div className="campo painel-filtros__busca">
          <label className="campo__rotulo" htmlFor="a-autor">
            Quem fez (e-mail)
          </label>
          <input id="a-autor" name="autor" type="search" className="campo__entrada" defaultValue={f.autor} />
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="a-de">
            De
          </label>
          <input id="a-de" name="de" type="date" className="campo__entrada" defaultValue={f.de} />
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="a-ate">
            Até
          </label>
          <input id="a-ate" name="ate" type="date" className="campo__entrada" defaultValue={f.ate} />
        </div>
        {f.alvoId && <input type="hidden" name="alvoId" value={f.alvoId} />}
        <button type="submit" className="botao botao--secundario botao--pequeno">
          Filtrar
        </button>
        {filtrando && (
          <Link href="/admin/auditoria" className="link link--sublinhado">
            Limpar filtros
          </Link>
        )}
      </form>
      {f.alvoId && <p className="painel-contagem">Mostrando só um item ({ALVOS[f.alvoTipo] ?? "item"} {f.alvoId}).</p>}
      <p className="painel-contagem" aria-live="polite">
        {inteiro(resultado.total)} {resultado.total === 1 ? "registro" : "registros"}
      </p>

      {resultado.itens.length === 0 ? (
        <EstadoVazio titulo="Nada registrado com esses filtros." />
      ) : (
        <div className="tabela-moldura">
          <table className="tabela tabela--densa auditoria">
            <caption className="sr-only">Ações registradas, das mais recentes para as mais antigas</caption>
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Quem</th>
                <th scope="col">Ação</th>
                <th scope="col">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {resultado.itens.map((r) => (
                <tr key={r.id}>
                  <td>
                    <time dateTime={r.quando}>{dataHora.format(new Date(r.quando))}</time>
                  </td>
                  <td>
                    {r.autorEmail ?? "Sistema"}
                    {r.ip && <span className="tabela__detalhe">IP {r.ip}</span>}
                  </td>
                  <td>
                    {nomeDaAcao(r.acao)}
                    {r.alvoTipo === "usuario" && (
                      <Link href={`/admin/usuarios/${r.alvoId}`} className="tabela__detalhe link link--sublinhado">
                        Ver usuário
                      </Link>
                    )}
                    {r.alvoTipo === "curso" && /^\d+$/.test(r.alvoId) && (
                      <Link href={`/admin/cursos/${r.alvoId}`} className="tabela__detalhe link link--sublinhado">
                        Ver curso
                      </Link>
                    )}
                  </td>
                  <td className="auditoria__detalhe">
                    {r.resumo}
                    {mudancas(r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={resultado.pagina} total={resultado.total} tamanho={resultado.tamanho} href={(p) => `/admin/auditoria?${consulta({ ...f, pagina: p })}`} rotulo="Páginas da auditoria" />
    </>
  );
}

export default function PaginaAuditoria(props: PageProps<"/admin/auditoria">) {
  return (
    <section className="painel-pagina" aria-labelledby="auditoria-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="auditoria-titulo" className="painel-topo__titulo">
          Auditoria
        </h1>
        <p className="painel-topo__apoio">Quem fez o quê e quando, no painel e nas contas (entradas, trocas de senha, papéis).</p>
      </header>
      <Suspense fallback={<Esqueleto altura="24rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
