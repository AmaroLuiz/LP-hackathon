import type { Metadata } from "next";
import { Suspense } from "react";
import { FormTrocarSenha } from "@/components/conta/FormTrocarSenha";
import { MolduraConta } from "@/components/conta/MolduraConta";
import { exigirUsuario } from "@/lib/sessao";

export const metadata: Metadata = { title: "Trocar senha", robots: { index: false } };

async function Conteudo() {
  await exigirUsuario("/minha-conta/senha", { senhaProvisoriaPermitida: true });
  return <FormTrocarSenha />;
}

export default function TrocarSenha() {
  return (
    <MolduraConta titulo="Trocar senha">
      <Suspense>
        <Conteudo />
      </Suspense>
    </MolduraConta>
  );
}
