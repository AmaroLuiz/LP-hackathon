"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Exibicao";
import type { Familiaridade, Objetivo } from "@/lib/catalogo";
import { useFormulario } from "./useFormulario";

// Mesmas opções do formulário da landing (dados.js → segmentos).
const SEGMENTOS = [
  "Alimentação (padaria, lanchonete, restaurante)",
  "Beleza e estética",
  "Moda e acessórios",
  "Saúde e bem-estar",
  "Serviços (oficina, conserto, limpeza)",
  "Comércio local",
  "Educação e cursos",
  "Outro",
];

const OBJETIVOS: [Objetivo, string, string][] = [
  ["POSTAR_MAIS", "Postar com constância", "Saber o que postar e ter conteúdo para o mês."],
  ["VIDEOS", "Fazer vídeos", "Reels animados ou editados a partir dos seus takes."],
  ["ARTES", "Criar artes e carrosséis", "Posts bonitos que se entendem rápido."],
  ["VENDER_MAIS", "Vender mais pelas redes", "Levar quem vê o post até a conversa no WhatsApp."],
];

const FAMILIARIDADES: [Familiaridade, string][] = [
  ["NUNCA_USEI", "Nunca usei inteligência artificial"],
  ["JA_USEI", "Já usei algumas vezes"],
  ["USO_SEMPRE", "Uso com frequência"],
];

type Props = {
  inicial: { segmentoNegocio: string | null; nomeNegocio: string | null; objetivo: Objetivo | null; familiaridade: Familiaridade | null };
};

/** Três perguntas, todas opcionais. Uma tela só: rápido de responder e de pular. */
export function FormOnboarding({ inicial }: Props) {
  const router = useRouter();
  const { enviando, mensagem, formulario, submeter } = useFormulario();
  const [segmento, setSegmento] = useState(inicial.segmentoNegocio ?? "");
  const [nomeNegocio, setNomeNegocio] = useState(inicial.nomeNegocio ?? "");
  const [objetivo, setObjetivo] = useState<Objetivo | "">(inicial.objetivo ?? "");
  const [familiaridade, setFamiliaridade] = useState<Familiaridade | "">(inicial.familiaridade ?? "");

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const r = await submeter("/api/me/perfil", {
      segmentoNegocio: segmento,
      nomeNegocio,
      objetivo: objetivo || null,
      familiaridade: familiaridade || null,
    }, "PATCH");
    if (r.ok) {
      router.push("/#para-voce");
      router.refresh();
    }
  }

  return (
    <form ref={formulario} className="formulario onboarding" onSubmit={aoEnviar} noValidate>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}

      <fieldset className="onboarding__pergunta">
        <legend>
          <span className="onboarding__numero" aria-hidden="true">
            1
          </span>
          Qual é o seu negócio?
        </legend>
        <label htmlFor="segmento" className="campo__rotulo">
          Segmento
        </label>
        <select id="segmento" className="seletor seletor--largo" value={segmento} onChange={(e) => setSegmento(e.target.value)}>
          <option value="">Escolha uma opção</option>
          {SEGMENTOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Campo
          id="nome-negocio"
          rotulo="Nome do negócio (opcional)"
          autoComplete="organization"
          value={nomeNegocio}
          onChange={(e) => setNomeNegocio(e.target.value)}
        />
      </fieldset>

      <fieldset className="onboarding__pergunta">
        <legend>
          <span className="onboarding__numero" aria-hidden="true">
            2
          </span>
          O que você mais quer agora?
        </legend>
        <div className="opcoes-cartao">
          {OBJETIVOS.map(([valor, titulo, texto]) => (
            <label key={valor} className="opcao-cartao">
              <input type="radio" name="objetivo" value={valor} checked={objetivo === valor} onChange={() => setObjetivo(valor)} />
              <span className="opcao-cartao__titulo">{titulo}</span>
              <span className="opcao-cartao__texto">{texto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="onboarding__pergunta">
        <legend>
          <span className="onboarding__numero" aria-hidden="true">
            3
          </span>
          Você já usa inteligência artificial?
        </legend>
        <div className="opcoes-lista">
          {FAMILIARIDADES.map(([valor, rotulo]) => (
            <label key={valor} className="filtros__opcao">
              <input
                type="radio"
                name="familiaridade"
                value={valor}
                checked={familiaridade === valor}
                onChange={() => setFamiliaridade(valor)}
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="acoes">
        <Botao type="submit" carregando={enviando} textoCarregando="Salvando…">
          Ver meus cursos recomendados
        </Botao>
        <Link href="/" className="link link--sublinhado">
          Pular por agora
        </Link>
      </div>
    </form>
  );
}
