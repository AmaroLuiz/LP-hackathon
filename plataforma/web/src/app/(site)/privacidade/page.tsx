import type { Metadata } from "next";
import { Aviso } from "@/components/ui/Exibicao";

export const metadata: Metadata = { title: "Política de privacidade" };

// Página provisória: a política final (LGPD) depende de revisão jurídica.
export default function Privacidade() {
  return (
    <section className="secao" data-chao="papel" aria-labelledby="privacidade-titulo">
      <header className="topo topo--compacto">
        <h1 id="privacidade-titulo" className="titulo">
          Política de privacidade
        </h1>
      </header>
      <div className="texto-legal">
        <Aviso tipo="info" titulo="Versão final em preparação.">
          A política de privacidade, conforme a LGPD, está em revisão e será publicada aqui antes do lançamento. Hoje a
          PotencIA guarda só o necessário para a sua conta: nome, e-mail e senha (cifrada), além do aceite de e-mails de
          novidades, que é opcional.
        </Aviso>
      </div>
    </section>
  );
}
