import Link from "next/link";

// As capas dos cursos vêm de fotos do Wikimedia Commons; mantenha os créditos
// enquanto elas estiverem no site (origem completa em assets/credits.json, na landing).
const creditos = [
  "“HP laptop keyboard”, Gugalcrom123, CC BY-SA 4.0",
  "“Eliseu Visconti Colheita do Trigo - anotações do caderno”, Eliseu Visconti, domínio público",
  "“Bolos de chocolate em vitrine suada”, Gabriel Del Cima, CC BY-SA 4.0",
  "“Associação-das-Paneleiras-de-Goiabeiras”, Arinegf, CC BY-SA 4.0",
  "“Blue Snowflake USB microphone”, Marie-Lan Nguyen, CC BY 2.5",
  "“Pão francês carioca”, Gabriel Del Cima, CC BY-SA 4.0",
  "“Smartphone in Hand”, NeONBRAND, CC0",
];

export function Rodape() {
  return (
    <footer className="rodape">
      <p>PotencIA · vídeos, artes e carrosséis com IA para o seu negócio.</p>
      <nav className="rodape__links" aria-label="Institucional">
        <Link href="/planos" className="link">
          Planos
        </Link>
        <Link href="/termos" className="link">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="link">
          Privacidade
        </Link>
      </nav>
      <details className="rodape__creditos">
        <summary>Créditos das imagens</summary>
        <ul>
          {creditos.map((c) => (
            <li key={c}>{c}, via Wikimedia Commons</li>
          ))}
        </ul>
      </details>
    </footer>
  );
}
