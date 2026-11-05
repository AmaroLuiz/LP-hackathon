import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { API_URL } from "./api";
import type { Familiaridade, Objetivo } from "./catalogo";

// Camada de acesso à sessão (Data Access Layer). Só roda no servidor e sempre
// pergunta à API quem é o usuário: o cookie sozinho não prova nada.
// Quem chama precisa estar dentro de um <Suspense> (lê o cookie da requisição).

export const COOKIE_SESSAO = "POTENCIA_SESSAO";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: "USUARIO" | "ADMIN";
  emailVerificado: boolean;
  deveTrocarSenha: boolean;
  avatarUrl: string | null;
  segmentoNegocio: string | null;
  nomeNegocio: string | null;
  objetivo: Objetivo | null;
  familiaridade: Familiaridade | null;
  onboardingConcluido: boolean;
  cidade: string | null;
  telefone: string | null;
  aceitouMarketing: boolean;
  /** Troca de e-mail esperando o clique no link. */
  emailPendente: string | null;
  googleLigado: boolean;
};

/** Sessão aberta da conta (o id é um apelido; o id real da sessão não sai da API). */
export type SessaoAtiva = { id: string; aparelho: string; criadaEm: string; ultimoUso: string; atual: boolean };

/** Cookie de sessão pronto para repassar à API, ou null sem sessão. */
export async function cabecalhoSessao(): Promise<string | null> {
  const sessao = (await cookies()).get(COOKIE_SESSAO);
  return sessao ? `${COOKIE_SESSAO}=${sessao.value}` : null;
}

/** O usuário logado, ou null. Uma chamada à API por requisição (React cache). */
export const obterUsuario = cache(async (): Promise<Usuario | null> => {
  const cookie = await cabecalhoSessao();
  if (!cookie) return null;
  const resposta = await fetch(`${API_URL}/api/me`, { headers: { cookie } });
  if (resposta.status === 401) return null;
  if (!resposta.ok) throw new Error(`A API respondeu ${resposta.status} em /api/me`);
  const u = (await resposta.json()) as Usuario;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    emailVerificado: u.emailVerificado,
    deveTrocarSenha: u.deveTrocarSenha,
    avatarUrl: u.avatarUrl,
    segmentoNegocio: u.segmentoNegocio,
    nomeNegocio: u.nomeNegocio,
    objetivo: u.objetivo,
    familiaridade: u.familiaridade,
    onboardingConcluido: u.onboardingConcluido,
    cidade: u.cidade,
    telefone: u.telefone,
    aceitouMarketing: u.aceitouMarketing,
    emailPendente: u.emailPendente,
    googleLigado: u.googleLigado,
  };
});

/**
 * Para partes que não dependem do login (cabeçalho, recomendações, botões do
 * curso): se a API cair, a página segue como se fosse um visitante.
 */
export async function obterUsuarioSeDisponivel(): Promise<Usuario | null> {
  try {
    return await obterUsuario();
  } catch (erro) {
    // Sinais internos do Next (pré-renderização, redirect) seguem adiante; só a falha da API vira visitante.
    unstable_rethrow(erro);
    // Busca cancelada porque a pessoa já trocou de página: não é falha da API.
    if (erro instanceof Error && erro.name === "AbortError") return null;
    console.error("Sessão indisponível; seguindo como visitante.", erro);
    return null;
  }
}

/**
 * Exige login; sem sessão, manda para /entrar e volta para `voltar` depois.
 * Com senha provisória (admin inicial), só a tela de troca de senha abre.
 */
export async function exigirUsuario(voltar: string, opcoes?: { senhaProvisoriaPermitida?: boolean }): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  if (usuario.deveTrocarSenha && !opcoes?.senhaProvisoriaPermitida) {
    redirect(`/minha-conta/senha?obrigatorio=1&voltar=${encodeURIComponent(voltar)}`);
  }
  return usuario;
}

/** Exige papel ADMIN. Para quem não é admin, a página simplesmente não existe. */
export async function exigirAdmin(voltar: string): Promise<Usuario> {
  const usuario = await exigirUsuario(voltar);
  if (usuario.papel !== "ADMIN") notFound();
  return usuario;
}

/** GET autenticado na API, repassando o cookie da sessão. */
export async function buscarComSessao<T>(caminho: string): Promise<T> {
  const cookie = await cabecalhoSessao();
  const resposta = await fetch(`${API_URL}${caminho}`, { headers: cookie ? { cookie } : {} });
  if (!resposta.ok) throw new Error(`A API respondeu ${resposta.status} em ${caminho}`);
  return resposta.json() as Promise<T>;
}

export type RespostaApi<T> =
  | { ok: true; dados: T }
  | { ok: false; status: number; codigo: string | null; mensagem: string };

/** GET autenticado que devolve o status em vez de lançar (para tratar 403 e 404 na tela). */
export async function pedirComSessao<T>(caminho: string): Promise<RespostaApi<T>> {
  const cookie = await cabecalhoSessao();
  const resposta = await fetch(`${API_URL}${caminho}`, { headers: cookie ? { cookie } : {} });
  if (resposta.ok) return { ok: true, dados: (await resposta.json()) as T };
  const problema = (await resposta.json().catch(() => null)) as { codigo?: string; detail?: string } | null;
  if (resposta.status >= 500) throw new Error(`A API respondeu ${resposta.status} em ${caminho}`);
  return { ok: false, status: resposta.status, codigo: problema?.codigo ?? null, mensagem: problema?.detail ?? "" };
}
