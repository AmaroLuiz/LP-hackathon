"use client";

import { useState } from "react";
import { Abas } from "@/components/ui/Abas";
import { useAvisos } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmacao";
import { Alternador, AreaTexto, GrupoRadio, Selecao } from "@/components/ui/Formulario";
import { Gaveta } from "@/components/ui/Gaveta";

/** Peças que só fazem sentido com estado no navegador. */
export function DemoInterativos() {
  const [gaveta, setGaveta] = useState(false);
  const [ligado, setLigado] = useState(true);
  const [nivel, setNivel] = useState<"INICIANTE" | "INTERMEDIARIO">("INICIANTE");
  const [texto, setTexto] = useState("Fotos de produto com luz de janela.");
  const { avisar } = useAvisos();
  const { confirmar, dialogo } = useConfirmacao();

  return (
    <div className="inventario__pilha">
      {dialogo}
      <div className="inventario__grade inventario__grade--campos">
        <AreaTexto id="demo-area" rotulo="Área de texto" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} ajuda="Com rótulo visível e ajuda ligada." />
        <Selecao id="demo-selecao" rotulo="Seleção" defaultValue="video">
          <option value="video">Vídeo</option>
          <option value="texto">Texto</option>
        </Selecao>
        <Alternador id="demo-alternador" rotulo="Alternador (prévia grátis)" ligado={ligado} aoMudar={setLigado} ajuda="role=switch: Espaço ou Enter alterna." />
        <GrupoRadio
          nome="demo-radio"
          legenda="Rádio"
          valor={nivel}
          aoMudar={setNivel}
          opcoes={[
            ["INICIANTE", "Iniciante"],
            ["INTERMEDIARIO", "Intermediário"],
          ]}
        />
        <div className="campo">
          <span className="campo__rotulo">Envio de arquivo</span>
          <span className="botao botao--secundario botao--pequeno">Enviar vídeo</span>
          <p className="campo__ajuda">No editor: escolhe, envia com barra de progresso e confere o tipo real do arquivo.</p>
        </div>
      </div>

      <Abas
        rotulo="Exemplo de abas"
        abas={[
          { id: "um", rotulo: "Página do curso", conteudo: <p>Setas esquerda e direita trocam de aba; Home e End vão às pontas.</p> },
          { id: "dois", rotulo: "Currículo", conteudo: <p>O conteúdo de cada aba continua montado ao trocar.</p> },
        ]}
      />

      <div className="inventario__linha">
        <Botao variante="secundario" onClick={() => avisar("Curso salvo.")}>
          Mostrar aviso flutuante
        </Botao>
        <Botao
          variante="secundario"
          onClick={async () => {
            const ok = await confirmar({ titulo: "Arquivar o curso?", texto: "Modal de confirmação: foco preso, Esc fecha, Cancelar vem primeiro.", confirmar: "Arquivar", perigo: true });
            avisar(ok ? "Confirmado." : "Cancelado.", "info");
          }}
        >
          Abrir modal
        </Botao>
        <Botao variante="secundario" onClick={() => setGaveta(true)}>
          Abrir gaveta lateral
        </Botao>
      </div>

      <Gaveta aberta={gaveta} aoFechar={() => setGaveta(false)} titulo="Gaveta lateral">
        <p>Usada para editar uma aula ou um instrutor sem sair da página. Esc ou o X fecham; o foco volta para o botão que abriu.</p>
      </Gaveta>
    </div>
  );
}
