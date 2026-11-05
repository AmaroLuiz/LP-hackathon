"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Icone } from "./Icone";

// Aviso flutuante (toast): confirma uma ação sem tirar a pessoa do lugar.
// Anunciado por leitores de tela (aria-live); some sozinho em 6 s, ou no X.
// Erro que precisa de atenção fica no próprio formulário (<Aviso tipo="erro">).

type Tipo = "sucesso" | "info" | "erro";
type Item = { id: number; texto: string; tipo: Tipo };

const Contexto = createContext<{ avisar: (texto: string, tipo?: Tipo) => void }>({ avisar: () => {} });

export function useAvisos() {
  return use(Contexto);
}

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const proximo = useRef(1);

  const fechar = useCallback((id: number) => setItens((atuais) => atuais.filter((i) => i.id !== id)), []);

  const avisar = useCallback(
    (texto: string, tipo: Tipo = "sucesso") => {
      const id = proximo.current++;
      setItens((atuais) => [...atuais.slice(-2), { id, texto, tipo }]);
      window.setTimeout(() => fechar(id), 6000);
    },
    [fechar],
  );

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Contexto value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite" aria-atomic="false">
        {itens.map((i) => (
          <div key={i.id} className={`aviso-flutuante aviso-flutuante--${i.tipo}`}>
            <span className="aviso-flutuante__marca" aria-hidden="true" />
            <p className="aviso-flutuante__texto">{i.texto}</p>
            <button type="button" className="aviso-flutuante__fechar" onClick={() => fechar(i.id)}>
              <Icone nome="fechar" tamanho={16} />
              <span className="sr-only">Fechar aviso</span>
            </button>
          </div>
        ))}
      </div>
    </Contexto>
  );
}
