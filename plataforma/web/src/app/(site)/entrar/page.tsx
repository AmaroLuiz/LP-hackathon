import type { Metadata } from "next";
import { Suspense } from "react";
import { FormEntrar } from "@/components/conta/FormEntrar";
import { EntrarComGoogle } from "@/components/conta/EntrarComGoogle";
import { MolduraConta } from "@/components/conta/MolduraConta";
import { provedoresDeLogin } from "@/lib/api";

async function Google() {
  const { google } = await provedoresDeLogin();
  return google ? <EntrarComGoogle /> : null;
}

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function Entrar() {
  return (
    <MolduraConta titulo="Entrar" apoio="Que bom ter você de volta.">
      <Suspense>
        <Google />
      </Suspense>
      <Suspense>
        <FormEntrar />
      </Suspense>
    </MolduraConta>
  );
}
