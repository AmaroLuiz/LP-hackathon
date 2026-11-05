"use client";

import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Aviso, EstadoVazio, Selo } from "@/components/ui/Exibicao";
import { Campo } from "@/components/ui/Campo";
import { AreaTexto } from "@/components/ui/Formulario";
import { enviar } from "@/lib/cliente";
import type { PerguntaItem, RespostaItem } from "@/lib/comunidade";
import { dataPorExtenso, plural } from "@/lib/formato";

type Ordem = "recentes" | "uteis" | "sem-resposta";

/**
 * Perguntas da aula: listar, perguntar, responder e marcar "também tenho essa
 * dúvida". As respostas da Equipe PotencIA aparecem destacadas.
 */
export function Perguntas({ aulaId }: { aulaId: number }) {
  const [lista, setLista] = useState<PerguntaItem[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/aulas/${aulaId}/perguntas`, { credentials: "same-origin" })
      .then(async (r) => {
        if (!ativo) return;
        if (r.ok) setLista((await r.json()) as PerguntaItem[]);
        else {
          setErroLista("Não conseguimos carregar as perguntas desta aula.");
          setLista([]);
        }
      })
      .catch(() => {
        if (!ativo) return;
        setErroLista("Sem conexão. Verifique a internet e tente de novo.");
        setLista([]);
      });
    return () => {
      ativo = false;
    };
  }, [aulaId]);

  async function perguntar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErros({});
    setAviso(null);
    const r = await enviar<PerguntaItem>(`/api/aulas/${aulaId}/perguntas`, { titulo, texto });
    setEnviando(false);
    if (!r.ok) {
      setErros(Object.keys(r.campos).length ? r.campos : { geral: r.mensagem });
      return;
    }
    setLista((atual) => [r.dados, ...(atual ?? [])]);
    setTitulo("");
    setTexto("");
    setAviso("Pergunta publicada. Avisamos por e-mail quando alguém responder.");
  }

  function atualizar(id: string, mudar: (p: PerguntaItem) => PerguntaItem | null) {
    setLista((atual) => (atual ?? []).flatMap((p) => (p.id === id ? [mudar(p)].filter((x): x is PerguntaItem => x !== null) : [p])));
  }

  const ordenada = [...(lista ?? [])]
    .filter((p) => ordem !== "sem-resposta" || p.respostas.length === 0)
    .sort((a, b) => (ordem === "uteis" ? b.uteis - a.uteis : 0) || b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="duvidas">
      <form className="duvidas__nova" onSubmit={perguntar} noValidate>
        <h2 className="duvidas__titulo">Ficou com dúvida nesta aula?</h2>
        <Campo
          id={`pergunta-titulo-${aulaId}`}
          rotulo="Resumo da pergunta"
          maxLength={160}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          erro={erros.titulo}
          placeholder="Ex.: Como adapto o prompt para o cardápio?"
          required
        />
        <AreaTexto
          id={`pergunta-texto-${aulaId}`}
          rotulo="Detalhes"
          rows={4}
          maxLength={4000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          erro={erros.texto}
          ajuda="Conte o que você tentou. Não coloque senhas nem dados de clientes."
          required
        />
        {erros.geral && <Aviso tipo="erro" titulo={erros.geral} />}
        {aviso && <Aviso tipo="sucesso" titulo={aviso} />}
        <div>
          <Botao type="submit" pequeno carregando={enviando} textoCarregando="Publicando…">
            Publicar pergunta
          </Botao>
        </div>
      </form>

      {erroLista && <Aviso tipo="erro" titulo={erroLista} />}

      {lista === null ? (
        <p className="duvidas__carregando">Carregando perguntas…</p>
      ) : lista.length === 0 ? (
        <EstadoVazio titulo="Ninguém perguntou nada nesta aula ainda.">
          Sua dúvida pode ser a de outras pessoas também. A Equipe PotencIA acompanha as perguntas.
        </EstadoVazio>
      ) : (
        <>
          <div className="duvidas__barra">
            <p className="duvidas__total">{plural(lista.length, "pergunta", "duvidas")}</p>
            <label className="duvidas__ordem">
              <span>Mostrar</span>
              <select className="campo__entrada" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
                <option value="recentes">Mais recentes</option>
                <option value="uteis">Mais úteis</option>
                <option value="sem-resposta">Sem resposta</option>
              </select>
            </label>
          </div>
          {ordenada.length === 0 ? (
            <p className="duvidas__carregando">Todas as perguntas desta aula já têm resposta.</p>
          ) : (
            <ol className="duvidas__lista">
              {ordenada.map((p) => (
                <li key={p.id}>
                  <Pergunta pergunta={p} aoMudar={(mudar) => atualizar(p.id, mudar)} />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function Pergunta({
  pergunta: p,
  aoMudar,
}: {
  pergunta: PerguntaItem;
  aoMudar: (mudar: (p: PerguntaItem) => PerguntaItem | null) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const idRespostas = `respostas-${p.id}`;
  const { confirmar, dialogo } = useConfirmacao();

  async function marcar() {
    const marcar = !p.marcadaPorVoce;
    aoMudar((x) => ({ ...x, marcadaPorVoce: marcar, uteis: x.uteis + (marcar ? 1 : -1) }));
    const r = await enviar<{ uteis: number }>(`/api/perguntas/${p.id}/util`, { util: marcar }, "PUT");
    if (r.ok) aoMudar((x) => ({ ...x, uteis: r.dados.uteis }));
    else {
      aoMudar((x) => ({ ...x, marcadaPorVoce: !marcar, uteis: x.uteis + (marcar ? -1 : 1) }));
      setErro(r.mensagem);
    }
  }

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    if (!resposta.trim()) return;
    setEnviando(true);
    setErro(null);
    const r = await enviar<RespostaItem>(`/api/perguntas/${p.id}/respostas`, { texto: resposta });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.campos.texto ?? r.mensagem);
      return;
    }
    aoMudar((x) => ({ ...x, respostas: [...x.respostas, r.dados] }));
    setResposta("");
  }

  async function apagar() {
    const sim = await confirmar({
      titulo: "Apagar pergunta",
      texto: "A pergunta e as respostas deixam de aparecer para todos.",
      confirmar: "Apagar",
      perigo: true,
    });
    if (!sim) return;
    const r = await enviar(`/api/perguntas/${p.id}`, null, "DELETE");
    if (r.ok) aoMudar(() => null);
    else setErro(r.mensagem);
  }

  return (
    <article className="pergunta" aria-labelledby={`pergunta-${p.id}`}>
      <h3 className="pergunta__titulo" id={`pergunta-${p.id}`}>
        {p.titulo}
      </h3>
      <p className="pergunta__meta">
        {p.autor.voce ? "Você" : p.autor.nome} · {dataPorExtenso(p.criadoEm)}
        {p.respondidaPelaEquipe && (
          <>
            {" "}
            · <Selo tom="ouro">Respondida pela equipe</Selo>
          </>
        )}
      </p>
      <p className="pergunta__texto">{p.texto}</p>
      <div className="pergunta__acoes">
        <button type="button" className="pergunta__util" aria-pressed={p.marcadaPorVoce} onClick={marcar}>
          Também tenho essa dúvida
          <span className="pergunta__contagem">{p.uteis}</span>
        </button>
        <button
          type="button"
          className="anotacao__acao"
          aria-expanded={aberta}
          aria-controls={idRespostas}
          onClick={() => setAberta((a) => !a)}
        >
          {p.respostas.length === 0 ? "Responder" : `${plural(p.respostas.length, "resposta", "respostas")}`}
        </button>
        {p.autor.voce && (
          <button type="button" className="anotacao__acao anotacao__acao--perigo" onClick={apagar}>
            Apagar
          </button>
        )}
      </div>
      {erro && <Aviso tipo="erro" titulo={erro} />}

      <div id={idRespostas} hidden={!aberta} className="pergunta__respostas">
        {p.respostas.length > 0 && (
          <ol className="respostas">
            {p.respostas.map((r) => (
              <li key={r.id} className={`resposta${r.autor.equipe ? " resposta--equipe" : ""}`}>
                <p className="resposta__autor">
                  {r.autor.equipe ? (
                    <>
                      Equipe PotencIA<span className="resposta__expoente" aria-hidden="true" />
                    </>
                  ) : r.autor.voce ? (
                    "Você"
                  ) : (
                    r.autor.nome
                  )}
                  <span className="resposta__data"> · {dataPorExtenso(r.criadoEm)}</span>
                </p>
                <p className="resposta__texto">{r.texto}</p>
              </li>
            ))}
          </ol>
        )}
        <form className="pergunta__responder" onSubmit={responder}>
          <label htmlFor={`responder-${p.id}`} className="campo__rotulo">
            Sua resposta
          </label>
          <textarea
            id={`responder-${p.id}`}
            className="campo__entrada anotacoes__texto"
            rows={3}
            maxLength={4000}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
          />
          <div>
            <Botao type="submit" pequeno variante="secundario" carregando={enviando} textoCarregando="Enviando…" disabled={!resposta.trim()}>
              Responder
            </Botao>
          </div>
        </form>
      </div>
      {dialogo}
    </article>
  );
}
