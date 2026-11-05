import type { Metadata } from "next";
import { Suspense } from "react";
import { MolduraConta } from "@/components/conta/MolduraConta";
import { VerificarEmail } from "@/components/conta/VerificarEmail";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false } };

export default function PaginaVerificarEmail() {
  return (
    <MolduraConta titulo="Confirmar e-mail">
      <Suspense>
        <VerificarEmail />
      </Suspense>
    </MolduraConta>
  );
}
