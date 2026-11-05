"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Abas } from "@/components/ui/Abas";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Aviso, BarraProgresso } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import { Modal } from "@/components/ui/Modal";
import { TextoMarkdown } from "@/components/ui/TextoMarkdown";
import { tamanhoArquivo } from "@/lib/admin";
import { enviar } from "@/lib/cliente";
import type { AulaPlayer, Conclusao, PainelCurso } from "@/lib/aprender";
import { AvaliarCurso } from "@/components/comunidade/AvaliarCurso";
import { Perguntas } from "@/components/comunidade/Perguntas";
import { Anotacoes } from "./Anotacoes";
import { Curriculo } from "./Curriculo";
import { VideoAula, type ControleVideo } from "./VideoAula";

/**
 * Player do curso: vídeo (ou texto) da aula, abas de visão geral e anotações,
 * navegação entre aulas e o currículo lateral com o progresso.
 */
export function Player({ painel, aula }: { painel: PainelCurso; aula: AulaPlayer }) {
  const router = useRouter();
  const controle = useRef<ControleVideo>(null);
  const [concluidas, setConcluidas] = useState(
    () => new Set(painel.modulos.flatMap((m) => m.aulas.filter((a) => a.concluida).map((a) => a.id))),
  );
  const [percentual, setPercentual] = useState(painel.percentual);
  const [certificado, setCertificado] = useState(painel.certificadoCodigo);
  const [parabens, setParabens] = useState(false);
  const [curriculoAberto, setCurriculoAberto] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState("visao");

  const href = (id: number | null) => (id ? `/aprender/${painel.slug}/${id}` : null);
  const concluida = concluidas.has(aula.id);

  async function alternar(aulaId: number, marcar: boolean) {
    const anterior = new Set(concluidas);
    const proximo = new Set(concluidas);
    if (marcar) proximo.add(aulaId);
    else proximo.delete(aulaId);
    setConcluidas(proximo);
    const r = await enviar<Conclusao>(`/api/aulas/${aulaId}/conclusao`, { concluida: marcar }, "PUT");
    if (!r.ok) {
      setConcluidas(anterior);
      setErro(r.mensagem);
      return;
    }
    setErro(null);
    setPercentual(r.dados.percentual);
    if (r.dados.certificadoCodigo) setCertificado(r.dados.certificadoCodigo);
    if (r.dados.cursoConcluido && marcar) setParabens(true);
    router.refresh();
  }

  const visaoGeral = (
    <div className="visao-geral">
      {aula.resumo ? <p className="visao-geral__resumo">{aula.resumo}</p> : <p className="visao-geral__resumo">{aula.moduloTitulo}</p>}
      {aula.materiais.length > 0 && (
        <div className="materiais">
          <h2 className="materiais__titulo">Materiais para baixar</h2>
          <ul className="materiais__lista">
            {aula.materiais.map((m) => (
              <li key={m.url}>
                {/* Link assinado e curto: vale por algumas horas, só para quem tem acesso. */}
                <a href={m.url} className="materiais__link" download>
                  <Icone nome="envio" tamanho={16} />
                  <span>{m.nome}</span>
                  {m.tamanhoBytes ? <span className="materiais__tamanho">{tamanhoArquivo(m.tamanhoBytes)}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="visao-geral__dados">
        <div>
          <dt>Curso</dt>
          <dd>
            <Link href={`/cursos/${painel.slug}`} className="link link--sublinhado">
              {painel.titulo}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Módulo</dt>
          <dd>{aula.moduloTitulo}</dd>
        </div>
        <div>
          <dt>Aula</dt>
          <dd>
            {aula.indice} de {aula.total}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className={`player${curriculoAberto ? "" : " player--sem-curriculo"}`}>
      <header className="player__topo">
        <Link href={`/cursos/${painel.slug}`} className="player__voltar">
          <Icone nome="esquerda" tamanho={18} />
          <span>
            <span className="sr-only">Voltar para a página do curso </span>
            {painel.titulo}
          </span>
        </Link>
        <div className="player__progresso">
          <span>
            {concluidas.size} de {painel.totalAulas} aulas
          </span>
          <BarraProgresso valor={percentual} rotulo="Progresso no curso" />
        </div>
        {certificado && (
          <Link href={`/certificados/${certificado}`} className="player__certificado">
            <Icone nome="certificado" tamanho={18} />
            Certificado
          </Link>
        )}
        <button
          type="button"
          className="player__alternar"
          aria-expanded={curriculoAberto}
          aria-controls="curriculo"
          onClick={() => setCurriculoAberto((a) => !a)}
        >
          {curriculoAberto ? "Esconder aulas" : "Mostrar aulas"}
        </button>
      </header>

      <main id="conteudo" className="player__principal">
        {aula.tipo === "VIDEO" ? (
          <VideoAula
            key={aula.id}
            aula={aula}
            controle={controle}
            hrefProxima={href(aula.proximaId)}
            aoChegarEm90={() => !concluida && alternar(aula.id, true)}
          />
        ) : (
          <article className="aula-texto">
            <TextoMarkdown texto={aula.conteudo ?? aula.resumo ?? "Conteúdo em preparação."} />
          </article>
        )}

        <div className="player__aula">
          <div className="player__cabeca-aula">
            <div>
              <p className="olho">
                {aula.moduloTitulo} · Aula {aula.indice} de {aula.total}
              </p>
              <h1 className="player__titulo">{aula.titulo}</h1>
            </div>
            <label className={`player__concluir${concluida ? " is-concluida" : ""}`}>
              <input type="checkbox" checked={concluida} onChange={(e) => alternar(aula.id, e.target.checked)} />
              {concluida ? "Aula concluída" : "Marcar como concluída"}
            </label>
          </div>

          {erro && <Aviso tipo="erro" titulo={erro} />}

          <nav className="player__navegacao" aria-label="Aulas vizinhas">
            {aula.anteriorId ? (
              <Link href={href(aula.anteriorId)!} className="botao botao--secundario botao--pequeno">
                <Icone nome="esquerda" tamanho={16} /> Aula anterior
              </Link>
            ) : (
              <span />
            )}
            {aula.proximaId ? (
              <Link href={href(aula.proximaId)!} className="botao botao--principal botao--pequeno">
                Próxima aula <Icone nome="direita" tamanho={16} />
              </Link>
            ) : (
              <span className="player__fim">Última aula do curso</span>
            )}
          </nav>

          <Abas
            rotulo="Sobre a aula"
            ativa={aba}
            aoTrocar={setAba}
            abas={[
              { id: "visao", rotulo: "Visão geral", conteudo: visaoGeral },
              {
                id: "anotacoes",
                rotulo: "Anotações",
                conteudo: (
                  <Anotacoes
                    aulaId={aula.id}
                    temVideo={aula.tipo === "VIDEO" && Boolean(aula.video)}
                    tempoAtual={() => controle.current?.tempoAtual() ?? 0}
                    irPara={(s) => controle.current?.irPara(s)}
                  />
                ),
              },
              { id: "perguntas", rotulo: "Perguntas", conteudo: <Perguntas key={aula.id} aulaId={aula.id} /> },
              {
                id: "avaliacao",
                rotulo: "Avaliações do curso",
                conteudo: <AvaliarCurso slug={painel.slug} percentual={percentual} />,
              },
            ]}
          />
        </div>
      </main>

      <aside id="curriculo" className="player__lateral" hidden={!curriculoAberto} aria-label="Conteúdo do curso">
        <p className="player__lateral-titulo">Conteúdo do curso</p>
        <Curriculo painel={painel} atual={aula.id} concluidas={concluidas} aoAlternar={alternar} />
      </aside>

      <Modal aberto={parabens} aoFechar={() => setParabens(false)} titulo="Curso concluído!">
        <div className="parabens">
          <p className="parabens__texto">
            Você terminou <strong>{painel.titulo}</strong>. Agora é colocar em prática no seu negócio.
          </p>
          {certificado ? (
            <BotaoLink href={`/certificados/${certificado}`} largo>
              Ver meu certificado
            </BotaoLink>
          ) : null}
          <Botao
            variante="secundario"
            largo
            onClick={() => {
              setParabens(false);
              setAba("avaliacao");
              requestAnimationFrame(() => document.getElementById("conteudo")?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus());
            }}
          >
            Avaliar o curso
          </Botao>
          <BotaoLink href="/minha-conta/cursos" variante="fantasma" largo>
            Ir para meus cursos
          </BotaoLink>
        </div>
      </Modal>
    </div>
  );
}
