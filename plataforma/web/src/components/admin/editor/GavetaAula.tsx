"use client";

import { useState } from "react";
import { useFormulario } from "@/components/conta/useFormulario";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Exibicao";
import { Alternador, AreaTexto, Selecao } from "@/components/ui/Formulario";
import { Gaveta } from "@/components/ui/Gaveta";
import { lerDuracao, TIPOS_AULA, tamanhoArquivo, type AulaAdmin, type CursoEdicao, type TipoAula } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import { duracaoDoVideo } from "@/lib/envio";
import { relogio } from "@/lib/formato";
import { EditorMarkdown } from "./EditorMarkdown";
import { EnvioArquivo } from "./EnvioArquivo";

/** O que abre a gaveta: uma aula existente, ou "nova aula" num módulo. */
export type AlvoAula = { aula: AulaAdmin } | { moduloId: number; moduloTitulo: string };

type Campos = {
  titulo: string;
  tipo: TipoAula;
  resumo: string;
  conteudo: string;
  videoId: string;
  duracao: string;
  previa: boolean;
  publicada: boolean;
  legendaUrl: string;
};

function camposDe(aula?: AulaAdmin): Campos {
  return {
    titulo: aula?.titulo ?? "",
    tipo: aula?.tipo ?? "VIDEO",
    resumo: aula?.resumo ?? "",
    conteudo: aula?.conteudo ?? "",
    videoId: aula?.videoId ?? "",
    duracao: aula?.duracaoSegundos ? relogio(aula.duracaoSegundos) : "",
    previa: aula?.previa ?? false,
    publicada: aula?.publicada ?? true,
    legendaUrl: aula?.legendaUrl ?? "",
  };
}

export function GavetaAula({
  alvo,
  aoFechar,
  aoSalvar,
}: {
  alvo: AlvoAula | null;
  aoFechar: () => void;
  /** Recebe o curso atualizado; para aula nova, também o id criado. */
  aoSalvar: (curso: CursoEdicao, aulaId: number) => void;
}) {
  const aula = alvo && "aula" in alvo ? alvo.aula : undefined;
  return (
    <Gaveta aberta={alvo !== null} aoFechar={aoFechar} titulo={aula ? "Editar aula" : `Nova aula em "${alvo && "moduloTitulo" in alvo ? alvo.moduloTitulo : ""}"`}>
      {alvo && <FormAula key={aula ? aula.id : `nova-${(alvo as { moduloId: number }).moduloId}`} alvo={alvo} aoFechar={aoFechar} aoSalvar={aoSalvar} />}
    </Gaveta>
  );
}

