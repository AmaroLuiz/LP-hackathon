"use client";

import { useState } from "react";
import { enviar } from "@/lib/cliente";

/** Faixa abaixo do cabeçalho enquanto o e-mail não foi confirmado. */
export function AvisoVerificacao({ email }: { email: string }) {
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado" | "erro">("parado");
  const [erro, setErro] = useState("");

  async function reenviar() {
    setEstado("enviando");
    const r = await enviar("/api/me/reenviar-verificacao", {});
    if (r.ok) {
      setEstado("enviado");
    } else {
      setErro(r.mensagem);
      setEstado("erro");
    }
  }

  return (
    <div className="faixa-verificacao" role="status">
      <p>
        {estado === "enviado" ? (
          <>
            Enviamos um link novo para <strong>{email}</strong>.
          </>
        ) : estado === "erro" ? (
          erro
        ) : (
          <>
            Confirme seu e-mail para assistir às aulas. O link foi para <strong>{email}</strong>.
          </>
        )}
      </p>
      {estado !== "enviado" && (
        <button type="button" className="faixa-verificacao__botao" onClick={reenviar} disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando…" : "Reenviar link"}
        </button>
      )}
    </div>
  );
}
