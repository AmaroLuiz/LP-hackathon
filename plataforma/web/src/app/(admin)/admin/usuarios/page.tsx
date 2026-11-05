import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EstadoVazio, Esqueleto, Selo } from "@/components/ui/Exibicao";
import { Paginacao } from "@/components/ui/Paginacao";
import type { Pagina, UsuarioItem } from "@/lib/admin";
import { listarPlanos } from "@/lib/api";
import { inteiro } from "@/lib/formato";
import { buscarComSessao, exigirAdmin } from "@/lib/sessao";

export const metadata: Metadata = { title: "Usuários · Painel", robots: { index: false } };

const TAMANHO = 25;
const data = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

type Filtros = { q: string; papel: string; verificado: string; bloqueado: string; plano: string; pagina: number };

function ler(p: Record<string, string | string[] | undefined>): Filtros {
  const um = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
  const so = (v: string, ok: string[]) => (ok.includes(v) ? v : "");
  const pagina = Number.parseInt(um(p.pagina), 10);
  return {
    q: um(p.q).slice(0, 100),
    papel: so(um(p.papel), ["USUARIO", "ADMIN"]),
    verificado: so(um(p.verificado), ["true", "false"]),
    bloqueado: so(um(p.bloqueado), ["true", "false"]),
    plano: um(p.plano).slice(0, 40),
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

async function Conteudo({ searchParams }: { searchParams: PageProps<"/admin/usuarios">["searchParams"] }) {
  await exigirAdmin("/admin/usuarios");
  const f = ler(await searchParams);
  const [resultado, planos] = await Promise.all([
    buscarComSessao<Pagina<UsuarioItem>>(`/api/admin/usuarios?${consulta(f, { tamanho: String(TAMANHO) })}`),
    listarPlanos(),
  ]);
  const filtrando = Boolean(f.q || f.papel || f.verificado || f.bloqueado || f.plano);
  const semPagina = { ...f, pagina: 1 };

  return (
    <>
      <form className="painel-filtros" method="get" role="search" aria-label="Filtrar usuários">
        <div className="campo painel-filtros__busca">
          <label className="campo__rotulo" htmlFor="u-q">
            Nome ou e-mail
          </label>
          <input id="u-q" name="q" type="search" className="campo__entrada" defaultValue={f.q} />
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="u-papel">
            Papel
          </label>
          <select id="u-papel" name="papel" className="seletor" defaultValue={f.papel}>
            <option value="">Todos</option>
            <option value="USUARIO">Aluno</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="u-plano">
            Plano
          </label>
          <select id="u-plano" name="plano" className="seletor" defaultValue={f.plano}>
            <option value="">Qualquer</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="u-verificado">
            E-mail
          </label>
          <select id="u-verificado" name="verificado" className="seletor" defaultValue={f.verificado}>
            <option value="">Todos</option>
            <option value="true">Confirmado</option>
            <option value="false">Sem confirmar</option>
          </select>
        </div>
        <div className="campo">
          <label className="campo__rotulo" htmlFor="u-bloqueado">
            Situação
          </label>
          <select id="u-bloqueado" name="bloqueado" className="seletor" defaultValue={f.bloqueado}>
            <option value="">Todas</option>
            <option value="false">Ativa</option>
            <option value="true">Bloqueada</option>
          </select>
        </div>
        <button type="submit" className="botao botao--secundario botao--pequeno">
          Filtrar
        </button>
        {filtrando && (
          <Link href="/admin/usuarios" className="link link--sublinhado">
            Limpar filtros
          </Link>
        )}
      </form>

      <div className="painel-barra">
        <p className="painel-contagem" aria-live="polite">
          {inteiro(resultado.total)} {resultado.total === 1 ? "conta" : "contas"}
          {filtrando && " com esses filtros"}
        </p>
        {/* Download direto da API (mesmo domínio): leva o cookie de sessão. */}
        <a className="botao botao--secundario botao--pequeno" href={`/api/admin/usuarios.csv?${consulta(semPagina)}`} download>
          Exportar CSV
        </a>
      </div>

      {resultado.itens.length === 0 ? (
        <EstadoVazio titulo="Nenhuma conta encontrada." acao={filtrando ? <Link href="/admin/usuarios" className="link link--sublinhado">Ver todas as contas</Link> : undefined}>
          {filtrando ? "Tente outro nome, e-mail ou filtro." : "As contas aparecem aqui assim que alguém se cadastra."}
        </EstadoVazio>
      ) : (
        <div className="tabela-moldura">
          <table className="tabela tabela--densa">
            <caption className="sr-only">Usuários</caption>
            <thead>
              <tr>
                <th scope="col">Pessoa</th>
                <th scope="col">Papel</th>
                <th scope="col">Plano</th>
                <th scope="col">Situação</th>
                <th scope="col">Cadastro</th>
                <th scope="col">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {resultado.itens.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/usuarios/${u.id}`} className="link link--sublinhado">
                      {u.nome}
                    </Link>
                    <span className="tabela__detalhe">{u.email}</span>
                  </td>
                  <td>{u.papel === "ADMIN" ? <Selo tom="ouro">Admin</Selo> : "Aluno"}</td>
                  <td>{u.plano ?? "—"}</td>
                  <td>
                    {u.bloqueado ? <Selo tom="erro">Bloqueada</Selo> : u.emailVerificado ? <Selo tom="salvia">Ativa</Selo> : <Selo>E-mail sem confirmar</Selo>}
                  </td>
                  <td>{data.format(new Date(u.criadoEm))}</td>
                  <td>{u.ultimoAcessoEm ? data.format(new Date(u.ultimoAcessoEm)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={resultado.pagina} total={resultado.total} tamanho={resultado.tamanho} href={(p) => `/admin/usuarios?${consulta({ ...f, pagina: p })}`} rotulo="Páginas de usuários" />
    </>
  );
}

export default function PaginaUsuarios(props: PageProps<"/admin/usuarios">) {
  return (
    <section className="painel-pagina" aria-labelledby="usuarios-titulo">
      <header className="painel-topo">
        <p className="olho">Painel admin</p>
        <h1 id="usuarios-titulo" className="painel-topo__titulo">
          Usuários
        </h1>
      </header>
      <Suspense fallback={<Esqueleto altura="24rem" />}>
        <Conteudo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
