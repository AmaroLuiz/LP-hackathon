import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardCurso } from "@/components/cursos/CardCurso";
import { FormFiltros, SeletorOrdem } from "@/components/cursos/FormFiltros";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import { listarCursos, listarPlanos, planoMinimo } from "@/lib/api";
import {
  DURACOES,
  filtrar,
  lerFiltros,
  NOTAS_MINIMAS,
  opcoesDeFiltro,
  ORDENS,
  POR_PAGINA,
  temFiltroAtivo,
  urlDosFiltros,
  type Filtros,
} from "@/lib/catalogo";
import { NIVEIS, plural } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Todos os cursos",
  description: "Cursos de IA para pequenos negócios: vídeos, artes, carrosséis, voz e vendas. Busque e filtre por tema, nível e duração.",
  alternates: { canonical: "/cursos" },
};

type Chip = { rotulo: string; sem: Partial<Filtros> };

function chipsAtivos(f: Filtros, nomes: Map<string, string>, planos: Map<string, string>): Chip[] {
  const chips: Chip[] = [];
  if (f.q) chips.push({ rotulo: `“${f.q}”`, sem: { q: "" } });
  f.categorias.forEach((c) => chips.push({ rotulo: nomes.get(c) ?? c, sem: { categorias: f.categorias.filter((x) => x !== c) } }));
  f.niveis.forEach((n) => chips.push({ rotulo: NIVEIS[n], sem: { niveis: f.niveis.filter((x) => x !== n) } }));
  f.duracoes.forEach((d) => chips.push({ rotulo: DURACOES[d], sem: { duracoes: f.duracoes.filter((x) => x !== d) } }));
  f.ferramentas.forEach((x) => chips.push({ rotulo: x, sem: { ferramentas: f.ferramentas.filter((y) => y !== x) } }));
  if (f.notaMinima) chips.push({ rotulo: `Nota ${String(f.notaMinima).replace(".", ",")}+`, sem: { notaMinima: null } });
  if (f.plano) chips.push({ rotulo: `Plano ${planos.get(f.plano) ?? f.plano}`, sem: { plano: null } });
  if (f.soPrevia) chips.push({ rotulo: "Com prévia grátis", sem: { soPrevia: false } });
  return chips;
}

