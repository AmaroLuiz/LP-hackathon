"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "@/lib/cliente";

export function BotaoSair({ className }: { className?: string }) {
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();

  async function sair() {
    setSaindo(true);
    await enviar("/api/auth/sair", {});
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={sair} disabled={saindo}>
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
