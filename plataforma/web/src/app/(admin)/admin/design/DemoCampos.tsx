"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Caixa } from "@/components/ui/Caixa";
import { Campo } from "@/components/ui/Campo";
import { CampoSenha } from "@/components/ui/CampoSenha";

/** Campos vivos do inventário (precisam de estado no navegador). */
export function DemoCampos() {
  const [nome, setNome] = useState("Padaria Trigal");
  const [email, setEmail] = useState("contato@padaria");
  const [senha, setSenha] = useState("pao quente 7h");
  const [aceito, setAceito] = useState(true);
  const [carregando, setCarregando] = useState(false);

  return (
    <div className="inventario__grade inventario__grade--campos">
      <Campo id="demo-nome" rotulo="Nome do negócio" value={nome} onChange={(e) => setNome(e.target.value)} ajuda="Aparece no seu certificado." />
      <Campo
        id="demo-email"
        rotulo="E-mail"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro="Informe um e-mail válido."
      />
      <CampoSenha id="demo-senha" rotulo="Senha" medidor value={senha} onChange={(e) => setSenha(e.target.value)} />
      <Campo id="demo-desabilitado" rotulo="Campo desabilitado" value="Não editável" disabled readOnly />
      <Caixa id="demo-caixa" checked={aceito} onChange={(e) => setAceito(e.target.checked)}>
        Quero receber novidades por e-mail
      </Caixa>
      <div>
        <Botao
          carregando={carregando}
          textoCarregando="Salvando…"
          onClick={() => {
            setCarregando(true);
            setTimeout(() => setCarregando(false), 1500);
          }}
        >
          Testar carregando
        </Botao>
      </div>
    </div>
  );
}
