import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<"input"> & {
  id: string;
  rotulo: string;
  /** Texto de apoio abaixo do campo. */
  ajuda?: ReactNode;
  erro?: string;
  /** Elemento dentro do campo, à direita (ex.: mostrar senha). */
  acessorio?: ReactNode;
  /** Conteúdo logo abaixo do campo, antes da ajuda (ex.: medidor de força). */
  abaixo?: ReactNode;
};

/** Campo com rótulo sempre visível; erro e ajuda ligados por aria-describedby. */
export function Campo({ id, rotulo, ajuda, erro, acessorio, abaixo, className, ...input }: Props) {
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const descritores = [idErro, idAjuda].filter(Boolean).join(" ") || undefined;

  return (
    <div className={["campo", erro && "campo--erro", className].filter(Boolean).join(" ")}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
        {input.required && <span className="campo__obrigatorio"> (obrigatório)</span>}
      </label>
      <div className="campo__caixa">
        <input
          id={id}
          className="campo__entrada"
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          {...input}
        />
        {acessorio}
      </div>
      {abaixo}
      {erro && (
        <p className="campo__erro" id={idErro}>
          {erro}
        </p>
      )}
      {ajuda && (
        <p className="campo__ajuda" id={idAjuda}>
          {ajuda}
        </p>
      )}
    </div>
  );
}
