"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CardCurso } from "@/components/cursos/CardCurso";
import { Abas } from "@/components/ui/Abas";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Aviso, Selo } from "@/components/ui/Exibicao";
import { Alternador, AreaTexto, Selecao } from "@/components/ui/Formulario";
import { Icone } from "@/components/ui/Icone";
import type { CursoCard, Nivel } from "@/lib/api";
import { slugDe, STATUS_CURSO, type CategoriaAdmin, type CursoEdicao, type InstrutorAdmin, type PlanoDoCurso } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import { duracao, NIVEIS, preco } from "@/lib/formato";
import { EditorCurriculo } from "./EditorCurriculo";
import { EditorLista } from "./EditorLista";
import { EditorMarkdown } from "./EditorMarkdown";
import { EnvioImagem } from "./EnvioImagem";
import { PainelPublicar } from "./PainelPublicar";

/** O que as abas Página, Capa e Acesso editam (vai inteiro no PUT /api/admin/cursos/{id}). */
type Campos = {
  titulo: string;
  subtitulo: string;
  slug: string;
  numero: string;
  categoriaId: string;
  nivel: Nivel;
  idioma: string;
  descricao: string;
  capaUrl: string;
  capaAlt: string;
  ferramentas: string[];
  oQueAprende: string[];
  requisitos: string[];
  paraQuemE: string[];
  resultadoFinal: string;
  destaque: boolean;
  certificadoHabilitado: boolean;
  cargaHorariaMinutos: string;
  seoTitulo: string;
  seoDescricao: string;
  instrutores: number[];
};

function camposDe(c: CursoEdicao): Campos {
  return {
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    slug: c.slug,
    numero: String(c.numero),
    categoriaId: String(c.categoriaId),
    nivel: c.nivel,
    idioma: c.idioma,
    descricao: c.descricao ?? "",
    capaUrl: c.capaUrl ?? "",
    capaAlt: c.capaAlt ?? "",
    ferramentas: c.ferramentas,
    oQueAprende: c.oQueAprende,
    requisitos: c.requisitos,
    paraQuemE: c.paraQuemE,
    resultadoFinal: c.resultadoFinal,
    destaque: c.destaque,
    certificadoHabilitado: c.certificadoHabilitado,
    cargaHorariaMinutos: c.cargaHorariaMinutos ? String(c.cargaHorariaMinutos) : "",
    seoTitulo: c.seoTitulo ?? "",
    seoDescricao: c.seoDescricao ?? "",
    instrutores: c.instrutores,
  };
}

function corpo(c: Campos) {
  return {
    ...c,
    numero: c.numero.trim() === "" ? null : Number(c.numero),
    categoriaId: Number(c.categoriaId),
    cargaHorariaMinutos: c.cargaHorariaMinutos.trim() === "" ? null : Number(c.cargaHorariaMinutos),
  };
}

/** Primeiro erro de uma lista ("oQueAprende[2]" → mensagem). */
function erroDaLista(erros: Record<string, string>, campo: string) {
  const chave = Object.keys(erros).find((k) => k === campo || k.startsWith(`${campo}[`));
  return chave ? erros[chave] : undefined;
}

const horario = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

type Props = {
  inicial: CursoEdicao;
  categorias: CategoriaAdmin[];
  instrutores: InstrutorAdmin[];
  planosIniciais: PlanoDoCurso[];
};

/**
 * Editor do curso em abas. Rascunho salva sozinho (1,5 s depois da última
 * mudança); curso publicado só muda quando você clica em "Salvar alterações",
 * para nada ir ao ar pela metade.
 */
