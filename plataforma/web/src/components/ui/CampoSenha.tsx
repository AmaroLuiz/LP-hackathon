"use client";

import { useState, type ComponentProps } from "react";
import { Campo } from "./Campo";

type Props = Omit<ComponentProps<typeof Campo>, "type" | "acessorio" | "abaixo"> & {
  /** Mostra o medidor de força (só na criação de senha). */
  medidor?: boolean;
};

/** Pontua de 0 a 3: tamanho e variedade de caracteres. É uma ajuda, não uma regra. */
function forca(senha: string): 0 | 1 | 2 | 3 {
  if (senha.length < 10) return 0;
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (senha.length >= 16 && tipos >= 2) return 3;
  if (senha.length >= 12 || tipos >= 3) return 2;
  return 1;
}

const ROTULOS = ["Curta demais", "Fraca", "Razoável", "Forte"] as const;

export function CampoSenha({ medidor, value, ...props }: Props) {
  const [visivel, setVisivel] = useState(false);
  const texto = typeof value === "string" ? value : "";
  const nivel = forca(texto);

  return (
    <Campo
      {...props}
      value={value}
      type={visivel ? "text" : "password"}
      acessorio={
        <button
          type="button"
          className="campo__acessorio"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
          aria-controls={props.id}
        >
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      }
      abaixo={
        medidor && texto.length > 0 ? (
          <div className="forca" data-nivel={nivel}>
            <span className="forca__barras" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="forca__texto" aria-live="polite">
              Senha: {ROTULOS[nivel].toLowerCase()}
            </span>
          </div>
        ) : null
      }
    />
  );
}
