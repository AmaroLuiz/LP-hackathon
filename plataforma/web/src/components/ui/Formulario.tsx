import type { ComponentProps, ReactNode } from "react";

// Campos que faltavam no inventário: área de texto, seleção, alternador e
// grupo de rádios. Mesmas regras do <Campo>: rótulo sempre visível, erro e
// ajuda ligados por aria-describedby.

function descritores(id: string, erro?: string, ajuda?: ReactNode) {
  return [erro ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null].filter(Boolean).join(" ") || undefined;
}

function Rodape({ id, erro, ajuda }: { id: string; erro?: string; ajuda?: ReactNode }) {
  return (
    <>
      {erro && (
        <p className="campo__erro" id={`${id}-erro`}>
          {erro}
        </p>
      )}
      {ajuda && (
        <p className="campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </p>
      )}
    </>
  );
}

type Base = { id: string; rotulo: string; ajuda?: ReactNode; erro?: string };

export function AreaTexto({ id, rotulo, ajuda, erro, className, ...props }: Base & ComponentProps<"textarea">) {
  return (
    <div className={["campo", erro && "campo--erro", className].filter(Boolean).join(" ")}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
        {props.required && <span className="campo__obrigatorio"> (obrigatório)</span>}
      </label>
      <textarea
        id={id}
        className="campo__entrada campo__area"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, erro, ajuda)}
        {...props}
      />
      <Rodape id={id} erro={erro} ajuda={ajuda} />
    </div>
  );
}

export function Selecao({ id, rotulo, ajuda, erro, className, children, ...props }: Base & ComponentProps<"select">) {
  return (
    <div className={["campo", erro && "campo--erro", className].filter(Boolean).join(" ")}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <select
        id={id}
        className="seletor seletor--largo"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, erro, ajuda)}
        {...props}
      >
        {children}
      </select>
      <Rodape id={id} erro={erro} ajuda={ajuda} />
    </div>
  );
}

/** Liga/desliga (role="switch"): para escolhas que valem na hora, como "Prévia grátis". */
export function Alternador({
  id,
  rotulo,
  ajuda,
  ligado,
  aoMudar,
  disabled,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="alternador">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className="alternador__botao"
        disabled={disabled}
        onClick={() => aoMudar(!ligado)}
      >
        <span className="alternador__trilho" aria-hidden="true">
          <span className="alternador__pino" />
        </span>
        <span className="alternador__rotulo">{rotulo}</span>
      </button>
      {ajuda && (
        <p className="campo__ajuda alternador__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </p>
      )}
    </div>
  );
}

export function GrupoRadio<T extends string>({
  nome,
  legenda,
  opcoes,
  valor,
  aoMudar,
}: {
  nome: string;
  legenda: string;
  opcoes: readonly (readonly [T, string])[];
  valor: T;
  aoMudar: (valor: T) => void;
}) {
  return (
    <fieldset className="grupo-radio">
      <legend className="campo__rotulo">{legenda}</legend>
      <div className="grupo-radio__opcoes">
        {opcoes.map(([v, texto]) => (
          <label key={v} className="grupo-radio__opcao">
            <input type="radio" name={nome} value={v} checked={valor === v} onChange={() => aoMudar(v)} />
            {texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
