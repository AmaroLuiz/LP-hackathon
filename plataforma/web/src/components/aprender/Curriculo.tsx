"use client";

import Link from "next/link";
import { Icone } from "@/components/ui/Icone";
import { duracao } from "@/lib/formato";
import type { PainelCurso } from "@/lib/aprender";

/**
 * Currículo lateral do player: módulos em acordeão, aulas com a marca de
 * concluída (sálvia) e a aula atual com o expoente dourado.
 */
export function Curriculo({
  painel,
  atual,
  concluidas,
  aoAlternar,
}: {
  painel: PainelCurso;
  atual: number;
  concluidas: Set<number>;
  aoAlternar: (aulaId: number, concluida: boolean) => void;
}) {
  return (
    <nav className="curriculo" aria-label="Aulas do curso">
      {painel.modulos.map((m, i) => {
        const feitas = m.aulas.filter((a) => concluidas.has(a.id)).length;
        const temAtual = m.aulas.some((a) => a.id === atual);
        return (
          <details key={m.titulo + i} className="curriculo__modulo" open={temAtual || undefined}>
            <summary className="curriculo__cabeca">
              <span className="curriculo__titulo">
                <span className="curriculo__ordem">Módulo {i + 1}</span>
                {m.titulo}
              </span>
              <span className="curriculo__contagem">
                {feitas}/{m.aulas.length}
              </span>
            </summary>
            <ol className="curriculo__aulas">
              {m.aulas.map((a) => {
                const feita = concluidas.has(a.id);
                const eAtual = a.id === atual;
                return (
                  <li key={a.id} className={`curriculo__aula${eAtual ? " is-atual" : ""}`}>
                    <input
                      type="checkbox"
                      className="curriculo__marca"
                      checked={feita}
                      onChange={(e) => aoAlternar(a.id, e.target.checked)}
                      aria-label={`${feita ? "Desmarcar" : "Marcar"} “${a.titulo}” como concluída`}
                    />
                    <Link
                      href={`/aprender/${painel.slug}/${a.id}`}
                      className="curriculo__link"
                      aria-current={eAtual ? "page" : undefined}
                    >
                      <span className="curriculo__nome">{a.titulo}</span>
                      <span className="curriculo__meta">
                        <Icone nome={a.tipo === "VIDEO" ? "play" : "texto"} tamanho={12} />
                        {a.duracaoSegundos ? duracao(a.duracaoSegundos) : a.tipo === "VIDEO" ? "Vídeo" : "Leitura"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </details>
        );
      })}
    </nav>
  );
}
