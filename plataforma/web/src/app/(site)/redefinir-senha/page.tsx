import type { Metadata } from "next";
import { Suspense } from "react";
import { FormRedefinirSenha } from "@/components/conta/FormRedefinirSenha";
import { MolduraConta } from "@/components/conta/MolduraConta";

export const metadata: Metadata = { title: "Criar senha nova", robots: { index: false } };

export default function RedefinirSenha() {
  return (
    <MolduraConta titulo="Criar senha nova">
      <Suspense>
        <FormRedefinirSenha />
      </Suspense>
    </MolduraConta>
  );
}
