import { Fragment, type ReactNode } from "react";

// Markdown mínimo e seguro para as descrições dos cursos: parágrafos, listas
// com "- " e **negrito**. Nada de HTML cru: o texto passa pelo React, que escapa tudo.

function inline(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**") ? <strong key={i}>{parte.slice(2, -2)}</strong> : <Fragment key={i}>{parte}</Fragment>,
  );
}

export function TextoMarkdown({ texto }: { texto: string }) {
  const blocos = texto.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="texto-rico">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split("\n");
        if (linhas.every((l) => /^[-*] /.test(l.trim()))) {
          return (
            <ul key={i} className="lista-marcada">
              {linhas.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(linhas.join(" "))}</p>;
      })}
    </div>
  );
}
