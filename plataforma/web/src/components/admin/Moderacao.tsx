"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Estrelas, Selo } from "@/components/ui/Exibicao";
import { AreaTexto } from "@/components/ui/Formulario";
import { enviar } from "@/lib/cliente";

const diaHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export type RespostaAdmin = { id: string; texto: string; autor: string; daEquipe: boolean; oculta: boolean; criadoEm: string };

export type PerguntaAdmin = {
  id: string;
  titulo: string;
  texto: string;
  autor: string;
  email: string | null;
  curso: string;
  aula: string;
  aulaId: number;
  oculta: boolean;
  respondidaPelaEquipe: boolean;
  criadoEm: string;
  respostas: RespostaAdmin[];
};

export type AvaliacaoAdmin = {
  id: string;
  autor: string;
  email: string | null;
  curso: string;
  nota: number;
  comentario: string | null;
  status: "PUBLICADA" | "OCULTA";
  respostaEquipe: string | null;
  criadoEm: string;
};

/** Uma pergunta na fila: responder como Equipe PotencIA, esconder ou republicar. */
export function CartaoPergunta({ pergunta: p }: { pergunta: PerguntaAdmin }) {
  const router = useRouter();
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await enviar(`/api/admin/perguntas/${p.id}/respostas`, { texto });
    setEnviando(false);
    if (!r.ok) return setErro(r.campos.texto ?? r.mensagem);
    setErro(undefined);
    setTexto("");
    avisar("Resposta publicada. O aluno recebe um e-mail.");
    router.refresh();
  }

  async function esconder(oculta: boolean) {
    if (
      oculta &&
      !(await confirmar({
        titulo: "Esconder pergunta",
        texto: "A pergunta e as respostas somem para os alunos. Dá para republicar depois.",
        confirmar: "Esconder",
        perigo: true,
      }))
    )
      return;
    const r = await enviar(`/api/admin/perguntas/${p.id}/oculta`, { oculta }, "PUT");
    if (!r.ok) return avisar(r.mensagem, "erro");
    avisar(oculta ? "Pergunta escondida." : "Pergunta republicada.");
    router.refresh();
  }

  async function esconderResposta(id: string, oculta: boolean) {
    const r = await enviar(`/api/admin/respostas/${id}/oculta`, { oculta }, "PUT");
    if (!r.ok) return avisar(r.mensagem, "erro");
    avisar(oculta ? "Resposta escondida." : "Resposta republicada.");
    router.refresh();
  }

  return (
    <article className={`moderacao${p.oculta ? " moderacao--oculta" : ""}`} aria-labelledby={`p-${p.id}`}>
      <header className="moderacao__topo">
        <p className="moderacao__contexto">
          {p.curso} · {p.aula}
        </p>
        <div className="moderacao__selos">
          {p.oculta && <Selo tom="erro">Escondida</Selo>}
          {p.respondidaPelaEquipe ? <Selo tom="salvia">Respondida</Selo> : <Selo tom="ouro">Sem resposta da equipe</Selo>}
        </div>
      </header>
      <h2 className="moderacao__titulo" id={`p-${p.id}`}>
        {p.titulo}
      </h2>
      <p className="moderacao__meta">
        {p.autor}
        {p.email && <> · {p.email}</>} · {diaHora.format(new Date(p.criadoEm))}
      </p>
      <p className="moderacao__texto">{p.texto}</p>

      {p.respostas.length > 0 && (
        <ol className="moderacao__respostas">
          {p.respostas.map((r) => (
            <li key={r.id} className={`moderacao__resposta${r.daEquipe ? " is-equipe" : ""}${r.oculta ? " is-oculta" : ""}`}>
              <p className="moderacao__meta">
                <strong>{r.autor}</strong> · {diaHora.format(new Date(r.criadoEm))}
                {r.oculta && (
                  <>
                    {" "}
                    · <Selo tom="erro">Escondida</Selo>
                  </>
                )}
              </p>
              <p className="moderacao__texto">{r.texto}</p>
              <button type="button" className="link link--sublinhado moderacao__acao" onClick={() => esconderResposta(r.id, !r.oculta)}>
                {r.oculta ? "Republicar resposta" : "Esconder resposta"}
              </button>
            </li>
          ))}
        </ol>
      )}

      {!p.oculta && (
        <form className="moderacao__responder" onSubmit={responder} noValidate>
          <AreaTexto
            id={`resposta-${p.id}`}
            rotulo="Responder como Equipe PotencIA"
            rows={3}
            maxLength={4000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            erro={erro}
          />
          <div className="acoes acoes--compactas">
            <Botao type="submit" pequeno carregando={enviando} textoCarregando="Publicando…" disabled={!texto.trim()}>
              Publicar resposta
            </Botao>
          </div>
        </form>
      )}
      <div className="acoes acoes--compactas">
        <Botao variante={p.oculta ? "secundario" : "fantasma"} pequeno onClick={() => esconder(!p.oculta)}>
          {p.oculta ? "Republicar pergunta" : "Esconder pergunta"}
        </Botao>
      </div>
      {dialogo}
    </article>
  );
}

