"use client";

import Image from "next/image";
import { useState } from "react";
import { useFormulario } from "@/components/conta/useFormulario";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso, EstadoVazio } from "@/components/ui/Exibicao";
import { AreaTexto } from "@/components/ui/Formulario";
import { Gaveta } from "@/components/ui/Gaveta";
import type { InstrutorAdmin } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import { plural } from "@/lib/formato";
import { EnvioImagem } from "./editor/EnvioImagem";

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Perfis públicos de quem ensina (não são contas): nome, título, bio e foto quadrada. */
export function GerenciarInstrutores({ iniciais: lista0 }: { iniciais: InstrutorAdmin[] }) {
  const [lista, setLista] = useState(lista0);
  const [alvo, setAlvo] = useState<InstrutorAdmin | "novo" | null>(null);
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();

  async function excluir(i: InstrutorAdmin) {
    if (!(await confirmar({ titulo: `Excluir ${i.nome}?`, texto: "O perfil some do painel. Isso não pode ser desfeito.", confirmar: "Excluir", perigo: true }))) return;
    const r = await enviar<InstrutorAdmin[]>(`/api/admin/instrutores/${i.id}`, null, "DELETE");
    if (!r.ok) return avisar(r.mensagem, "erro");
    setLista(r.dados);
    avisar("Instrutor excluído.");
  }

  return (
    <>
      {dialogo}
      <div className="painel-barra">
        <p className="painel-contagem">{plural(lista.length, "instrutor", "instrutores")}</p>
        <Botao onClick={() => setAlvo("novo")}>Novo instrutor</Botao>
      </div>
      {lista.length === 0 ? (
        <EstadoVazio titulo="Nenhum instrutor cadastrado." acao={<Botao onClick={() => setAlvo("novo")}>Cadastrar o primeiro</Botao>} />
      ) : (
        <ul className="instrutores-admin">
          {lista.map((i) => (
            <li key={i.id} className="instrutor-admin">
              <span className="instrutor-admin__foto">
                {i.fotoUrl ? <Image src={i.fotoUrl} alt="" fill sizes="4.5rem" /> : <span aria-hidden="true">{iniciais(i.nome)}</span>}
              </span>
              <div className="instrutor-admin__texto">
                <strong>{i.nome}</strong>
                {i.titulo && <span className="lista-admin__meta">{i.titulo}</span>}
                <span className="lista-admin__meta">{plural(i.totalCursos, "curso", "cursos")}</span>
              </div>
              <div className="linha-acoes">
                <Botao pequeno variante="secundario" onClick={() => setAlvo(i)}>
                  Editar<span className="sr-only"> {i.nome}</span>
                </Botao>
                <Botao pequeno variante="fantasma" disabled={i.totalCursos > 0} onClick={() => excluir(i)}>
                  Excluir<span className="sr-only"> {i.nome}{i.totalCursos > 0 && " (indisponível: aparece em cursos)"}</span>
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Gaveta aberta={alvo !== null} aoFechar={() => setAlvo(null)} titulo={alvo === "novo" ? "Novo instrutor" : "Editar instrutor"}>
        {alvo && (
          <FormInstrutor
            key={alvo === "novo" ? "novo" : alvo.id}
            instrutor={alvo === "novo" ? null : alvo}
            aoSalvar={(nova) => {
              setLista(nova);
              avisar(alvo === "novo" ? "Instrutor cadastrado." : "Instrutor salvo.");
              setAlvo(null);
            }}
            aoCancelar={() => setAlvo(null)}
          />
        )}
      </Gaveta>
    </>
  );
}

function FormInstrutor({
  instrutor,
  aoSalvar,
  aoCancelar,
}: {
  instrutor: InstrutorAdmin | null;
  aoSalvar: (lista: InstrutorAdmin[]) => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(instrutor?.nome ?? "");
  const [titulo, setTitulo] = useState(instrutor?.titulo ?? "");
  const [bio, setBio] = useState(instrutor?.bio ?? "");
  const [fotoUrl, setFotoUrl] = useState(instrutor?.fotoUrl ?? "");
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const corpo = { nome, titulo, bio, fotoUrl };
    const r = instrutor
      ? await submeter<InstrutorAdmin[]>(`/api/admin/instrutores/${instrutor.id}`, corpo, "PUT")
      : await submeter<InstrutorAdmin[]>("/api/admin/instrutores", corpo);
    if (r.ok) aoSalvar(r.dados);
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={salvar} noValidate>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <div className="foto-instrutor">
        <span className="instrutor-admin__foto instrutor-admin__foto--grande">
          {fotoUrl ? <Image src={fotoUrl} alt="" fill sizes="7rem" /> : <span aria-hidden="true">{iniciais(nome || "?")}</span>}
        </span>
        <div>
          <EnvioImagem tipo="FOTO" proporcao={1} saida={{ largura: 480, altura: 480 }} rotulo={fotoUrl ? "Trocar a foto" : "Enviar foto"} aoEnviar={setFotoUrl} />
          {fotoUrl && (
            <button type="button" className="link link--sublinhado" onClick={() => setFotoUrl("")}>
              Tirar a foto
            </button>
          )}
        </div>
      </div>
      <Campo
        id="inst-nome"
        rotulo="Nome"
        required
        maxLength={120}
        value={nome}
        erro={erros.nome}
        onChange={(e) => {
          setNome(e.target.value);
          limparErro("nome");
        }}
      />
      <Campo id="inst-titulo" rotulo="Título (opcional)" maxLength={160} value={titulo} erro={erros.titulo} ajuda="Ex.: “Editora de vídeo e dona de confeitaria”." onChange={(e) => setTitulo(e.target.value)} />
      <AreaTexto id="inst-bio" rotulo="Mini-bio (opcional)" rows={5} maxLength={1200} value={bio} erro={erros.bio} onChange={(e) => setBio(e.target.value)} />
      <div className="gaveta__acoes">
        <Botao variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando} textoCarregando="Salvando…">
          {instrutor ? "Salvar" : "Cadastrar"}
        </Botao>
      </div>
    </form>
  );
}
