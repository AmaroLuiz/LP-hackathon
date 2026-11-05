"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormulario } from "@/components/conta/useFormulario";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Exibicao";
import { Selecao } from "@/components/ui/Formulario";
import { Modal } from "@/components/ui/Modal";
import type { CategoriaAdmin, CursoEdicao } from "@/lib/admin";

/** Cria um rascunho só com título e categoria; o resto se completa no editor. */
export function NovoCurso({ categorias }: { categorias: CategoriaAdmin[] }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState(String(categorias[0]?.id ?? ""));
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const router = useRouter();

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter<CursoEdicao>("/api/admin/cursos", { titulo, categoriaId: categoria ? Number(categoria) : null });
    if (r.ok) router.push(`/admin/cursos/${r.dados.id}`);
  }

  return (
    <>
      <Botao onClick={() => setAberto(true)}>Novo curso</Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Novo curso" chao="papel">
        <form ref={formulario} className="formulario" onSubmit={criar} noValidate>
          {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
          <Campo
            id="novo-titulo"
            rotulo="Título"
            required
            maxLength={160}
            value={titulo}
            erro={erros.titulo}
            ajuda="O endereço e o número saem do título e podem ser mudados depois."
            onChange={(e) => {
              setTitulo(e.target.value);
              limparErro("titulo");
            }}
          />
          <Selecao id="novo-categoria" rotulo="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
          <div className="confirmacao__acoes">
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={enviando} textoCarregando="Criando…">
              Criar rascunho
            </Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}
