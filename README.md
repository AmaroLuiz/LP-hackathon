# PotencIA · landing page

Página única, estática (HTML, CSS e JavaScript), pronta para publicar em qualquer hospedagem de arquivos.

A plataforma dos cursos (API Spring + site Next.js) fica em `plataforma/`, com o próprio [README](plataforma/README.md).

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` | Estrutura, textos, SEO, dados estruturados e os posts de exemplo (SVG) |
| `style.css` | Todo o visual. Cores e fontes em variáveis no topo (`:root`) |
| `main.js` | Montagem das trilhas, planos e equipe, interações e animações (GSAP, ScrollTrigger, SplitText e Lenis via CDN) |
| `dados.js` | Conteúdo editável: trilhas, planos (VALORES PROVISÓRIOS), equipe, redes, segmentos e configurações |
| `assets/` | Fotos (WebP), vídeo, imagem de compartilhamento e `credits.json` com a origem e a licença de cada imagem |
| `assets/logo-simbolo.svg` | O nó da logo em vetor, versão completa (quatro linhas por fita), em sálvia |

## Marca

- **Paleta:** carvão `#171E19` (base), creme `#F6F1E7` (fundos claros), texto `#1A1A1A`, dourado `#F2B705` (energia e destaque) e verde-oliva/sálvia `#6B8F71` (crescimento, sutil). Tudo em variáveis no topo do `style.css`.
- **Logo:** o nó vem como `<symbol id="s-simbolo">` no `index.html` (versão simplificada, nítida em tamanho pequeno) e o nome "PotencIA" é texto em Libre Baskerville. Favicon, `apple-touch-icon.png` e `og-image.jpg` já usam a logo nova.
- **Abertura (cerca de 3 s):** ao carregar, o nó é desenhado ao longo do próprio percurso e o nome aparece; depois o nó cresce e se encaixa no nó gigante do fundo da hero (linhas afinando até 1 px) enquanto a tela escura se dissolve e a hero entra. Se a página abrir no meio da rolagem, a tela simplesmente sobe. Clique ou qualquer tecla acelera; com movimento reduzido ou sem JavaScript ela não aparece, e se algo falhar some sozinha em 6 s. Marcação no início do `index.html` (`.abertura`), tempo em `aberturaLogo()` no `main.js`.
- O nó foi redesenhado em vetor a partir da imagem da logo. Se existir o arquivo vetorial original, ele pode substituir o desenho.

## Antes da apresentação

1. **Nome do hackathon:** em `dados.js`, troque `hackathon: '[nome do hackathon]'`. O texto também aparece no `index.html` como reserva para quem estiver sem JavaScript; use buscar e substituir em `[nome do hackathon]`.
2. **Formulário da lista de espera:** crie um formulário em https://formspree.io e cole o endpoint em `dados.js` (`formEndpoint: 'https://formspree.io/f/...'`). Enquanto estiver vazio, o formulário funciona em modo demonstração: mostra o sucesso, mas **não guarda nenhum cadastro**.
3. **Equipe:** nomes, funções e fotos em `dados.js`. Para usar foto, coloque o arquivo em `assets/equipe/` (retrato 4:5) e preencha `foto`.
4. **Planos:** preços e itens em `dados.js`, marcados como VALORES PROVISÓRIOS. A condição de fundador (desconto, meses, trava de preço) fica em `fundador`.
5. **Redes sociais e e-mail:** em `dados.js` (`redes` e `email`).
6. **Compartilhamento (WhatsApp, LinkedIn):** depois de publicar, troque no `<head>` do `index.html` o caminho de `og:image` e `twitter:image` pelo endereço completo, por exemplo `https://seudominio.com.br/assets/og-image.jpg`.
7. **Ligação com a plataforma:** em `dados.js`, troque `plataforma: 'http://localhost:3000'` pelo endereço publicado da plataforma (sem barra no final). Dele saem o "Entrar" do cabeçalho e do menu do celular, o nome de cada trilha (leva a `/cursos/<slug>`), o "Ver os cursos na plataforma" e a coluna "Plataforma" do rodapé. O `index.html` traz `http://localhost:3000` como reserva para quem estiver sem JavaScript; troque também lá (buscar e substituir). Do outro lado, a plataforma aponta para cá pela variável `NEXT_PUBLIC_LANDING_URL` (veja o [README da plataforma](plataforma/README.md)).

## Ver no computador

Abra `index.html` direto no navegador, ou sirva a pasta na porta 5173 (a que a plataforma espera no local):

```bash
npx serve -l 5173
```

e acesse http://localhost:5173.

## Publicar

Netlify (arraste a pasta em app.netlify.com/drop), Vercel, GitHub Pages ou qualquer hospedagem estática. As pastas `.taste-skill/` e `.claude/` são de trabalho e podem ficar de fora, assim como `plataforma/`, que é publicada à parte.

## Imagens

Fotos e o trecho de vídeo vêm do Wikimedia Commons, com licenças abertas (CC BY, CC BY-SA, CC0 e domínio público). Os créditos estão no rodapé da página e em `assets/credits.json`; mantenha-os enquanto as imagens estiverem no site. Os negócios dos posts de exemplo (Padaria Trigal, Pizzaria do Bairro etc.) são fictícios.
