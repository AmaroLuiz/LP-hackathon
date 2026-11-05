"use client";

import { useRef, useState } from "react";
import { enviar, type Resultado } from "@/lib/cliente";

/**
 * Estado comum dos formulários de conta: envio, erros por campo, mensagem geral
 * e foco no primeiro campo com erro (ou no aviso), para quem usa teclado ou leitor de tela.
 */
export function useFormulario() {
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  async function submeter<T>(caminho: string, corpo: unknown, metodo: "POST" | "PUT" | "PATCH" = "POST"): Promise<Resultado<T>> {
    setEnviando(true);
    setErros({});
    setMensagem(null);
    const resultado = await enviar<T>(caminho, corpo, metodo);
    setEnviando(false);
    if (!resultado.ok) {
      const temCampos = Object.keys(resultado.campos).length > 0;
      setErros(resultado.campos);
      // Erro de campo já aparece no campo; a mensagem geral só quando não há campo.
      setMensagem(temCampos ? null : resultado.mensagem);
      requestAnimationFrame(() => {
        const alvo = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
        alvo?.focus();
      });
    }
    return resultado;
  }

  /** Ao editar um campo, o erro dele some (o usuário já está corrigindo). */
  function limparErro(campo: string) {
    setErros((atuais) => {
      if (!(campo in atuais)) return atuais;
      return Object.fromEntries(Object.entries(atuais).filter(([nome]) => nome !== campo));
    });
  }

  return { enviando, erros, mensagem, formulario, submeter, setMensagem, limparErro };
}
