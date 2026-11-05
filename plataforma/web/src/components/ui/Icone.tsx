// Ícones de traço reto (cantos vivos, como o resto da marca). Decorativos:
// o texto do botão ou um sr-only diz o que ele faz.

const CAMINHOS = {
  busca: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 21 21",
  menu: "M3 7h18M3 12h18M3 17h18",
  fechar: "M5 5l14 14M19 5 5 19",
  esquerda: "M15 5l-7 7 7 7",
  direita: "M9 5l7 7-7 7",
  compartilhar: "M12 3v12M7 8l5-5 5 5M5 13v8h14v-8",
  play: "M8 5v14l11-7z",
  cadeado: "M6 11h12v10H6zM9 11V8a3 3 0 0 1 6 0v3",
  filtro: "M4 6h16M7 12h10M10 18h4",
  texto: "M5 6h14M5 11h14M5 16h9",
  certificado: "M5 4h14v11H5zM9 15l-1 5 4-2 4 2-1-5",
  cima: "M5 15l7-7 7 7",
  baixo: "M5 9l7 7 7-7",
  arrastar: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  editar: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  lixeira: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  feito: "M5 12l5 5 9-10",
  alerta: "M12 4v10M12 18v2",
  envio: "M12 16V4M7 9l5-5 5 5M5 20h14",
  olho: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, tamanho = 20 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      className="icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={nome === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