async function Catalogo({ searchParams }: { searchParams: PageProps<"/cursos">["searchParams"] }) {
  const [parametros, cursos, planos] = await Promise.all([searchParams, listarCursos(), listarPlanos()]);
  const f = lerFiltros(parametros);
  const opcoes = opcoesDeFiltro(cursos);
  const encontrados = filtrar(cursos, planos, f);
  const visiveis = encontrados.slice(0, f.pagina * POR_PAGINA);
  const chips = chipsAtivos(f, new Map(opcoes.categorias.map((c) => [c.slug, c.nome])), new Map(planos.map((p) => [p.id, p.nome])));
  const filtrando = temFiltroAtivo(f);

  return (
    <div className="catalogo">
      <FormFiltros estado={urlDosFiltros(f).split("?")[1] ?? ""}>
        <div className="filtros__busca">
          <label htmlFor="busca-catalogo" className="sr-only">
            Buscar cursos
          </label>
          <input
            id="busca-catalogo"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Buscar por tema, ferramenta ou resultado"
            className="campo__entrada"
          />
          <Icone nome="busca" />
        </div>

        <details className="filtros__painel" open>
          <summary className="filtros__resumo">
            <Icone nome="filtro" /> Filtros{filtrando ? ` (${chips.length})` : ""}
          </summary>

          <fieldset className="filtros__grupo">
            <legend>Tema</legend>
            {opcoes.categorias.map((c) => (
              <label key={c.slug} className="filtros__opcao">
                <input type="checkbox" name="categoria" value={c.slug} defaultChecked={f.categorias.includes(c.slug)} />
                {c.nome}
              </label>
            ))}
          </fieldset>

          {opcoes.ferramentas.length > 1 && (
            <fieldset className="filtros__grupo">
              <legend>Ferramenta</legend>
              {opcoes.ferramentas.map((x) => (
                <label key={x} className="filtros__opcao">
                  <input type="checkbox" name="ferramenta" value={x} defaultChecked={f.ferramentas.includes(x)} />
                  {x}
                </label>
              ))}
            </fieldset>
          )}

          {opcoes.duracoes.length > 0 && (
            <fieldset className="filtros__grupo">
              <legend>Duração</legend>
              {opcoes.duracoes.map((d) => (
                <label key={d} className="filtros__opcao">
                  <input type="checkbox" name="duracao" value={d} defaultChecked={f.duracoes.includes(d)} />
                  {DURACOES[d]}
                </label>
              ))}
            </fieldset>
          )}

          {opcoes.niveis.length > 1 && (
            <fieldset className="filtros__grupo">
              <legend>Nível</legend>
              {opcoes.niveis.map((n) => (
                <label key={n} className="filtros__opcao">
                  <input type="checkbox" name="nivel" value={n} defaultChecked={f.niveis.includes(n)} />
                  {NIVEIS[n]}
                </label>
              ))}
            </fieldset>
          )}

          {opcoes.temAvaliacoes && (
            <fieldset className="filtros__grupo">
              <legend>Avaliação</legend>
              <label className="filtros__opcao">
                <input type="radio" name="nota" value="" defaultChecked={!f.notaMinima} />
                Qualquer nota
              </label>
              {NOTAS_MINIMAS.map((n) => (
                <label key={n} className="filtros__opcao">
                  <input type="radio" name="nota" value={n} defaultChecked={f.notaMinima === n} />
                  {String(n).replace(".", ",")} ou mais
                </label>
              ))}
            </fieldset>
          )}

          <fieldset className="filtros__grupo">
            <legend>Incluído no plano</legend>
            <label className="filtros__opcao">
              <input type="radio" name="plano" value="" defaultChecked={!f.plano} />
              Qualquer plano
            </label>
            {planos.map((p) => (
              <label key={p.id} className="filtros__opcao">
                <input type="radio" name="plano" value={p.id} defaultChecked={f.plano === p.id} />
                {p.nome}
              </label>
            ))}
          </fieldset>

          {opcoes.temPrevia && (
            <fieldset className="filtros__grupo">
              <legend className="sr-only">Prévia</legend>
              <label className="filtros__opcao">
                <input type="checkbox" name="previa" value="1" defaultChecked={f.soPrevia} />
                Com aula de prévia grátis
              </label>
            </fieldset>
          )}

          <noscript>
            <button type="submit" className="botao botao--secundario botao--pequeno">
              Aplicar filtros
            </button>
          </noscript>
        </details>
      </FormFiltros>

      <div className="catalogo__resultados">
        <div className="catalogo__barra">
          <p className="catalogo__total" aria-live="polite">
            {plural(encontrados.length, "curso encontrado", "cursos encontrados")}
          </p>
          <label className="catalogo__ordem">
            <span>Ordenar por</span>
            <SeletorOrdem valor={f.ordem} opcoes={ORDENS} />
          </label>
        </div>

        {chips.length > 0 && (
          <ul className="chips" aria-label="Filtros ativos">
            {chips.map((c) => (
              <li key={c.rotulo}>
                <Link href={urlDosFiltros(f, { ...c.sem, pagina: 1 })} scroll={false} className="chip">
                  {c.rotulo}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">(remover filtro)</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cursos" scroll={false} className="link link--sublinhado chips__limpar">
                Limpar tudo
              </Link>
            </li>
          </ul>
        )}

        {encontrados.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum curso com esses filtros."
            acao={
              <BotaoLink href="/cursos" variante="secundario" pequeno>
                Limpar filtros
              </BotaoLink>
            }
          >
            Tente outra palavra ou tire algum filtro. Ferramentas e temas também entram na busca.
          </EstadoVazio>
        ) : (
          <ul className="grade-cursos grade-cursos--catalogo">
            {visiveis.map((c, i) => (
              <li key={c.slug}>
                <CardCurso curso={c} plano={planoMinimo(planos, c.id)} prioridade={i < 3} />
              </li>
            ))}
          </ul>
        )}

        {visiveis.length < encontrados.length && (
          <div className="catalogo__mais">
            <BotaoLink href={urlDosFiltros(f, { pagina: f.pagina + 1 })} scroll={false} variante="secundario">
              Carregar mais ({encontrados.length - visiveis.length})
            </BotaoLink>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaginaCatalogo(props: PageProps<"/cursos">) {
  return (
    <section className="secao" data-chao="preto" aria-labelledby="catalogo-titulo">
      <header className="topo topo--compacto">
        <p className="olho">Catálogo</p>
        <h1 id="catalogo-titulo" className="titulo">
          Todos os cursos
        </h1>
      </header>
      <Suspense
        fallback={
          <div className="catalogo" aria-busy="true">
            <Esqueleto altura="24rem" />
            <ul className="grade-cursos">
              {[1, 2, 3].map((i) => (
                <li key={i}>
                  <Esqueleto proporcao="16 / 9" />
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <Catalogo searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