export function EditorCurso({ inicial, categorias, instrutores, planosIniciais }: Props) {
  const [curso, setCurso] = useState(inicial);
  const [campos, setCampos] = useState(() => camposDe(inicial));
  const [salvos, setSalvos] = useState(() => JSON.stringify(camposDe(inicial)));
  const [estado, setEstado] = useState<"ocioso" | "salvando" | "erro">("ocioso");
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [aba, setAba] = useState("pagina");
  const [planos, setPlanos] = useState(planosIniciais);
  const { avisar } = useAvisos();

  const atual = JSON.stringify(campos);
  const sujo = atual !== salvos;
  const automatico = curso.status === "RASCUNHO";

  const salvar = useCallback(async () => {
    const enviado = JSON.stringify(campos);
    setEstado("salvando");
    const r = await enviar<CursoEdicao>(`/api/admin/cursos/${curso.id}`, corpo(campos), "PUT");
    if (!r.ok) {
      setEstado("erro");
      setErros(r.campos);
      setMensagem(Object.keys(r.campos).length > 0 ? "Revise os campos marcados." : r.mensagem);
      return false;
    }
    setSalvos(enviado);
    setCurso(r.dados);
    setSalvoEm(new Date());
    setErros({});
    setMensagem(null);
    setEstado("ocioso");
    setVersao((v) => v + 1);
    return true;
  }, [campos, curso.id]);

  // Rascunho: salva sozinho um pouco depois da última mudança.
  useEffect(() => {
    if (!automatico || !sujo || estado === "salvando") return;
    const espera = window.setTimeout(() => void salvar(), 1500);
    return () => window.clearTimeout(espera);
  }, [automatico, sujo, estado, salvar]);

  // Sair com alteração não salva: o navegador pergunta antes.
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  function muda<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    if (erros[campo]) setErros((atuais) => Object.fromEntries(Object.entries(atuais).filter(([chave]) => chave !== campo)));
  }

  async function alternarPlano(id: string, incluir: boolean) {
    const novos = planos.filter((p) => (p.id === id ? incluir : p.incluido)).map((p) => p.id);
    const r = await enviar<PlanoDoCurso[]>(`/api/admin/cursos/${curso.id}/planos`, { planos: novos }, "PUT");
    if (!r.ok) return avisar(r.mensagem, "erro");
    setPlanos(r.dados);
    setVersao((v) => v + 1);
    avisar(incluir ? "Curso incluído no plano." : "Curso tirado do plano.");
  }

  const categoria = categorias.find((c) => String(c.id) === campos.categoriaId);
  const temPrevia = curso.modulos.some((m) => m.aulas.some((a) => a.previa && a.publicada));
  const card: CursoCard = {
    id: curso.id,
    slug: campos.slug,
    numero: Number(campos.numero) || 0,
    titulo: campos.titulo || "Sem título",
    subtitulo: campos.subtitulo,
    capaUrl: campos.capaUrl || null,
    capaAlt: campos.capaAlt || null,
    nivel: campos.nivel,
    categoria: { slug: categoria?.slug ?? "", nome: categoria?.nome ?? "" },
    instrutores: campos.instrutores.map((id) => instrutores.find((i) => i.id === id)?.nome ?? "").filter(Boolean),
    notaMedia: 0,
    totalAvaliacoes: 0,
    totalAlunos: curso.totalAlunos,
    totalAulas: curso.totalAulasPublicadas,
    duracaoTotalSegundos: curso.duracaoPublicadaSegundos,
    ferramentas: campos.ferramentas,
    temPrevia,
    destaque: campos.destaque,
    publicadoEm: curso.publicadoEm,
  };
  const minutosDasAulas = Math.max(1, Math.ceil(curso.duracaoPublicadaSegundos / 60));

  const situacao =
    estado === "salvando" ? "Salvando…"
    : estado === "erro" ? "Não foi possível salvar"
    : sujo ? (automatico ? "Alterações a salvar…" : "Alterações não salvas")
    : salvoEm ? `Salvo às ${horario.format(salvoEm)}`
    : automatico ? "Rascunho: salva sozinho"
    : "Tudo salvo";

  const abaPagina = (
    <div className="editor-grade">
      <section className="painel-bloco" aria-labelledby="ed-essencial">
        <h2 id="ed-essencial" className="painel-bloco__titulo">
          O essencial
        </h2>
        <Campo id="ed-titulo" rotulo="Título" required maxLength={160} value={campos.titulo} erro={erros.titulo} onChange={(e) => muda("titulo", e.target.value)} />
        <AreaTexto
          id="ed-subtitulo"
          rotulo="Subtítulo"
          rows={2}
          maxLength={300}
          value={campos.subtitulo}
          erro={erros.subtitulo}
          ajuda="Uma ou duas frases: o que a pessoa vai conseguir fazer."
          onChange={(e) => muda("subtitulo", e.target.value)}
        />
        <div className="editor-linha">
          <Campo
            id="ed-slug"
            rotulo="Endereço"
            required
            maxLength={120}
            value={campos.slug}
            erro={erros.slug}
            ajuda={
              <>
                /cursos/<strong>{campos.slug || "…"}</strong>
                {curso.status === "PUBLICADO" && campos.slug !== curso.slug && " · Mudar o endereço quebra links já compartilhados."}
              </>
            }
            onChange={(e) => muda("slug", e.target.value.toLowerCase())}
          />
          <button type="button" className="link link--sublinhado editor-linha__acao" onClick={() => muda("slug", slugDe(campos.titulo))}>
            Gerar pelo título
          </button>
        </div>
        <div className="editor-colunas">
          <Campo
            id="ed-numero"
            rotulo="Número (expoente)"
            inputMode="numeric"
            required
            value={campos.numero}
            erro={erros.numero}
            onChange={(e) => muda("numero", e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
          <Selecao id="ed-categoria" rotulo="Categoria" value={campos.categoriaId} erro={erros.categoriaId} onChange={(e) => muda("categoriaId", e.target.value)}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
          <Selecao id="ed-nivel" rotulo="Nível" value={campos.nivel} onChange={(e) => muda("nivel", e.target.value as Nivel)}>
            {(Object.keys(NIVEIS) as Nivel[]).map((n) => (
              <option key={n} value={n}>
                {NIVEIS[n]}
              </option>
            ))}
          </Selecao>
          <Selecao id="ed-idioma" rotulo="Idioma" value={campos.idioma} onChange={(e) => muda("idioma", e.target.value)}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="es">Espanhol</option>
            <option value="en">Inglês</option>
          </Selecao>
        </div>
        <EditorLista
          id="ed-ferramentas"
          rotulo="Ferramentas usadas"
          marcador="Ferramenta"
          itens={campos.ferramentas}
          erro={erroDaLista(erros, "ferramentas")}
          aoMudar={(v) => muda("ferramentas", v)}
        />
        <fieldset className="grupo-campos">
          <legend className="campo__rotulo">Instrutores</legend>
          {instrutores.length === 0 ? (
            <p className="campo__ajuda">
              Nenhum instrutor cadastrado.{" "}
              <Link href="/admin/instrutores" className="link link--sublinhado">
                Cadastrar
              </Link>
            </p>
          ) : (
            <div className="opcoes-lista">
              {instrutores.map((i) => (
                <label key={i.id} className="filtros__opcao">
                  <input
                    type="checkbox"
                    checked={campos.instrutores.includes(i.id)}
                    onChange={(e) =>
                      muda("instrutores", e.target.checked ? [...campos.instrutores, i.id] : campos.instrutores.filter((x) => x !== i.id))
                    }
                  />
                  {i.nome}
                  {i.titulo && <span className="campo__ajuda"> · {i.titulo}</span>}
                </label>
              ))}
            </div>
          )}
          {erros.instrutores && <p className="campo__erro">{erros.instrutores}</p>}
        </fieldset>
      </section>

      <section className="painel-bloco" aria-labelledby="ed-conteudo">
        <h2 id="ed-conteudo" className="painel-bloco__titulo">
          O que o aluno lê na página
        </h2>
        <EditorMarkdown id="ed-descricao" rotulo="Descrição" valor={campos.descricao} aoMudar={(v) => muda("descricao", v)} maximo={8000} erro={erros.descricao} />
        <EditorLista
          id="ed-aprende"
          rotulo="O que você vai aprender"
          ajuda="De 4 a 8 resultados concretos. Comece com um verbo: “Montar”, “Gravar”, “Publicar”."
          marcador="Resultado"
          itens={campos.oQueAprende}
          erro={erroDaLista(erros, "oQueAprende")}
          aoMudar={(v) => muda("oQueAprende", v)}
        />
        <EditorLista id="ed-requisitos" rotulo="Requisitos" marcador="Requisito" itens={campos.requisitos} erro={erroDaLista(erros, "requisitos")} aoMudar={(v) => muda("requisitos", v)} />
        <EditorLista id="ed-publico" rotulo="Para quem é este curso" marcador="Perfil" itens={campos.paraQuemE} erro={erroDaLista(erros, "paraQuemE")} aoMudar={(v) => muda("paraQuemE", v)} />
        <AreaTexto
          id="ed-resultado"
          rotulo="Ao final, você terá"
          rows={2}
          maxLength={300}
          value={campos.resultadoFinal}
          erro={erros.resultadoFinal}
          ajuda="O resultado concreto, em destaque dourado na página. Ex.: “Um Reels editado a partir dos seus próprios takes.”"
          onChange={(e) => muda("resultadoFinal", e.target.value)}
        />
      </section>

      <section className="painel-bloco" aria-labelledby="ed-seo">
        <h2 id="ed-seo" className="painel-bloco__titulo">
          Busca do Google
        </h2>
        <Campo
          id="ed-seo-titulo"
          rotulo="Título para buscadores (opcional)"
          maxLength={160}
          value={campos.seoTitulo}
          ajuda={`Vazio: usa o título do curso. ${campos.seoTitulo.length}/60 recomendados.`}
          onChange={(e) => muda("seoTitulo", e.target.value)}
        />
        <AreaTexto
          id="ed-seo-descricao"
          rotulo="Descrição para buscadores (opcional)"
          rows={2}
          maxLength={300}
          value={campos.seoDescricao}
          ajuda={`Vazio: usa o subtítulo. ${campos.seoDescricao.length}/155 recomendados.`}
          onChange={(e) => muda("seoDescricao", e.target.value)}
        />
      </section>
    </div>
  );

  const abaCapa = (
    <div className="editor-grade editor-grade--capa">
      <section className="painel-bloco" aria-labelledby="ed-capa">
        <h2 id="ed-capa" className="painel-bloco__titulo">
          Capa
        </h2>
        <p className="painel-bloco__apoio">16:9, sem texto em cima da foto: o título fica no card. Sai em 1280 × 720 px; as versões menores são geradas sozinhas.</p>
        <EnvioImagem
          tipo="CAPA"
          proporcao={16 / 9}
          saida={{ largura: 1280, altura: 720 }}
          rotulo={campos.capaUrl ? "Trocar a capa" : "Escolher a capa"}
          aoEnviar={(url) => {
            muda("capaUrl", url);
            avisar(automatico ? "Capa enviada." : "Capa enviada. Clique em Salvar alterações para publicar a nova capa.");
          }}
        />
        <AreaTexto
          id="ed-capa-alt"
          rotulo="Texto alternativo"
          required
          rows={2}
          maxLength={300}
          value={campos.capaAlt}
          erro={erros.capaAlt}
          ajuda="Descreva a foto para quem não vê: “Bolos de chocolate na vitrine de uma padaria”."
          onChange={(e) => muda("capaAlt", e.target.value)}
        />
      </section>
      <section className="painel-bloco" aria-labelledby="ed-previa-card">
        <h2 id="ed-previa-card" className="painel-bloco__titulo">
          Como o card aparece no catálogo
        </h2>
        <div className="previa-card" data-chao="preto" inert>
          <CardCurso curso={card} />
        </div>
        <h3 className="painel-bloco__subtitulo">Vídeo de prévia</h3>
        <p className="painel-bloco__apoio">
          A página do curso toca as aulas marcadas como <strong>Prévia grátis</strong> no currículo.{" "}
          {temPrevia ? "Este curso já tem prévia." : "Este curso ainda não tem nenhuma."}{" "}
          <button type="button" className="link link--sublinhado" onClick={() => setAba("curriculo")}>
            Ir para o currículo
          </button>
        </p>
      </section>
    </div>
  );

  const abaAcesso = (
    <div className="editor-grade">
      <section className="painel-bloco" aria-labelledby="ed-planos">
        <h2 id="ed-planos" className="painel-bloco__titulo">
          Planos que liberam o curso
        </h2>
        <p className="painel-bloco__apoio">Muda na hora: o card passa a mostrar o plano mais barato que inclui o curso.</p>
        <div className="planos-curso">
          {planos.map((p) => (
            <Alternador key={p.id} id={`plano-${p.id}`} rotulo={`${p.nome} · ${preco(p.precoCentavos)}/mês`} ligado={p.incluido} aoMudar={(v) => alternarPlano(p.id, v)} />
          ))}
        </div>
      </section>
      <section className="painel-bloco" aria-labelledby="ed-certificado">
        <h2 id="ed-certificado" className="painel-bloco__titulo">
          Certificado e destaque
        </h2>
        <Alternador
          id="ed-certificado-sim"
          rotulo="Emitir certificado ao concluir"
          ligado={campos.certificadoHabilitado}
          aoMudar={(v) => muda("certificadoHabilitado", v)}
        />
        <Campo
          id="ed-carga"
          rotulo="Carga horária do certificado, em minutos (opcional)"
          inputMode="numeric"
          value={campos.cargaHorariaMinutos}
          erro={erros.cargaHorariaMinutos}
          ajuda={`Vazio: soma das aulas publicadas (${duracao(minutosDasAulas * 60)}).`}
          onChange={(e) => muda("cargaHorariaMinutos", e.target.value.replace(/\D/g, "").slice(0, 5))}
        />
        <Alternador
          id="ed-destaque"
          rotulo="Em destaque na home"
          ligado={campos.destaque}
          disabled={curso.status === "ARQUIVADO"}
          aoMudar={(v) => muda("destaque", v)}
          ajuda="Aparece no mosaico do topo da página inicial."
        />
      </section>
    </div>
  );

  return (
    <div className="editor">
      <header className="editor__topo">
        <div>
          <p className="olho">
            <Link href="/admin/cursos" className="link">
              Cursos
            </Link>{" "}
            / Editar
          </p>
          <h1 className="painel-topo__titulo editor__titulo">
            {campos.titulo || "Sem título"}
            <span className="expoente-titulo" aria-hidden="true">
              {campos.numero || "?"}
            </span>
          </h1>
          <p className="editor__meta">
            <Selo tom={STATUS_CURSO[curso.status].tom}>{STATUS_CURSO[curso.status].texto}</Selo>
            <span className={`editor__situacao${estado === "erro" ? " is-erro" : sujo ? " is-pendente" : ""}`} role="status">
              {situacao}
            </span>
          </p>
        </div>
        <div className="editor__acoes">
          <Link href={`/admin/cursos/${curso.id}/previa`} className="botao botao--secundario botao--pequeno">
            <Icone nome="olho" tamanho={16} /> Pré-visualizar como aluno
          </Link>
          {(!automatico || estado === "erro") && (
            <Botao pequeno disabled={!sujo && estado !== "erro"} carregando={estado === "salvando"} textoCarregando="Salvando…" onClick={async () => (await salvar()) && avisar("Alterações salvas e no ar.")}>
              Salvar alterações
            </Botao>
          )}
        </div>
      </header>

      {mensagem && (
        <Aviso tipo="erro" titulo={mensagem}>
          {Object.keys(erros).length > 0 && "Os campos com problema estão destacados nas abas Página, Capa e Acesso."}
        </Aviso>
      )}

      <Abas
        rotulo="Partes do curso"
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { id: "pagina", rotulo: "Página do curso", conteudo: abaPagina },
          { id: "capa", rotulo: "Capa e prévia", conteudo: abaCapa },
          { id: "curriculo", rotulo: "Currículo", conteudo: <EditorCurriculo curso={curso} aoMudar={(c) => (setCurso(c), setVersao((v) => v + 1))} /> },
          { id: "acesso", rotulo: "Acesso", conteudo: abaAcesso },
          {
            id: "publicar",
            rotulo: "Publicar",
            conteudo: <PainelPublicar curso={curso} versao={versao} pendente={sujo} aoMudar={(c) => (setCurso(c), setVersao((v) => v + 1))} irPara={setAba} />,
          },
        ]}
      />
    </div>
  );
}
