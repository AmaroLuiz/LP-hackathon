"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { AoNavegar } from "@/components/AoNavegar";
import { enviar } from "@/lib/cliente";

// O que é pessoal nos cards (coração da lista de desejos e barra de progresso)
// vem daqui, numa chamada só, depois que a página pública já apareceu. Assim os
// cards continuam em cache para todo mundo.

type Estado = {
  /** null enquanto carrega; false para visitante. */
  logado: boolean | null;
  desejos: Set<number>;
  progresso: Record<number, number>;
  alternarDesejo: (cursoId: number, slug: string) => Promise<void>;
};

const Contexto = createContext<Estado>({
  logado: null,
  desejos: new Set(),
  progresso: {},
  alternarDesejo: async () => {},
});

export function useAluno() {
  return use(Contexto);
}

export function ProvedorAluno({ children }: { children: ReactNode }) {
  const [logado, setLogado] = useState<boolean | null>(null);
  const [desejos, setDesejos] = useState<Set<number>>(new Set());
  const [progresso, setProgresso] = useState<Record<number, number>>({});
  const router = useRouter();

  // Recarrega ao navegar: entrar, sair ou concluir aula muda o resumo.
  const recarregar = useCallback(() => {
    fetch("/api/me/resumo", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) {
          setLogado(false);
          return;
        }
        const dados = (await r.json()) as { desejos: number[]; progresso: Record<number, number> };
        setLogado(true);
        setDesejos(new Set(dados.desejos));
        setProgresso(dados.progresso);
      })
      .catch(() => setLogado(false));
  }, []);

  const alternarDesejo = useCallback(
    async (cursoId: number, slug: string) => {
      if (!logado) {
        router.push(`/entrar?voltar=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const tinha = desejos.has(cursoId);
      const proximo = new Set(desejos);
      if (tinha) proximo.delete(cursoId);
      else proximo.add(cursoId);
      setDesejos(proximo); // otimista: volta atrás se a API recusar
      const r = await enviar(`/api/me/lista-desejos/${slug}`, null, tinha ? "DELETE" : "PUT");
      if (!r.ok) setDesejos(desejos);
    },
    [logado, desejos, router],
  );

  const valor = useMemo(() => ({ logado, desejos, progresso, alternarDesejo }), [logado, desejos, progresso, alternarDesejo]);
  return (
    <Contexto value={valor}>
      <AoNavegar aoMudar={recarregar} />
      {children}
    </Contexto>
  );
}
