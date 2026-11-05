"use client";

import { useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { EstadoVazio, Selo } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import { mover, moverAula, TIPOS_AULA, type CursoEdicao, type ModuloAdmin } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import { duracao, plural } from "@/lib/formato";
import { GavetaAula, type AlvoAula } from "./GavetaAula";

type Arrastado = { tipo: "modulo"; id: number } | { tipo: "aula"; id: number };
/** Onde soltar: antes do índice `indice` no módulo (aulas) ou na lista de módulos. */
type Destino = { tipo: "modulo"; indice: number } | { tipo: "aula"; moduloId: number; indice: number };

/**
 * Módulos e aulas do curso. Reordene arrastando (mouse) ou com os botões
 * subir/descer (teclado e toque): subir a primeira aula leva ao fim do módulo
 * anterior. Cada mudança é salva na hora.
 */
export function EditorCurriculo({ curso, aoMudar }: { curso: CursoEdicao; aoMudar: (curso: CursoEdicao) => void }) {
  const [modulos, setModulos] = useState(curso.modulos);
  const [base, setBase] = useState(curso.modulos);
  const [arrastado, setArrastado] = useState<Arrastado | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [alvoAula, setAlvoAula] = useState<AlvoAula | null>(null);
  const [editandoModulo, setEditandoModulo] = useState<number | "novo" | null>(null);
  const [tituloModulo, setTituloModulo] = useState("");
  const [descricaoModulo, setDescricaoModulo] = useState("");
  const [erroModulo, setErroModulo] = useState<string | undefined>();
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();

  // O servidor mandou um currículo novo (outra ação no editor): passa a valer.
  if (curso.modulos !== base) {
    setBase(curso.modulos);
    setModulos(curso.modulos);
  }

  function aplicar(novo: CursoEdicao) {
    setBase(novo.modulos);
    setModulos(novo.modulos);
    aoMudar(novo);
  }

  async function salvarOrdem(novos: ModuloAdmin[], mensagem: string) {
    const anterior = modulos;
    setModulos(novos);
    setAnuncio(mensagem);
    const r = await enviar<CursoEdicao>(
      `/api/admin/cursos/${curso.id}/curriculo/ordem`,
      { modulos: novos.map((m) => ({ id: m.id, aulas: m.aulas.map((a) => a.id) })) },
      "PUT",
    );
    if (!r.ok) {
      setModulos(anterior);
      avisar(r.mensagem, "erro");
      return;
    }
    aplicar(r.dados);
  }

  function moverAulaPasso(moduloIndice: number, aulaIndice: number, direcao: -1 | 1) {
    const modulo = modulos[moduloIndice];
    const aula = modulo.aulas[aulaIndice];
    let destinoModulo = moduloIndice;
    let destinoIndice = aulaIndice + direcao;
    if (destinoIndice < 0) {
      destinoModulo = moduloIndice - 1;
      if (destinoModulo < 0) return;
      destinoIndice = modulos[destinoModulo].aulas.length;
    } else if (destinoIndice >= modulo.aulas.length) {
      destinoModulo = moduloIndice + 1;
      if (destinoModulo >= modulos.length) return;
      destinoIndice = 0;
    }
    const alvo = modulos[destinoModulo];
    const indice = destinoModulo === moduloIndice && direcao === 1 ? destinoIndice + 1 : destinoIndice;
    void salvarOrdem(moverAula(modulos, aula.id, alvo.id, indice), `"${aula.titulo}" agora é a aula ${destinoIndice + 1} de "${alvo.titulo}".`);
  }

  function soltar() {
    if (!arrastado || !destino) return;
    if (arrastado.tipo === "modulo" && destino.tipo === "modulo") {
      const de = modulos.findIndex((m) => m.id === arrastado.id);
      const para = destino.indice > de ? destino.indice - 1 : destino.indice;
      if (de !== para) void salvarOrdem(mover(modulos, de, para), `Módulo "${modulos[de].titulo}" agora é o ${para + 1}º.`);
    }
    if (arrastado.tipo === "aula" && destino.tipo === "aula") {
      const alvo = modulos.find((m) => m.id === destino.moduloId)!;
      const novos = moverAula(modulos, arrastado.id, destino.moduloId, destino.indice);
      if (JSON.stringify(novos.map((m) => m.aulas.map((a) => a.id))) !== JSON.stringify(modulos.map((m) => m.aulas.map((a) => a.id)))) {
        const titulo = modulos.flatMap((m) => m.aulas).find((a) => a.id === arrastado.id)?.titulo;
        void salvarOrdem(novos, `"${titulo}" movida para "${alvo.titulo}".`);
      }
    }
    setArrastado(null);
    setDestino(null);
  }

  /** Metade de cima da linha: solta antes; metade de baixo: depois. */
  function posicao(e: React.DragEvent, indice: number) {
    const caixa = e.currentTarget.getBoundingClientRect();
    return e.clientY < caixa.top + caixa.height / 2 ? indice : indice + 1;
  }

  async function salvarModulo(e: React.FormEvent) {
    e.preventDefault();
    if (!tituloModulo.trim()) {
      setErroModulo("Dê um título ao módulo.");
      return;
    }
    const corpo = { titulo: tituloModulo, descricao: descricaoModulo };
    const r =
      editandoModulo === "novo"
        ? await enviar<CursoEdicao>(`/api/admin/cursos/${curso.id}/modulos`, corpo)
        : await enviar<CursoEdicao>(`/api/admin/modulos/${editandoModulo}`, corpo, "PUT");
    if (!r.ok) {
      setErroModulo(r.campos.titulo ?? r.mensagem);
      return;
    }
    aplicar(r.dados);
    avisar(editandoModulo === "novo" ? "Módulo criado." : "Módulo salvo.");
    setEditandoModulo(null);
  }

  function abrirModulo(m: ModuloAdmin | null) {
    setEditandoModulo(m ? m.id : "novo");
    setTituloModulo(m?.titulo ?? "");
    setDescricaoModulo(m?.descricao ?? "");
    setErroModulo(undefined);
  }

  async function excluirModulo(m: ModuloAdmin) {
    if (m.aulas.length > 0) {
      avisar("Mova ou exclua as aulas antes de excluir o módulo.", "erro");
      return;
    }
    if (!(await confirmar({ titulo: `Excluir o módulo "${m.titulo}"?`, texto: "O módulo está vazio. Isso não pode ser desfeito.", confirmar: "Excluir módulo", perigo: true }))) return;
    const r = await enviar<CursoEdicao>(`/api/admin/modulos/${m.id}`, null, "DELETE");
    if (!r.ok) return avisar(r.mensagem, "erro");
    aplicar(r.dados);
    avisar("Módulo excluído.");
  }

  async function excluirAula(aulaId: number, titulo: string) {
    const ok = await confirmar({
      titulo: `Excluir a aula "${titulo}"?`,
      texto: "Os materiais anexados saem junto. Se algum aluno já começou a aula, ela não pode ser excluída: despublique em vez disso.",
      confirmar: "Excluir aula",
      perigo: true,
    });
    if (!ok) return;
    const r = await enviar<CursoEdicao>(`/api/admin/aulas/${aulaId}`, null, "DELETE");
    if (!r.ok) return avisar(r.mensagem, "erro");
    aplicar(r.dados);
    avisar("Aula excluída.");
  }

  const formModulo = (
    <form className="modulo-form" onSubmit={salvarModulo} noValidate>
      <Campo
        id="modulo-titulo"
        rotulo="Título do módulo"
        required
        maxLength={160}
        autoFocus
        value={tituloModulo}
        erro={erroModulo}
        onChange={(e) => {
          setTituloModulo(e.target.value);
          setErroModulo(undefined);
        }}
      />
      <Campo id="modulo-descricao" rotulo="Descrição (opcional)" maxLength={600} value={descricaoModulo} onChange={(e) => setDescricaoModulo(e.target.value)} />
      <div className="acoes acoes--compactas">
        <Botao type="submit" pequeno>
          {editandoModulo === "novo" ? "Criar módulo" : "Salvar módulo"}
        </Botao>
        <Botao pequeno variante="secundario" onClick={() => setEditandoModulo(null)}>
          Cancelar
        </Botao>
      </div>
    </form>
  );

  return (
    <div className="curriculo-editor">
      {dialogo}
      <p className="sr-only" aria-live="assertive">
        {anuncio}
      </p>
      <p className="painel-bloco__apoio">
        {plural(curso.totalAulasPublicadas, "aula publicada", "aulas publicadas")}
        {curso.duracaoPublicadaSegundos > 0 && ` · ${duracao(curso.duracaoPublicadaSegundos)}`}. Arraste pelo puxador ou use as setas para mudar a ordem.
      </p>

      {modulos.length === 0 && editandoModulo !== "novo" && (
        <EstadoVazio titulo="Este curso ainda não tem módulos." acao={<Botao onClick={() => abrirModulo(null)}>Criar o primeiro módulo</Botao>}>
          Organize as aulas em módulos: &quot;Preparando o computador&quot;, &quot;Primeiros pedidos&quot;...
        </EstadoVazio>
      )}

      <ol className="curriculo-editor__modulos" onDragEnd={() => (setArrastado(null), setDestino(null))}>
        {modulos.map((m, mi) => (
          <li
            key={m.id}
            className={`modulo-editor${arrastado?.tipo === "modulo" && arrastado.id === m.id ? " is-arrastando" : ""}${destino?.tipo === "modulo" && destino.indice === mi ? " is-alvo-antes" : ""}${destino?.tipo === "modulo" && destino.indice === mi + 1 && mi === modulos.length - 1 ? " is-alvo-depois" : ""}`}
            onDragOver={(e) => {
              if (arrastado?.tipo !== "modulo") return;
              e.preventDefault();
              setDestino({ tipo: "modulo", indice: posicao(e, mi) });
            }}
            onDrop={(e) => {
              e.preventDefault();
              soltar();
            }}
          >
            {editandoModulo === m.id ? (
              formModulo
            ) : (
              <div className="modulo-editor__cabeca">
                <span
                  className="puxador"
                  draggable
                  aria-hidden="true"
                  title="Arrastar módulo"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", `modulo:${m.id}`);
                    setArrastado({ tipo: "modulo", id: m.id });
                  }}
                >
                  <Icone nome="arrastar" />
                </span>
                <div className="modulo-editor__titulo">
                  <span className="modulo-editor__numero">Módulo {mi + 1}</span>
                  <strong>{m.titulo}</strong>
                  <span className="modulo-editor__meta">{plural(m.aulas.length, "aula", "aulas")}</span>
                </div>
                <div className="linha-acoes">
                  <button type="button" className="icone-botao" disabled={mi === 0} onClick={() => salvarOrdem(mover(modulos, mi, mi - 1), `Módulo "${m.titulo}" agora é o ${mi}º.`)}>
                    <Icone nome="cima" tamanho={16} />
                    <span className="sr-only">Subir módulo {m.titulo}</span>
                  </button>
                  <button
                    type="button"
                    className="icone-botao"
                    disabled={mi === modulos.length - 1}
                    onClick={() => salvarOrdem(mover(modulos, mi, mi + 1), `Módulo "${m.titulo}" agora é o ${mi + 2}º.`)}
                  >
                    <Icone nome="baixo" tamanho={16} />
                    <span className="sr-only">Descer módulo {m.titulo}</span>
                  </button>
                  <button type="button" className="icone-botao" onClick={() => abrirModulo(m)}>
                    <Icone nome="editar" tamanho={16} />
                    <span className="sr-only">Editar módulo {m.titulo}</span>
                  </button>
                  <button type="button" className="icone-botao icone-botao--perigo" onClick={() => excluirModulo(m)}>
                    <Icone nome="lixeira" tamanho={16} />
                    <span className="sr-only">Excluir módulo {m.titulo}</span>
                  </button>
                </div>
              </div>
            )}

            <ol
              className="aulas-editor"
              onDragOver={(e) => {
                // Módulo vazio (ou soltar no fim da lista): entra como última aula.
                if (arrastado?.tipo !== "aula" || e.target !== e.currentTarget) return;
                e.preventDefault();
                setDestino({ tipo: "aula", moduloId: m.id, indice: m.aulas.length });
              }}
            >
              {m.aulas.map((a, ai) => (
                <li
                  key={a.id}
                  className={`aula-editor${arrastado?.tipo === "aula" && arrastado.id === a.id ? " is-arrastando" : ""}${destino?.tipo === "aula" && destino.moduloId === m.id && destino.indice === ai ? " is-alvo-antes" : ""}${destino?.tipo === "aula" && destino.moduloId === m.id && destino.indice === ai + 1 && ai === m.aulas.length - 1 ? " is-alvo-depois" : ""}`}
                  onDragOver={(e) => {
                    if (arrastado?.tipo !== "aula") return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDestino({ tipo: "aula", moduloId: m.id, indice: posicao(e, ai) });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soltar();
                  }}
                >
                  <span
                    className="puxador"
                    draggable
                    aria-hidden="true"
                    title="Arrastar aula"
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", `aula:${a.id}`);
                      setArrastado({ tipo: "aula", id: a.id });
                    }}
                  >
                    <Icone nome="arrastar" tamanho={18} />
                  </span>
                  <span className="aula-editor__tipo">{TIPOS_AULA[a.tipo]}</span>
                  <button type="button" className="aula-editor__titulo" onClick={() => setAlvoAula({ aula: a })}>
                    {a.titulo}
                  </button>
                  <span className="aula-editor__selos">
                    {a.previa && <Selo tom="salvia">Prévia</Selo>}
                    {!a.publicada && <Selo>Não publicada</Selo>}
                    {a.tipo === "VIDEO" && !a.videoId && <Selo tom="ouro">Sem vídeo</Selo>}
                    {a.materiais.length > 0 && <Selo>{plural(a.materiais.length, "material", "materiais")}</Selo>}
                  </span>
                  <span className="aula-editor__duracao">{a.duracaoSegundos ? duracao(a.duracaoSegundos) : "—"}</span>
                  <span className="linha-acoes">
                    <button type="button" className="icone-botao" disabled={mi === 0 && ai === 0} onClick={() => moverAulaPasso(mi, ai, -1)}>
                      <Icone nome="cima" tamanho={16} />
                      <span className="sr-only">Subir aula {a.titulo}</span>
                    </button>
                    <button
                      type="button"
                      className="icone-botao"
                      disabled={mi === modulos.length - 1 && ai === m.aulas.length - 1}
                      onClick={() => moverAulaPasso(mi, ai, 1)}
                    >
                      <Icone nome="baixo" tamanho={16} />
                      <span className="sr-only">Descer aula {a.titulo}</span>
                    </button>
                    <button type="button" className="icone-botao icone-botao--perigo" onClick={() => excluirAula(a.id, a.titulo)}>
                      <Icone nome="lixeira" tamanho={16} />
                      <span className="sr-only">Excluir aula {a.titulo}</span>
                    </button>
                  </span>
                </li>
              ))}
              {m.aulas.length === 0 && <li className="aulas-editor__vazio">Arraste uma aula para cá ou crie a primeira.</li>}
            </ol>
            <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => setAlvoAula({ moduloId: m.id, moduloTitulo: m.titulo })}>
              + Nova aula em &quot;{m.titulo}&quot;
            </button>
          </li>
        ))}
      </ol>

      {editandoModulo === "novo" ? (
        <div className="modulo-editor">{formModulo}</div>
      ) : (
        modulos.length > 0 && (
          <Botao variante="secundario" onClick={() => abrirModulo(null)}>
            + Novo módulo
          </Botao>
        )
      )}

      <GavetaAula
        alvo={alvoAula}
        aoFechar={() => setAlvoAula(null)}
        aoSalvar={(novo, aulaId) => {
          aplicar(novo);
          // Aula recém-criada: a gaveta passa a editá-la (para anexar materiais).
          if (alvoAula && !("aula" in alvoAula)) {
            const criada = novo.modulos.flatMap((m) => m.aulas).find((a) => a.id === aulaId);
            if (criada) setAlvoAula({ aula: criada });
          }
        }}
      />
    </div>
  );
}
