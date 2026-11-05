import type React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { CHILLAX, MARCA, SERIFA } from "./fontes";

// Paleta fechada da série. Nenhuma outra cor entra nas capas.
export const COR = {
  chao: "#171E19",
  sombra: "#2A342D",
  creme: "#F6F1E7",
  ouro: "#F2B705",
  salvia: "#6B8F71",
} as const;

export const MARGEM = 56;

// Um trecho da frase: texto corrido, a palavra em serifa itálica ouro ou a palavra na caixa ouro.
export type Trecho = {
  readonly t: string;
  readonly estilo?: "serifa" | "caixa";
};

export type CapaProps = {
  readonly numero: number;
  readonly fantasma: string;
  readonly linhas: readonly (readonly Trecho[])[];
  readonly lado: "esquerda" | "direita";
  readonly ferramentas: string;
  readonly foto: string;
  // Objeto recortado (PNG com alfa, mesmo quadro da foto): passa por cima da palavra fantasma.
  readonly recorte?: string;
  // Enquadramento da foto: escala sobre o "cover" e deslocamento em % do quadro.
  readonly fotoEscala: number;
  readonly fotoX: number;
  readonly fotoY: number;
  // Curva do P&B: expoente > 1 aprofunda as sombras, ganho > 1 abre as altas.
  readonly contraste: number;
  readonly ganho: number;
  // Poça de luz sobre o objeto (centro e raio em % do quadro); fora dela a foto cai para o chão.
  readonly luzX: number;
  readonly luzY: number;
  readonly luzRaio: number;
  readonly queda: number;
  readonly fantasmaOpacidade: number;
  readonly fantasmaTamanho: number;
  readonly fantasmaX: number;
  readonly fantasmaY: number;
  readonly fraseTamanho: number;
  readonly fraseY: number;
  readonly sobreFoto?: React.ReactNode;
  readonly children?: React.ReactNode;
};

// Mistura o creme sobre o chão: a palavra fantasma é desenhada já com a cor final,
// em vez de opacidade, para o "lighten" deixar a parte iluminada do objeto passar por cima.
const misturar = (a: string, b: string, t: number) => {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t));
  return `rgb(${c.join(",")})`;
};

// P&B puxado para o verde-carvão: preto vira #171E19, branco vira #F6F1E7.
const Tratamento: React.FC<{ contraste: number; ganho: number }> = ({ contraste, ganho }) => {
  const canal = (de: number, ate: number) => ({ slope: (ate - de) / 255, intercept: de / 255 });
  const r = canal(0x17, 0xf6);
  const g = canal(0x1e, 0xf1);
  const b = canal(0x19, 0xe7);
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id="tratamento" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude={ganho} exponent={contraste} offset={0} />
          <feFuncG type="gamma" amplitude={ganho} exponent={contraste} offset={0} />
          <feFuncB type="gamma" amplitude={ganho} exponent={contraste} offset={0} />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="linear" {...r} />
          <feFuncG type="linear" {...g} />
          <feFuncB type="linear" {...b} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

// Granulação fina de filme por cima de tudo.
const Granulacao: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.1 }}
  >
    <filter id="grao" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grao)" />
  </svg>
);

const rotulo: React.CSSProperties = {
  position: "absolute",
  fontFamily: CHILLAX,
  fontWeight: 500,
  fontSize: 15,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: COR.creme,
  opacity: 0.78,
  lineHeight: 1,
};

