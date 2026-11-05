import type { ReactNode } from "react";

/**
 * Moldura das telas de conta: à esquerda (no desktop) um painel carvão com a
 * frase da marca; à direita, o formulário no creme, numa coluna estreita.
 */
export function MolduraConta({
  titulo,
  apoio,
  painel,
  children,
}: {
  titulo: string;
  apoio?: ReactNode;
  /** Frase do painel lateral. */
  painel?: string;
  children: ReactNode;
}) {
  return (
    <div className="moldura-conta">
      <div className="moldura-conta__painel" data-chao="preto" aria-hidden="true">
        <p className="moldura-conta__frase">
          {painel ?? "Vídeos, artes e carrosséis com IA, no ritmo do seu negócio."}
          <span className="moldura-conta__expoente" />
        </p>
      </div>
      <section className="moldura-conta__conteudo" data-chao="papel" aria-labelledby="conta-titulo">
        <div className="moldura-conta__coluna">
          <h1 id="conta-titulo" className="moldura-conta__titulo">
            {titulo}
          </h1>
          {apoio && <div className="moldura-conta__apoio">{apoio}</div>}
          {children}
        </div>
      </section>
    </div>
  );
}
