"use client";

import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Icone } from "@/components/ui/Icone";
import { mover, slugDe, type CategoriaAdmin } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import { plural } from "@/lib/formato";

type Rascunho = { nome: string; slug: string; descricao: string };

/** Categorias (aparecem como "temas" no catálogo): criar, editar, ordenar e excluir. */
export function GerenciarCategorias({ iniciais }: { iniciais: CategoriaAdmin[] }) {
  const [lista, setLista] = useState(iniciais);
  const [editando, setEditando] = useState<number | "nova" | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>({ nome: "", slug: "", descricao: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();

  function abrir(c: CategoriaAdmin | null) {
    setEditando(c ? c.id : "nova");
    setRascunho({ nome: c?.nome ?? "", slug: c?.slug ?? "", descricao: c?.descricao ?? "" });
    setErros({});
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const r =
      editando === "nova"
        ? await enviar<CategoriaAdmin[]>("/api/admin/categorias", rascunho)
        : await enviar<CategoriaAdmin[]>(`/api/admin/categorias/${editando}`, rascunho, "PUT");
    setSalvando(false);
    if (!r.ok) {
      setErros(Object.keys(r.campos).length ? r.campos : { geral: r.mensagem });
      return;
    }
    setLista(r.dados);
    avisar(editando === "nova" ? "Categoria criada." : "Categoria salva.");
    setEditando(null);
  }

  async function ordenar(de: number, para: number) {
    const anterior = lista;
    const nova = mover(lista, de, para);
    setLista(nova);
    const r = await enviar<CategoriaAdmin[]>("/api/admin/categorias/ordem", { ids: nova.map((c) => c.id) }, "PUT");
    if (!r.ok) {
      setLista(anterior);
      avisar(r.mensagem, "erro");
      return;
    }
    setLista(r.dados);
  }

  async function excluir(c: CategoriaAdmin) {
    if (!(await confirmar({ titulo: `Excluir "${c.nome}"?`, texto: "A categoria sai dos filtros do catálogo.", confirmar: "Excluir", perigo: true }))) return;
    const r = await enviar<CategoriaAdmin[]>(`/api/admin/categorias/${c.id}`, null, "DELETE");
    if (!r.ok) return avisar(r.mensagem, "erro");
    setLista(r.dados);
    avisar("Categoria excluída.");
  }

  const formulario = (
    <form className="linha-form" onSubmit={salvar} noValidate>
      <Campo
        id="cat-nome"
        rotulo="Nome"
        required
        autoFocus
        maxLength={80}
        value={rascunho.nome}
        erro={erros.nome}
        onChange={(e) => {
          const nome = e.target.value;
          setRascunho((r) => ({ ...r, nome, slug: editando === "nova" && r.slug === slugDe(r.nome) ? slugDe(nome) : r.slug }));
        }}
      />
      <Campo
        id="cat-slug"
        rotulo="Endereço"
        required
        maxLength={80}
        value={rascunho.slug}
        erro={erros.slug}
        ajuda={`/cursos?categoria=${rascunho.slug || "…"}`}
        onChange={(e) => setRascunho((r) => ({ ...r, slug: e.target.value.toLowerCase() }))}
      />
      <Campo id="cat-descricao" rotulo="Descrição (opcional)" maxLength={300} value={rascunho.descricao} erro={erros.descricao} onChange={(e) => setRascunho((r) => ({ ...r, descricao: e.target.value }))} />
      {erros.geral && <p className="campo__erro">{erros.geral}</p>}
      <div className="acoes acoes--compactas">
        <Botao type="submit" pequeno carregando={salvando} textoCarregando="Salvando…">
          {editando === "nova" ? "Criar categoria" : "Salvar"}
        </Botao>
        <Botao pequeno variante="secundario" onClick={() => setEditando(null)}>
          Cancelar
        </Botao>
      </div>
    </form>
  );

  return (
    <>
      {dialogo}
      <div className="painel-barra">
        <p className="painel-contagem">{plural(lista.length, "categoria", "categorias")}. A ordem é a dos filtros e das faixas da home.</p>
        {editando !== "nova" && <Botao onClick={() => abrir(null)}>Nova categoria</Botao>}
      </div>
      {editando === "nova" && <div className="painel-bloco">{formulario}</div>}
      <ol className="lista-admin">
        {lista.map((c, i) => (
          <li key={c.id} className="lista-admin__item">
            {editando === c.id ? (
              formulario
            ) : (
              <>
                <span className="lista-admin__ordem tabela__numero">{i + 1}</span>
                <div className="lista-admin__texto">
                  <strong>{c.nome}</strong>
                  <span className="lista-admin__meta">
                    /{c.slug} · {plural(c.totalCursos, "curso", "cursos")}
                  </span>
                  {c.descricao && <span className="lista-admin__descricao">{c.descricao}</span>}
                </div>
                <span className="linha-acoes">
                  <button type="button" className="icone-botao" disabled={i === 0} onClick={() => ordenar(i, i - 1)}>
                    <Icone nome="cima" tamanho={16} />
                    <span className="sr-only">Subir {c.nome}</span>
                  </button>
                  <button type="button" className="icone-botao" disabled={i === lista.length - 1} onClick={() => ordenar(i, i + 1)}>
                    <Icone nome="baixo" tamanho={16} />
                    <span className="sr-only">Descer {c.nome}</span>
                  </button>
                  <button type="button" className="icone-botao" onClick={() => abrir(c)}>
                    <Icone nome="editar" tamanho={16} />
                    <span className="sr-only">Editar {c.nome}</span>
                  </button>
                  <button
                    type="button"
                    className="icone-botao icone-botao--perigo"
                    disabled={c.totalCursos > 0}
                    title={c.totalCursos > 0 ? "Há cursos nesta categoria" : undefined}
                    onClick={() => excluir(c)}
                  >
                    <Icone nome="lixeira" tamanho={16} />
                    <span className="sr-only">
                      Excluir {c.nome}
                      {c.totalCursos > 0 && " (indisponível: há cursos nesta categoria)"}
                    </span>
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