export const Capa: React.FC<CapaProps> = ({
  numero,
  fantasma,
  linhas,
  lado,
  ferramentas,
  foto,
  recorte,
  fotoEscala,
  fotoX,
  fotoY,
  contraste,
  ganho,
  luzX,
  luzY,
  luzRaio,
  queda,
  fantasmaOpacidade,
  fantasmaTamanho,
  fantasmaX,
  fantasmaY,
  fraseTamanho,
  fraseY,
  sobreFoto,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const textoNaDireita = lado === "direita";
  // Luz lateral e dura: só o objeto fica iluminado, o resto (frase e rótulos) cai para o chão.
  const luz = `radial-gradient(${luzRaio}% ${luzRaio * 1.5}% at ${luzX}% ${luzY}%, rgba(23,30,25,0) 0%, rgba(23,30,25,0) 45%, rgba(23,30,25,${queda * 0.8}) 80%, rgba(23,30,25,${queda}) 100%)`;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.chao, overflow: "hidden" }}>
      <Tratamento contraste={contraste} ganho={ganho} />

      <AbsoluteFill style={{ filter: "url(#tratamento)" }}>
        <Img
          src={staticFile(foto)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: String(fotoEscala),
            translate: `${fotoX}% ${fotoY}%`,
          }}
        />
        {sobreFoto}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: luz }} />

      <div
        style={{
          position: "absolute",
          left: `${fantasmaX}%`,
          top: `${fantasmaY}%`,
          fontFamily: CHILLAX,
          fontWeight: 600,
          fontSize: fantasmaTamanho,
          lineHeight: 0.8,
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
          color: misturar(COR.chao, COR.creme, fantasmaOpacidade),
          mixBlendMode: "lighten",
        }}
      >
        {fantasma}
      </div>

      {recorte ? (
        // A camada inteira (objeto + luz) é recortada pelo alfa do PNG, para a luz não escurecer a palavra.
        // O PNG vem já em 16:9, então "cover" é o quadro inteiro e a máscara segue a mesma escala e deslocamento.
        <AbsoluteFill
          style={{
            maskImage: `url(${staticFile(recorte)})`,
            maskRepeat: "no-repeat",
            maskSize: `${width * fotoEscala}px ${height * fotoEscala}px`,
            maskPosition: `${((1 - fotoEscala) / 2 + fotoX / 100) * width}px ${((1 - fotoEscala) / 2 + fotoY / 100) * height}px`,
          }}
        >
          <AbsoluteFill style={{ filter: "url(#tratamento)" }}>
            <Img
              src={staticFile(recorte)}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                scale: String(fotoEscala),
                translate: `${fotoX}% ${fotoY}%`,
              }}
            />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: luz }} />
        </AbsoluteFill>
      ) : null}

      {children}

      <div
        style={{
          position: "absolute",
          top: `${fraseY}%`,
          translate: "0 -50%",
          ...(textoNaDireita ? { right: MARGEM } : { left: MARGEM }),
          textAlign: "left",
          fontFamily: CHILLAX,
          fontSize: fraseTamanho,
          lineHeight: 1.08,
          letterSpacing: "-0.015em",
          color: COR.creme,
        }}
      >
        {linhas.map((linha, i) => (
          <div key={i} style={{ fontWeight: i === 0 ? 400 : 600, whiteSpace: "nowrap" }}>
            {linha.map((trecho, j) => {
              if (trecho.estilo === "serifa") {
                return (
                  <span
                    key={j}
                    style={{
                      fontFamily: SERIFA,
                      fontStyle: "italic",
                      fontWeight: 400,
                      fontSize: "1.2em",
                      lineHeight: 0.9,
                      letterSpacing: "-0.01em",
                      color: COR.ouro,
                    }}
                  >
                    {trecho.t}
                  </span>
                );
              }
              if (trecho.estilo === "caixa") {
                return (
                  <span
                    key={j}
                    style={{
                      backgroundColor: COR.ouro,
                      color: COR.chao,
                      padding: "0 0.18em 0.04em",
                      margin: "0 0.04em",
                      boxDecorationBreak: "clone",
                    }}
                  >
                    {trecho.t}
                  </span>
                );
              }
              return <span key={j}>{trecho.t}</span>;
            })}
          </div>
        ))}
      </div>

      <div style={{ ...rotulo, top: MARGEM + 19, left: MARGEM, fontFamily: MARCA, fontWeight: 700, letterSpacing: "0.2em", fontSize: 16, opacity: 0.92 }}>
        POTENCIA
      </div>
      <div
        style={{
          position: "absolute",
          top: MARGEM,
          right: MARGEM,
          width: 56,
          height: 56,
          backgroundColor: COR.ouro,
          color: COR.chao,
          fontFamily: CHILLAX,
          fontWeight: 600,
          fontSize: 30,
          lineHeight: "56px",
          textAlign: "center",
        }}
      >
        {numero}
      </div>
      <div style={{ ...rotulo, bottom: MARGEM, left: MARGEM }}>{ferramentas}</div>
      <div style={{ ...rotulo, bottom: MARGEM, right: MARGEM }}>Trilha {numero}</div>

      <Granulacao />
    </AbsoluteFill>
  );
};
