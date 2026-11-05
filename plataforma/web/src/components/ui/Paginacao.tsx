import Link from "next/link";
import { Icone } from "./Icone";

/**
 * Paginação por links (funciona sem JavaScript e mantém os filtros na URL).
 * Mostra a primeira, a última e as vizinhas da atual.
 */
export function Paginacao({
  pagina,
  total,
  tamanho,
  href,
  rotulo = "Páginas",
}: {
  pagina: number;
  total: number;
  tamanho: number;
  href: (pagina: number) => string;
  rotulo?: string;
}) {
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  if (paginas <= 1) return null;
  const visiveis = [...new Set([1, pagina - 1, pagina, pagina + 1, paginas])].filter((p) => p >= 1 && p <= paginas).sort((a, b) => a - b);

  return (
    <nav className="paginacao" aria-label={rotulo}>
      {pagina > 1 ? (
        <Link className="paginacao__seta" href={href(pagina - 1)} rel="prev">
          <Icone nome="esquerda" tamanho={16} />
          <span className="sr-only">Página anterior</span>
        </Link>
      ) : (
        <span className="paginacao__seta" aria-hidden="true" />
      )}
      <ol className="paginacao__lista">
        {visiveis.map((p, i) => (
          <li key={p}>
            {i > 0 && visiveis[i - 1] !== p - 1 && (
              <span className="paginacao__reticencias" aria-hidden="true">
                …
              </span>
            )}
            <Link className="paginacao__item" href={href(p)} aria-current={p === pagina ? "page" : undefined}>
              <span className="sr-only">Página </span>
              {p}
            </Link>
          </li>
        ))}
      </ol>
      {pagina < paginas ? (
        <Link className="paginacao__seta" href={href(pagina + 1)} rel="next">
          <Icone nome="direita" tamanho={16} />
          <span className="sr-only">Próxima página</span>
        </Link>
      ) : (
        <span className="paginacao__seta" aria-hidden="true" />
      )}
    </nav>
  );
}
