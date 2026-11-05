"use client";

import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Aviso, EstadoVazio } from "@/components/ui/Exibicao";
import { enviar } from "@/lib/cliente";
import { relogio } from "@/lib/formato";
import type { Anotacao } from "@/lib/aprender";

/**
 * Anotações da aula, presas a um momento do vídeo: clicar no tempo leva o
 * vídeo até lá. Só o próprio aluno vê as anotações dele.
 */
export function Anotacoes({
  aulaId,
  temVideo,
  tempoAtual,
  irPara,
}: {
  aulaId: number;
  temVideo: boolean;
  tempoAtual: () => number;
  irPara: (segundos: number) => void;
}) {
  const [lista, setLista] = useState<Anotacao[] | null>(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/aulas/${aulaId}/anotacoes`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : []))
      .then((dados: Anotacao[]) => ativo && setLista(dados))
      .catch(() => ativo && setLista([]));
    return () => {
      ativo = false;
    };
  }, [aulaId]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSalvando(true);
    setErro(null);
    const r = await enviar<Anotacao>(`/api/aulas/${aulaId}/anotacoes`, {
      posicaoSegundos: Math.floor(temVideo ? tempoAtual() : 0),
      texto,
    });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.campos.texto ?? r.mensagem);
      return;
    }
    setLista((atual) => [...(atual ?? []), r.dados].sort((a, b) => a.posicaoSegundos - b.posicaoSegundos));
    setTexto("");
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const r = await enviar<Anotacao>(`/api/anotacoes/${editando.id}`, { texto: editando.texto }, "PUT");
    if (!r.ok) {
      setErro(r.campos.texto ?? r.mensagem);
      return;
    }
    setLista((atual) => (atual ?? []).map((a) => (a.id === r.dados.id ? r.dados : a)));
    setEditando(null);
  }

  async function excluir(id: string) {
    const r = await enviar(`/api/anotacoes/${id}`, null, "DELETE");
    if (r.ok) setLista((atual) => (atual ?? []).filter((a) => a.id !== id));
    else setErro(r.mensagem);
  }

  return (
    <div className="anotacoes">
      <form className="anotacoes__nova" onSubmit={criar}>
        <label htmlFor="nova-anotacao" className="campo__rotulo">
          {temVideo ? "Anotar neste momento do vídeo" : "Nova anotação"}
        </label>
        <textarea
          id="nova-anotacao"
          className="campo__entrada anotacoes__texto"
          rows={3}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: testar esse pedido com o cardápio da padaria"
        />
        <div className="anotacoes__acoes">
          <Botao type="submit" pequeno carregando={salvando} textoCarregando="Salvando…" disabled={!texto.trim()}>
            Salvar anotação
          </Botao>
        </div>
      </form>

      {erro && <Aviso tipo="erro" titulo={erro} />}

      {lista === null ? (
        <p className="anotacoes__carregando">Carregando anotações…</p>
      ) : lista.length === 0 ? (
        <EstadoVazio titulo="Nenhuma anotação nesta aula.">
          Anote ideias enquanto assiste: cada anotação guarda o momento do vídeo.
        </EstadoVazio>
      ) : (
        <ol className="anotacoes__lista">
          {lista.map((a) => (
            <li key={a.id} className="anotacao">
              {temVideo && (
                <button type="button" className="anotacao__tempo" onClick={() => irPara(a.posicaoSegundos)}>
                  {relogio(a.posicaoSegundos)}
                  <span className="sr-only"> (ir para este momento do vídeo)</span>
                </button>
              )}
              {editando?.id === a.id ? (
                <form className="anotacao__edicao" onSubmit={salvarEdicao}>
                  <label htmlFor={`editar-${a.id}`} className="sr-only">
                    Editar anotação
                  </label>
                  <textarea
                    id={`editar-${a.id}`}
                    className="campo__entrada anotacoes__texto"
                    rows={3}
                    maxLength={2000}
                    value={editando.texto}
                    onChange={(e) => setEditando({ id: a.id, texto: e.target.value })}
                    autoFocus
                  />
                  <div className="anotacoes__acoes">
                    <Botao type="submit" pequeno>
                      Salvar
                    </Botao>
                    <Botao variante="fantasma" pequeno onClick={() => setEditando(null)}>
                      Cancelar
                    </Botao>
                  </div>
                </form>
              ) : (
                <>
                  <p className="anotacao__texto">{a.texto}</p>
                  <div className="anotacao__acoes">
                    <button type="button" className="anotacao__acao" onClick={() => setEditando({ id: a.id, texto: a.texto })}>
                      Editar
                    </button>
                    <button type="button" className="anotacao__acao anotacao__acao--perigo" onClick={() => excluir(a.id)}>
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
