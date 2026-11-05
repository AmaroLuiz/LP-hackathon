import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { ProvedorAluno } from "@/components/aluno/ProvedorAluno";

/** Vitrine e conta: cabeçalho em pílula, rodapé e o contexto do aluno (desejos e progresso nos cards). */
export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorAluno>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo">{children}</main>
      <Rodape />
    </ProvedorAluno>
  );
}
