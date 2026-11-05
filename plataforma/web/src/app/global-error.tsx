"use client";

// Erro no próprio layout (cabeçalho ou fontes): precisa trazer o <html> inteiro
// e estilos próprios, porque o CSS global pode não ter carregado.
export default function ErroGlobal({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#171E19", color: "#F6F1E7", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: "32rem", padding: "2rem" }}>
          <p style={{ color: "#A6ADA2", fontSize: "0.875rem" }}>PotencIA</p>
          <h1 style={{ fontSize: "2rem", lineHeight: 1.1, margin: "0.75rem 0 1rem" }}>Não conseguimos abrir o site agora.</h1>
          <p style={{ color: "#A6ADA2" }}>Pode ser uma instabilidade rápida. Tente de novo em alguns segundos.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: "1.5rem", minHeight: "3.25rem", padding: "0 1.5rem", border: 0, background: "#F2B705", color: "#171E19", font: "inherit", fontWeight: 600, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
