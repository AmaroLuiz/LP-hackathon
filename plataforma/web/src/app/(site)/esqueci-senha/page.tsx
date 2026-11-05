import type { Metadata } from "next";
import { FormEsqueciSenha } from "@/components/conta/FormEsqueciSenha";
import { MolduraConta } from "@/components/conta/MolduraConta";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default function EsqueciSenha() {
  return (
    <MolduraConta titulo="Esqueceu a senha?" apoio="Informe o e-mail da conta. Enviamos um link para você criar uma senha nova.">
      <FormEsqueciSenha />
    </MolduraConta>
  );
}
