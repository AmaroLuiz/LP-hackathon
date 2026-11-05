"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Botao } from "./Botao";
import { Modal } from "./Modal";

type Pedido = {
  titulo: string;
  texto: ReactNode;
  /** Texto do botão que confirma ("Arquivar curso", "Rebaixar"). */
  confirmar: string;
  /** Ação destrutiva: botão vermelho. */
  perigo?: boolean;
};

/**
 * Pergunta antes de uma ação que não dá para desfazer com um clique. Uso:
 * `const { confirmar, dialogo } = useConfirmacao()`; renderize `{dialogo}` e
 * `if (await confirmar({...}))`. Cancelar fica à esquerda e recebe o foco.
 */
export function useConfirmacao() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const resolver = useRef<(sim: boolean) => void>(() => {});

  const confirmar = useCallback(
    (p: Pedido) =>
      new Promise<boolean>((r) => {
        resolver.current = r;
        setPedido(p);
      }),
    [],
  );

  const responder = (sim: boolean) => {
    resolver.current(sim);
    setPedido(null);
  };

  const dialogo = (
    <Modal aberto={pedido !== null} aoFechar={() => responder(false)} titulo={pedido?.titulo ?? ""} chao="papel">
      {pedido && (
        <div className="confirmacao">
          <div className="confirmacao__texto">{pedido.texto}</div>
          <div className="confirmacao__acoes">
            <Botao variante="secundario" autoFocus onClick={() => responder(false)}>
              Cancelar
            </Botao>
            <Botao variante={pedido.perigo ? "perigo" : "principal"} onClick={() => responder(true)}>
              {pedido.confirmar}
            </Botao>
          </div>
        </div>
      )}
    </Modal>
  );

  return { confirmar, dialogo };
}
