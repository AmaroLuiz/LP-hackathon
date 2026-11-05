import type { Metadata } from "next";
import { Aviso } from "@/components/ui/Exibicao";

export const metadata: Metadata = { title: "Termos de uso" };

// Página provisória: o texto final dos termos depende de revisão jurídica.
export default function Termos() {
  return (
    <section className="secao" data-chao="papel" aria-labelledby="termos-titulo">
      <header className="topo topo--compacto">
        <h1 id="termos-titulo" className="titulo">
          Termos de uso
        </h1>
      </header>
      <div className="texto-legal">
        <Aviso tipo="info" titulo="Versão final em preparação.">
          Os termos de uso da PotencIA estão em revisão e serão publicados aqui antes do lançamento. Dúvidas: fale com a
          equipe pelo e-mail de contato do rodapé.
        </Aviso>
      </div>
    </section>
  );
}
