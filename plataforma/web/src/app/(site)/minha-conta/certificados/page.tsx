import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoVazio, Esqueleto } from "@/components/ui/Exibicao";
import { Icone } from "@/components/ui/Icone";
import type { Certificado } from "@/lib/aprender";
import { cargaHoraria, dataPorExtenso } from "@/lib/formato";
import { buscarComSessao, exigirUsuario } from "@/lib/sessao";

export const metadata: Metadata = { title: "Certificados", robots: { index: false } };

async function Conteudo() {
  await exigirUsuario("/minha-conta/certificados");
  const certificados = await buscarComSessao<Certificado[]>("/api/me/certificados");
  if (!certificados.length) {
    return (
      <EstadoVazio titulo="Nenhum certificado ainda." acao={<BotaoLink href="/minha-conta/cursos">Ver meus cursos</BotaoLink>}>
        Ao concluir todas as aulas de um curso, o certificado aparece aqui, com um link público para validação.
      </EstadoVazio>
    );
  }
  return (
    <ul className="certificados">
      {certificados.map((c) => (
        <li key={c.codigo} className="certificado-item">
          <Icone nome="certificado" tamanho={28} />
          <div>
            <p className="certificado-item__curso">{c.tituloCurso}</p>
            <p className="certificado-item__meta">
              {dataPorExtenso(c.emitidoEm)} · {cargaHoraria(c.cargaHorariaMinutos)} · <code>{c.codigo}</code>
            </p>
          </div>
          <Link href={`/certificados/${c.codigo}`} className="botao botao--secundario botao--pequeno">
            Abrir
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function MeusCertificados() {
  return (
    <section className="secao" data-chao="papel" aria-labelledby="certificados-titulo">
      <header className="topo topo--compacto">
        <p className="olho">Área do aluno</p>
        <h1 id="certificados-titulo" className="titulo">
          Certificados
        </h1>
      </header>
      <Suspense fallback={<Esqueleto altura="10rem" />}>
        <Conteudo />
      </Suspense>
    </section>
  );
}
