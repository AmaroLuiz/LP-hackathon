import type { Nivel } from "./api";

export const NIVEIS: Record<Nivel, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const reaisComCentavos = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const numero = new Intl.NumberFormat("pt-BR");
const mesAno = new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

/** "R$ 89" para valores redondos; com centavos (descontos), "R$ 62,30". */
export function preco(centavos: number) {
  return (centavos % 100 === 0 ? reais : reaisComCentavos).format(centavos / 100);
}

export function inteiro(n: number) {
  return numero.format(n);
}

/** "2 h 15 min", "45 min" ou "menos de 1 min". */
export function duracao(segundos: number) {
  if (segundos < 60) return "menos de 1 min";
  const minutos = Math.round(segundos / 60);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function atualizadoEm(iso: string) {
  return mesAno.format(new Date(iso));
}

export function plural(n: number, um: string, varios: string) {
  return `${inteiro(n)} ${n === 1 ? um : varios}`;
}

/** Tempo de vídeo: 83 → "1:23", 3725 → "1:02:05". */
export function relogio(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

const dataLonga = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

/** Aceita data e hora ISO ou só a data ("2026-12-01", que não pode virar o dia anterior no fuso). */
export function dataPorExtenso(iso: string) {
  return dataLonga.format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
}

/** Carga horária do certificado: 90 → "1 h 30 min", 40 → "40 min". */
export function cargaHoraria(minutos: number) {
  return duracao(minutos * 60);
}

/**
 * Preço digitado → centavos: "89" → 8900, "89,90" e "89.90" → 8990,
 * "1.490,00" → 149000. Ponto seguido de 1 ou 2 dígitos no fim é decimal;
 * nos outros casos, separador de milhar.
 */
export function centavosDe(texto: string): number | null {
  let limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo.includes(",") && /\.\d{1,2}$/.test(limpo)) limpo = limpo.replace(/\.(\d{1,2})$/, ",$1");
  limpo = limpo.replace(/\./g, "");
  if (!/^\d+(,\d{1,2})?$/.test(limpo)) return null;
  const [reais, centavos = "0"] = limpo.split(",");
  return Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
}
