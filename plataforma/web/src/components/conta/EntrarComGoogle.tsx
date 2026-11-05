"use client";

import { useSearchParams } from "next/navigation";
import { Aviso } from "@/components/ui/Exibicao";
import { destinoSeguro } from "@/lib/cliente";

const ERROS: Record<string, string> = {
  google: "Não deu para entrar com o Google. Tente de novo ou use e-mail e senha.",
  "google-bloqueado": "O Google não confirmou este e-mail, ou a conta está bloqueada. Entre com e-mail e senha ou fale com o suporte.",
};

/**
 * "Continuar com o Google": navegação de página inteira para a API, que leva
 * ao Google e volta já com a sessão aberta. Só aparece quando a API diz que o
 * login com Google está configurado.
 */
export function EntrarComGoogle({ cadastro }: { cadastro?: boolean }) {
  const parametros = useSearchParams();
  const voltar = destinoSeguro(parametros.get("voltar"), cadastro ? "/boas-vindas" : "/");
  const erro = parametros.get("erro");
  return (
    <div className="entrar-google">
      {erro && ERROS[erro] && <Aviso tipo="erro" titulo={ERROS[erro]} />}
      {/* Link comum (não <Link>): a ida e a volta passam pelo Google, fora do site. */}
      <a href={`/api/auth/google?voltar=${encodeURIComponent(voltar)}`} className="botao botao--secundario botao--largo entrar-google__botao">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
        </svg>
        Continuar com o Google
      </a>
      {cadastro && (
        <p className="campo__ajuda">
          Ao continuar com o Google, você aceita os{" "}
          <a href="/termos" className="link link--sublinhado">
            Termos de uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" className="link link--sublinhado">
            Política de privacidade
          </a>
          .
        </p>
      )}
      <p className="entrar-google__ou">
        <span>ou com e-mail</span>
      </p>
    </div>
  );
}
