import type { Metadata } from "next";
import { Suspense } from "react";
import { FormCadastro } from "@/components/conta/FormCadastro";
import { EntrarComGoogle } from "@/components/conta/EntrarComGoogle";
import { MolduraConta } from "@/components/conta/MolduraConta";
import { provedoresDeLogin } from "@/lib/api";

async function Google() {
  const { google } = await provedoresDeLogin();
  return google ? <EntrarComGoogle cadastro /> : null;
}

export const metadata: Metadata = { title: "Criar conta" };

export default function Cadastro() {
  return (
    <MolduraConta
      titulo="Criar conta"
      apoio="Leva um minuto. Depois é só escolher o primeiro curso."
      painel="Sem termo técnico, sem medo de tecnologia. Um passo de cada vez."
    >
      <Suspense>
        <Google />
      </Suspense>
      <Suspense>
        <FormCadastro />
      </Suspense>
    </MolduraConta>
  );
}
