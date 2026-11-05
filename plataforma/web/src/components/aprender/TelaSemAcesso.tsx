import Link from "next/link";
import { BotaoLink } from "@/components/ui/Botao";
import { Marca } from "@/components/Cabecalho";

const TEXTOS: Record<string, { titulo: string; texto: string; acao: { rotulo: string; href: (slug: string) => string } }> = {
  EMAIL_NAO_VERIFICADO: {
    titulo: "Confirme seu e-mail para assistir.",
    texto: "Mandamos um link para o seu e-mail quando você criou a conta. Não achou? Peça outro na sua conta.",
    acao: { rotulo: "Ir para minha conta", href: () => "/minha-conta" },
  },
  SEM_ACESSO: {
    titulo: "Este curso faz parte de um plano.",
    texto: "Assine um plano que inclua o curso e ele abre aqui mesmo, com todas as aulas.",
    acao: { rotulo: "Ver os planos", href: (slug) => `/planos?curso=${slug}` },
  },
  SEM_AULAS: {
    titulo: "As aulas ainda estão sendo gravadas.",
    texto: "Assim que a primeira aula ficar pronta, ela aparece aqui.",
    acao: { rotulo: "Voltar ao curso", href: (slug) => `/cursos/${slug}` },
  },
};

/** O que mostrar quando o aluno abre o player sem poder assistir. */
export function TelaSemAcesso({ slug, codigo, mensagem }: { slug: string; codigo: string | null; mensagem: string }) {
  const t = TEXTOS[codigo ?? ""] ?? {
    titulo: mensagem || "Não foi possível abrir esta aula.",
    texto: "Volte para a página do curso e tente de novo.",
    acao: { rotulo: "Voltar ao curso", href: (s: string) => `/cursos/${s}` },
  };
  return (
    <div className="sem-acesso">
      <header className="sem-acesso__topo">
        <Marca />
      </header>
      <main id="conteudo" className="sem-acesso__corpo">
        <h1 className="titulo">{t.titulo}</h1>
        <p className="topo__apoio">{t.texto}</p>
        <div className="acoes">
          <BotaoLink href={t.acao.href(slug)}>{t.acao.rotulo}</BotaoLink>
          <Link href={`/cursos/${slug}`} className="link link--sublinhado">
            Página do curso
          </Link>
        </div>
      </main>
    </div>
  );
}
