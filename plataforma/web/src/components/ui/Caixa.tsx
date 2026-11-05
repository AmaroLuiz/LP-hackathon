import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<"input">, "type"> & { id: string; children: ReactNode; erro?: string };

/** Caixa de seleção com o texto como rótulo clicável (alvo de toque de 44 px). */
export function Caixa({ id, children, erro, className, ...input }: Props) {
  const idErro = erro ? `${id}-erro` : undefined;
  return (
    <div className={["caixa", erro && "caixa--erro", className].filter(Boolean).join(" ")}>
      <input
        id={id}
        type="checkbox"
        className="caixa__entrada"
        aria-invalid={erro ? true : undefined}
        aria-describedby={idErro}
        {...input}
      />
      <label htmlFor={id} className="caixa__rotulo">
        {children}
      </label>
      {erro && (
        <p className="campo__erro caixa__erro" id={idErro}>
          {erro}
        </p>
      )}
    </div>
  );
}
