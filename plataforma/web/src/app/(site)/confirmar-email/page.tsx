import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmarEmailNovo } from "@/components/conta/ConfirmarEmailNovo";
import { MolduraConta } from "@/components/conta/MolduraConta";

export const metadata: Metadata = { title: "Confirmar novo e-mail", robots: { index: false } };

export default function PaginaConfirmarEmail() {
  return (
    <MolduraConta titulo="Confirmar novo e-mail">
      <Suspense>
        <ConfirmarEmailNovo />
      </Suspense>
    </MolduraConta>
  );
}
