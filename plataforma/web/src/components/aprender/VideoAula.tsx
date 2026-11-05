"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { enviar } from "@/lib/cliente";
import type { AulaPlayer } from "@/lib/aprender";

export type ControleVideo = { tempoAtual: () => number; irPara: (segundos: number) => void };

const VELOCIDADES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SALVAR_A_CADA_MS = 10_000;
const ESPERA_PROXIMA = 5;

/**
 * Vídeo da aula com os controles nativos do navegador (acessíveis e familiares)
 * e o que o player precisa a mais: retomar de onde parou, salvar a posição,
 * concluir ao passar de 90%, atalhos de teclado, velocidade e próxima aula.
 */
export function VideoAula({
  aula,
  hrefProxima,
  aoChegarEm90,
  controle,
}: {
  aula: AulaPlayer;
  hrefProxima: string | null;
  aoChegarEm90: () => void;
  controle: Ref<ControleVideo>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const ultimaSalva = useRef(aula.posicaoSegundos);
  const avisou90 = useRef(aula.concluida);
  const router = useRouter();
  const [velocidade, setVelocidade] = useState(1);
  const [contagem, setContagem] = useState<number | null>(null);

  useImperativeHandle(controle, () => ({
    tempoAtual: () => video.current?.currentTime ?? 0,
    irPara: (s: number) => {
      const v = video.current;
      if (!v) return;
      v.currentTime = s;
      v.play().catch(() => {});
      v.focus();
    },
  }));

  const salvar = useCallback(
    (ao_sair = false) => {
      const v = video.current;
      if (!v) return;
      const posicao = Math.floor(v.currentTime);
      if (Math.abs(posicao - ultimaSalva.current) < 2) return;
      ultimaSalva.current = posicao;
      void enviar(`/api/aulas/${aula.id}/posicao`, { posicaoSegundos: posicao }, "PUT", { keepalive: ao_sair });
    },
    [aula.id],
  );

  // Salva a cada 10 s enquanto toca e ao sair da página.
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (video.current && !video.current.paused) salvar();
    }, SALVAR_A_CADA_MS);
    const sair = () => salvar(true);
    const escondeu = () => document.visibilityState === "hidden" && salvar(true);
    window.addEventListener("pagehide", sair);
    document.addEventListener("visibilitychange", escondeu);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("pagehide", sair);
      document.removeEventListener("visibilitychange", escondeu);
      salvar(true);
    };
  }, [salvar]);

  // Contagem para a próxima aula.
  useEffect(() => {
    if (contagem === null || !hrefProxima) return;
    if (contagem <= 0) {
      router.push(hrefProxima);
      return;
    }
    const t = setTimeout(() => setContagem((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [contagem, hrefProxima, router]);

  function trocarVelocidade(nova: number) {
    setVelocidade(nova);
    localStorage.setItem("potencia:velocidade", String(nova));
    if (video.current) video.current.playbackRate = nova;
  }

  /** Atalhos: espaço/K tocar, ←/→ 5 s, J/L 10 s, F tela cheia, M som, C legenda. */
  function atalhos(e: React.KeyboardEvent) {
    const v = video.current;
    if (!v || e.altKey || e.ctrlKey || e.metaKey) return;
    const pular = (s: number) => {
      v.currentTime = Math.min(Math.max(0, v.currentTime + s), v.duration || Infinity);
    };
    const acoes: Record<string, () => void> = {
      " ": () => (v.paused ? v.play() : v.pause()),
      k: () => (v.paused ? v.play() : v.pause()),
      ArrowLeft: () => pular(-5),
      ArrowRight: () => pular(5),
      j: () => pular(-10),
      l: () => pular(10),
      m: () => (v.muted = !v.muted),
      f: () => (document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen()),
      c: () => {
        const faixa = v.textTracks[0];
        if (faixa) faixa.mode = faixa.mode === "showing" ? "hidden" : "showing";
      },
    };
    const acao = acoes[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (acao) {
      e.preventDefault();
      acao();
    }
  }

  if (!aula.video) {
    return (
      <div className="video video--indisponivel">
        <p>O vídeo desta aula ainda não está disponível. Tente de novo mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="video">
      {/* O próprio vídeo recebe o foco e os atalhos; os controles nativos continuam valendo. */}
      <video
        ref={video}
        className="video__elemento"
        src={aula.video.url}
        poster={aula.video.poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        aria-label={`Vídeo da aula: ${aula.titulo}`}
        aria-keyshortcuts="Space K ArrowLeft ArrowRight J L F M C"
        onKeyDown={atalhos}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          // A velocidade escolhida vale para todas as aulas.
          const salva = Number(localStorage.getItem("potencia:velocidade"));
          const escolhida = VELOCIDADES.includes(salva) ? salva : velocidade;
          setVelocidade(escolhida);
          v.playbackRate = escolhida;
          // Retoma de onde parou (se não estava quase no fim).
          if (aula.posicaoSegundos > 5 && aula.posicaoSegundos < v.duration - 5) v.currentTime = aula.posicaoSegundos;
        }}
        onPause={() => salvar()}
        onPlay={() => setContagem(null)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (!avisou90.current && v.duration && v.currentTime / v.duration >= 0.9) {
            avisou90.current = true;
            aoChegarEm90();
          }
        }}
        onEnded={() => {
          salvar();
          if (hrefProxima) setContagem(ESPERA_PROXIMA);
        }}
      >
        {aula.video.legenda && <track kind="captions" src={aula.video.legenda} srcLang="pt-BR" label="Português" />}
      </video>

      {contagem !== null && hrefProxima && (
        <div className="video__proxima" role="status">
          <p className="video__proxima-rotulo">Próxima aula em {contagem} s</p>
          <p className="video__proxima-titulo">{aula.proximaTitulo}</p>
          <div className="video__proxima-acoes">
            <Link href={hrefProxima} className="botao botao--principal botao--pequeno">
              Ir agora
            </Link>
            <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => setContagem(null)}>
              Ficar nesta aula
            </button>
          </div>
        </div>
      )}

      <div className="video__barra">
        <label className="video__velocidade">
          <span>Velocidade</span>
          <select value={velocidade} onChange={(e) => trocarVelocidade(Number(e.target.value))} className="seletor">
            {VELOCIDADES.map((v) => (
              <option key={v} value={v}>
                {String(v).replace(".", ",")}×
              </option>
            ))}
          </select>
        </label>
        <details className="video__atalhos">
          <summary>Atalhos de teclado</summary>
          <dl>
            <dt>Espaço ou K</dt>
            <dd>Tocar e pausar</dd>
            <dt>← e →</dt>
            <dd>Voltar e avançar 5 s</dd>
            <dt>J e L</dt>
            <dd>Voltar e avançar 10 s</dd>
            <dt>F</dt>
            <dd>Tela cheia</dd>
            <dt>M</dt>
            <dd>Sem som</dd>
            <dt>C</dt>
            <dd>Legendas</dd>
          </dl>
        </details>
      </div>
    </div>
  );
}