function FormAula({ alvo, aoFechar, aoSalvar }: { alvo: AlvoAula; aoFechar: () => void; aoSalvar: (curso: CursoEdicao, aulaId: number) => void }) {
  const aula = "aula" in alvo ? alvo.aula : undefined;
  const [c, setC] = useState<Campos>(() => camposDe(aula));
  const [materiais, setMateriais] = useState(aula?.materiais ?? []);
  const [erroDuracao, setErroDuracao] = useState<string | null>(null);
  const { enviando, erros, mensagem, formulario, submeter, limparErro } = useFormulario();
  const { avisar } = useAvisos();

  const muda = <K extends keyof Campos>(campo: K, valor: Campos[K]) => {
    setC((atual) => ({ ...atual, [campo]: valor }));
    limparErro(campo);
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const duracao = lerDuracao(c.duracao);
    if (Number.isNaN(duracao)) {
      setErroDuracao("Use minutos e segundos, como 12:05.");
      return;
    }
    setErroDuracao(null);
    const corpo = {
      titulo: c.titulo,
      tipo: c.tipo,
      resumo: c.resumo,
      conteudo: c.tipo === "TEXTO" || c.tipo === "EXERCICIO" ? c.conteudo : null,
      videoId: c.tipo === "VIDEO" ? c.videoId : null,
      duracaoSegundos: duracao,
      previa: c.previa,
      publicada: c.publicada,
      legendaUrl: c.tipo === "VIDEO" ? c.legendaUrl : null,
    };
    const r = aula
      ? await submeter<CursoEdicao>(`/api/admin/aulas/${aula.id}`, corpo, "PUT")
      : await submeter<CursoEdicao>(`/api/admin/modulos/${(alvo as { moduloId: number }).moduloId}/aulas`, corpo, "POST");
    if (!r.ok) return;
    const id = aula?.id ?? novaAula(r.dados, (alvo as { moduloId: number }).moduloId);
    aoSalvar(r.dados, id);
    avisar(aula ? "Aula salva." : "Aula criada. Agora dá para anexar materiais.");
    if (aula) aoFechar();
  }

  async function anexar(chave: string, nome: string, tamanhoBytes: number, tipoMime: string) {
    if (!aula) return;
    const r = await enviar<CursoEdicao>(`/api/admin/aulas/${aula.id}/materiais`, { nome: nome.replace(/\.[^.]+$/, ""), chave, tamanhoBytes, tipoMime });
    if (!r.ok) {
      avisar(r.mensagem, "erro");
      return;
    }
    const atualizada = r.dados.modulos.flatMap((m) => m.aulas).find((a) => a.id === aula.id);
    setMateriais(atualizada?.materiais ?? []);
    aoSalvar(r.dados, aula.id);
    avisar("Material anexado.");
  }

  async function removerMaterial(id: number) {
    const r = await enviar<CursoEdicao>(`/api/admin/materiais/${id}`, null, "DELETE");
    if (!r.ok) {
      avisar(r.mensagem, "erro");
      return;
    }
    setMateriais((atual) => atual.filter((m) => m.id !== id));
    if (aula) aoSalvar(r.dados, aula.id);
    avisar("Material removido.");
  }

  return (
    <form ref={formulario} className="formulario" onSubmit={salvar} noValidate>
      {mensagem && <Aviso tipo="erro" titulo={mensagem} />}
      <Campo id="aula-titulo" rotulo="Título" required maxLength={160} value={c.titulo} erro={erros.titulo} onChange={(e) => muda("titulo", e.target.value)} />
      <Selecao id="aula-tipo" rotulo="Tipo" value={c.tipo} onChange={(e) => muda("tipo", e.target.value as TipoAula)}>
        {(Object.keys(TIPOS_AULA) as TipoAula[]).map((t) => (
          <option key={t} value={t}>
            {TIPOS_AULA[t]}
          </option>
        ))}
      </Selecao>
      <AreaTexto
        id="aula-resumo"
        rotulo="Resumo"
        rows={3}
        maxLength={600}
        value={c.resumo}
        erro={erros.resumo}
        ajuda="Aparece na aba Visão geral do player."
        onChange={(e) => muda("resumo", e.target.value)}
      />

      {c.tipo === "VIDEO" && (
        <fieldset className="grupo-campos">
          <legend className="grupo-campos__titulo">Vídeo</legend>
          {c.videoId ? (
            <p className="grupo-campos__estado">
              <span className="selo selo--salvia">Vídeo ligado</span> <code className="codigo">{c.videoId.startsWith("local:") ? "enviado pelo painel" : c.videoId}</code>
            </p>
          ) : (
            <p className="campo__ajuda">Sem vídeo, a aula aparece como &quot;vídeo em preparação&quot; para o aluno.</p>
          )}
          <EnvioArquivo
            tipo="VIDEO"
            accept="video/mp4,video/quicktime,video/webm"
            rotulo={c.videoId ? "Trocar vídeo" : "Enviar vídeo"}
            ajuda="MP4, MOV ou WebM. A duração é lida sozinha."
            aoEscolher={async (arquivo) => {
              const segundos = await duracaoDoVideo(arquivo);
              if (segundos) muda("duracao", relogio(segundos));
            }}
            aoEnviar={(arquivo) => muda("videoId", arquivo.referencia)}
          />
          <Campo
            id="aula-video-id"
            rotulo="Ou cole o id do vídeo no provedor"
            value={c.videoId}
            erro={erros.videoId}
            maxLength={120}
            onChange={(e) => muda("videoId", e.target.value.trim())}
          />
          <div className="grupo-campos__legenda">
            <p className="campo__rotulo">Legenda</p>
            {c.legendaUrl ? (
              <p className="grupo-campos__estado">
                <span className="selo selo--salvia">Legenda enviada</span>{" "}
                <button type="button" className="link link--sublinhado" onClick={() => muda("legendaUrl", "")}>
                  Remover
                </button>
              </p>
            ) : null}
            <EnvioArquivo
              tipo="LEGENDA"
              accept=".vtt,text/vtt"
              rotulo={c.legendaUrl ? "Trocar legenda" : "Enviar legenda (.vtt)"}
              ajuda="Arquivo WebVTT. O aluno liga e desliga no player (tecla C)."
              aoEnviar={(arquivo) => muda("legendaUrl", arquivo.url ?? "")}
            />
          </div>
        </fieldset>
      )}

      {(c.tipo === "TEXTO" || c.tipo === "EXERCICIO") && (
        <EditorMarkdown id="aula-conteudo" rotulo="Conteúdo da aula" valor={c.conteudo} aoMudar={(v) => muda("conteudo", v)} maximo={20000} linhas={12} erro={erros.conteudo} />
      )}

      <Campo
        id="aula-duracao"
        rotulo="Duração (min:seg)"
        inputMode="numeric"
        placeholder="12:05"
        value={c.duracao}
        erro={erroDuracao ?? erros.duracaoSegundos}
        ajuda="Soma na duração do curso e na carga horária do certificado."
        onChange={(e) => {
          muda("duracao", e.target.value);
          setErroDuracao(null);
        }}
      />
      <Alternador id="aula-previa" rotulo="Prévia grátis" ligado={c.previa} aoMudar={(v) => muda("previa", v)} ajuda="Qualquer visitante assiste, na página do curso." />
      <Alternador
        id="aula-publicada"
        rotulo="Publicada"
        ligado={c.publicada}
        aoMudar={(v) => muda("publicada", v)}
        ajuda="Desligada, a aula some para os alunos (mas o progresso deles fica guardado)."
      />

      <fieldset className="grupo-campos">
        <legend className="grupo-campos__titulo">Materiais para baixar</legend>
        {aula ? (
          <>
            {materiais.length > 0 ? (
              <ul className="materiais-admin">
                {materiais.map((m) => (
                  <li key={m.id}>
                    <span>
                      {m.nome} <span className="campo__ajuda">{tamanhoArquivo(m.tamanhoBytes)}</span>
                    </span>
                    <button type="button" className="link link--sublinhado link--perigo" onClick={() => removerMaterial(m.id)}>
                      Remover<span className="sr-only"> {m.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="campo__ajuda">Nenhum material nesta aula.</p>
            )}
            <EnvioArquivo
              tipo="MATERIAL"
              accept=".pdf,.zip,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp"
              rotulo="Anexar material"
              ajuda="PDF, ZIP, Word, Excel, PowerPoint ou imagem, até 50 MB. Só quem tem acesso baixa."
              aoEnviar={(arquivo) => anexar(arquivo.chave, arquivo.nome, arquivo.tamanhoBytes, arquivo.tipoMime)}
            />
          </>
        ) : (
          <p className="campo__ajuda">Crie a aula primeiro; depois dá para anexar materiais aqui mesmo.</p>
        )}
      </fieldset>

      <div className="gaveta__acoes">
        <Botao variante="secundario" onClick={aoFechar}>
          {aula ? "Cancelar" : "Fechar"}
        </Botao>
        <Botao type="submit" carregando={enviando} textoCarregando="Salvando…">
          {aula ? "Salvar aula" : "Criar aula"}
        </Botao>
      </div>
    </form>
  );
}

/** A aula que acabou de ser criada: a de maior ordem no módulo. */
function novaAula(curso: CursoEdicao, moduloId: number): number {
  const modulo = curso.modulos.find((m) => m.id === moduloId);
  return modulo?.aulas.reduce((maior, a) => (a.ordem > maior.ordem ? a : maior), modulo.aulas[0])?.id ?? 0;
}
