import type { Metadata } from "next";
import { Libre_Baskerville } from "next/font/google";
import "./globals.css";
import "../styles/componentes.css";
import "../styles/vitrine.css";
import "../styles/aprender.css";
import "../styles/admin.css";

// Só o nome "PotencIA" usa serifa, como na logo. O texto usa Chillax (Fontshare).
const baskerville = Libre_Baskerville({
  weight: "700",
  subsets: ["latin"],
  variable: "--fonte-marca",
});

export const metadata: Metadata = {
  // Endereço público do site (links de compartilhamento e imagens Open Graph).
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "PotencIA · Cursos",
    template: "%s · PotencIA",
  },
  description: "Cursos para criar vídeos, artes e carrosséis com IA para o seu negócio, da instalação ao post que vende.",
};

// Raiz: só o documento e as fontes. O cabeçalho da vitrine fica em (site)/layout;
// o player tem o próprio layout, focado, em (aprender)/layout.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={baskerville.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        {/* Chillax não está no Google Fonts, por isso vem do Fontshare */}
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=chillax@400,500,600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
