// Endereço da landing page da PotencIA (index.html na raiz do repositório),
// sem barra no final. NEXT_PUBLIC_ porque o menu do celular, que roda no
// navegador, também leva para lá.
export const LANDING_URL = (process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:5173").replace(/\/+$/, "");

/** Endereço de uma seção da landing, como `naLanding("#lista")`. */
export const naLanding = (ancora = "") => `${LANDING_URL}/${ancora}`;
