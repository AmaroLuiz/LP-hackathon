/** Player: tela focada, sem o cabeçalho e o rodapé da vitrine. */
export default function LayoutAprender({ children }: { children: React.ReactNode }) {
  return (
    <div className="aprender" data-chao="preto">
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      {children}
    </div>
  );
}
