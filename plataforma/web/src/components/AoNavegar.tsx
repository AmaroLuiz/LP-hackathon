"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";

function Observador({ aoMudar }: { aoMudar: () => void }) {
  const caminho = usePathname();
  useEffect(() => {
    aoMudar();
  }, [caminho, aoMudar]);
  return null;
}

/**
 * Chama `aoMudar` a cada troca de página (e na primeira montagem). Fica num
 * <Suspense> próprio: o caminho só existe no navegador e, lido direto num
 * layout, travaria a pré-renderização das páginas. Passe uma função estável
 * (useCallback), senão ela roda a cada renderização.
 */
export function AoNavegar({ aoMudar }: { aoMudar: () => void }) {
  return (
    <Suspense fallback={null}>
      <Observador aoMudar={aoMudar} />
    </Suspense>
  );
}
