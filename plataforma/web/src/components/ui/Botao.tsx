import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "principal" | "secundario" | "fantasma" | "perigo";

type Comum = {
  variante?: Variante;
  pequeno?: boolean;
  /** Ocupa a largura toda (formulários no celular). */
  largo?: boolean;
  children: ReactNode;
};

function classes({ variante = "principal", pequeno, largo }: Omit<Comum, "children">, extra?: string) {
  return ["botao", `botao--${variante}`, pequeno && "botao--pequeno", largo && "botao--largo", extra]
    .filter(Boolean)
    .join(" ");
}

/**
 * Botão da marca. O principal leva o expoente dourado (o "²" de PotencIA);
 * use no máximo um principal por bloco.
 */
export function Botao({
  variante,
  pequeno,
  largo,
  carregando,
  textoCarregando,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: Comum & ComponentProps<"button"> & { carregando?: boolean; textoCarregando?: string }) {
  return (
    <button
      type={type}
      className={classes({ variante, pequeno, largo }, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando ? (
        <>
          <span className="botao__giro" aria-hidden="true" />
          {textoCarregando ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function BotaoLink({
  variante,
  pequeno,
  largo,
  children,
  className,
  ...props
}: Comum & ComponentProps<typeof Link>) {
  return (
    <Link className={classes({ variante, pequeno, largo }, className)} {...props}>
      {children}
    </Link>
  );
}