/** Uma avaliação na fila: responder publicamente, esconder ou republicar. */
export function CartaoAvaliacao({ avaliacao: a }: { avaliacao: AvaliacaoAdmin }) {
  const router = useRouter();
  const { avisar } = useAvisos();
  const [texto, setTexto] = useState(a.respostaEquipe ?? "");
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const oculta = a.status === "OCULTA";

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await enviar(`/api/admin/avaliacoes/${a.id}/resposta`, { texto }, "PUT");
    setEnviando(false);
    if (!r.ok) return setErro(r.campos.texto ?? r.mensagem);
    setErro(undefined);
    avisar(texto.trim() ? "Resposta publicada na página do curso." : "Resposta removida.");
    router.refresh();
  }

  async function moderar() {
    const r = await enviar(`/api/admin/avaliacoes/${a.id}/oculta`, { oculta: !oculta }, "PUT");
    if (!r.ok) return avisar(r.mensagem, "erro");
    avisar(oculta ? "Avaliação republicada. A média do curso foi recalculada." : "Avaliação escondida. A média do curso foi recalculada.");
    router.refresh();
  }

  return (
    <article className={`moderacao${oculta ? " moderacao--oculta" : ""}`} aria-labelledby={`a-${a.id}`}>
      <header className="moderacao__topo">
        <p className="moderacao__contexto" id={`a-${a.id}`}>
          {a.curso}
        </p>
        <div className="moderacao__selos">
          {oculta ? <Selo tom="erro">Escondida</Selo> : <Selo tom="salvia">Publicada</Selo>}
          {a.respostaEquipe && <Selo>Respondida</Selo>}
        </div>
      </header>
      <Estrelas nota={a.nota} />
      <p className="moderacao__meta">
        {a.autor}
        {a.email && <> · {a.email}</>} · {diaHora.format(new Date(a.criadoEm))}
      </p>
      {a.comentario ? <p className="moderacao__texto">{a.comentario}</p> : <p className="moderacao__meta">Sem comentário.</p>}

      <form className="moderacao__responder" onSubmit={responder} noValidate>
        <AreaTexto
          id={`resposta-av-${a.id}`}
          rotulo="Resposta pública da Equipe PotencIA"
          rows={2}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          erro={erro}
          ajuda="Aparece abaixo da avaliação na página do curso. Deixe vazio e salve para remover."
        />
        <div className="acoes acoes--compactas">
          <Botao type="submit" pequeno variante="secundario" carregando={enviando} textoCarregando="Salvando…">
            Salvar resposta
          </Botao>
          <Botao variante={oculta ? "secundario" : "fantasma"} pequeno onClick={moderar}>
            {oculta ? "Republicar avaliação" : "Esconder avaliação"}
          </Botao>
        </div>
      </form>
    </article>
  );
}
