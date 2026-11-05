import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";

// Fica na raiz (vale para qualquer endereço), então traz o cabeçalho e o rodapé
// da vitrine por conta própria.
export default function NaoEncontrada() {
  return (
    <>
      <Cabecalho />
      <main id="conteudo">
        <section className="secao" data-chao="preto">
          <header className="topo">
            <p className="olho">Página não encontrada</p>
            <h1 className="titulo">Esta página não existe.</h1>
            <p className="topo__apoio">
              O endereço pode ter mudado.{" "}
              <Link href="/cursos" className="link link--sublinhado">
                Ver todos os cursos
              </Link>
            </p>
          </header>
        </section>
      </main>
      <Rodape />
    </>
  );
}
