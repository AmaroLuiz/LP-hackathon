"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Aviso, BarraProgresso } from "@/components/ui/Exibicao";
import { enviarArquivo, recortar, type TipoEnvio } from "@/lib/envio";

type Props = {
  tipo: Extract<TipoEnvio, "CAPA" | "FOTO">;
  /** Largura ÷ altura do recorte (16/9 na capa, 1 na foto). */
  proporcao: number;
  saida: { largura: number; altura: number };
  rotulo: string;
  aoEnviar: (url: string) => void;
};

type Estado = { imagem: HTMLImageElement; url: string; nome: string; zoom: number; cx: number; cy: number };

const PASSO_TECLADO = 24;

/**
 * Escolher imagem → enquadrar (arrastar para mover, controle de zoom; setas e
 * +/− no teclado) → enviar. O recorte sai no tamanho final, em WebP.
 */
export function EnvioImagem({ tipo, proporcao, saida, rotulo, aoEnviar }: Props) {
  const id = useId();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [largura, setLargura] = useState(0);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const janela = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = janela.current;
    if (!el) return;
    const observador = new ResizeObserver(() => setLargura(el.clientWidth));
    observador.observe(el);
    setLargura(el.clientWidth);
    return () => observador.disconnect();
  }, [estado?.url]);

  // Libera a imagem da memória ao trocar de imagem ou sair.
  const urlAtual = estado?.url;
  useEffect(() => () => {
    if (urlAtual) URL.revokeObjectURL(urlAtual);
  }, [urlAtual]);

  const altura = largura / proporcao;
  const escalaBase = estado ? Math.max(largura / estado.imagem.naturalWidth, altura / estado.imagem.naturalHeight) : 1;
  const escala = escalaBase * (estado?.zoom ?? 1);

  /** Mantém o recorte dentro da imagem. */
  function limitar(e: Estado, zoom = e.zoom, cx = e.cx, cy = e.cy): Estado {
    const s = escalaBase * zoom;
    const meiaL = largura / (2 * s);
    const meiaA = altura / (2 * s);
    return {
      ...e,
      zoom,
      cx: Math.min(Math.max(cx, meiaL), e.imagem.naturalWidth - meiaL),
      cy: Math.min(Math.max(cy, meiaA), e.imagem.naturalHeight - meiaA),
    };
  }

  function escolher(arquivo: File | undefined) {
    setErro(null);
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      setErro("Escolha uma foto em JPEG, PNG ou WebP.");
      return;
    }
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () =>
      setEstado({ imagem, url, nome: arquivo.name, zoom: 1, cx: imagem.naturalWidth / 2, cy: imagem.naturalHeight / 2 });
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      setErro("Não foi possível abrir esta imagem.");
    };
    imagem.src = url;
  }

  async function enviar() {
    if (!estado) return;
    const s = escala;
    const recorte = {
      x: estado.cx - largura / (2 * s),
      y: estado.cy - altura / (2 * s),
      largura: largura / s,
      altura: altura / s,
    };
    setErro(null);
    setProgresso(0);
    try {
      const arquivo = await recortar(estado.imagem, recorte, saida.largura, saida.altura);
      const r = await enviarArquivo(tipo, arquivo, estado.nome.replace(/\.[^.]+$/, "") + "." + arquivo.name.split(".").pop(), setProgresso);
      setProgresso(null);
      if (!r.ok) {
        setErro(r.mensagem);
        return;
      }
      aoEnviar(r.dados.url ?? r.dados.referencia);
      setEstado(null);
    } catch (e) {
      setProgresso(null);
      setErro(e instanceof Error ? e.message : "Não foi possível preparar a imagem.");
    }
  }

  const pequena = estado && largura > 0 && largura / escala < saida.largura / 2;

  return (
    <div className="envio-imagem">
      {!estado ? (
        <div className="campo">
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only envio-entrada"
            onChange={(e) => {
              escolher(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <label className="botao botao--secundario envio-imagem__escolher" htmlFor={id}>
            {rotulo}
          </label>
          <p className="campo__ajuda">JPEG, PNG ou WebP de até 5 MB. Você enquadra antes de enviar.</p>
        </div>
      ) : (
        <div className="recorte">
          <div
            ref={janela}
            className="recorte__janela"
            style={{ aspectRatio: String(proporcao) }}
            role="application"
            aria-roledescription="área de recorte"
            aria-label="Enquadramento. Use as setas para mover e + ou − para aproximar."
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              arraste.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!arraste.current) return;
              const dx = e.clientX - arraste.current.x;
              const dy = e.clientY - arraste.current.y;
              arraste.current = { x: e.clientX, y: e.clientY };
              setEstado((atual) => atual && limitar(atual, atual.zoom, atual.cx - dx / escala, atual.cy - dy / escala));
            }}
            onPointerUp={() => {
              arraste.current = null;
            }}
            onKeyDown={(e) => {
              const passo = PASSO_TECLADO / escala;
              const mudanca: Record<string, [number, number, number]> = {
                ArrowLeft: [-passo, 0, 0],
                ArrowRight: [passo, 0, 0],
                ArrowUp: [0, -passo, 0],
                ArrowDown: [0, passo, 0],
                "+": [0, 0, 0.1],
                "=": [0, 0, 0.1],
                "-": [0, 0, -0.1],
              };
              const m = mudanca[e.key];
              if (!m) return;
              e.preventDefault();
              setEstado((atual) => atual && limitar(atual, Math.min(3, Math.max(1, atual.zoom + m[2])), atual.cx + m[0], atual.cy + m[1]));
            }}
          >
            {largura > 0 && (
              // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob) só para enquadrar
              <img
                src={estado.url}
                alt=""
                draggable={false}
                className="recorte__imagem"
                style={{
                  width: estado.imagem.naturalWidth * escala,
                  height: estado.imagem.naturalHeight * escala,
                  left: largura / 2 - estado.cx * escala,
                  top: altura / 2 - estado.cy * escala,
                }}
              />
            )}
          </div>
          <div className="recorte__controles">
            <label htmlFor={`${id}-zoom`} className="campo__rotulo">
              Aproximar
            </label>
            <input
              id={`${id}-zoom`}
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={estado.zoom}
              onChange={(e) => setEstado((atual) => atual && limitar(atual, Number(e.target.value)))}
            />
          </div>
          {pequena && <p className="campo__ajuda">A imagem é pequena para este tamanho e pode ficar sem nitidez.</p>}
          {progresso !== null && <BarraProgresso valor={progresso * 100} rotulo="Envio da imagem" />}
          <div className="acoes acoes--compactas">
            <Botao pequeno onClick={enviar} carregando={progresso !== null} textoCarregando="Enviando…">
              Usar este recorte
            </Botao>
            <Botao pequeno variante="secundario" disabled={progresso !== null} onClick={() => setEstado(null)}>
              Escolher outra
            </Botao>
          </div>
        </div>
      )}
      {erro && <Aviso tipo="erro" titulo={erro} />}
    </div>
  );
}
