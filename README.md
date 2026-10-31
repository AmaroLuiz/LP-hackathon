# PotencIA · landing page

Página única, estática (HTML, CSS e JavaScript), pronta para publicar em qualquer hospedagem de arquivos.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` | Estrutura, textos, SEO, dados estruturados e os posts de exemplo (SVG) |
| `style.css` | Todo o visual. Cores e fontes em variáveis no topo (`:root`) |
| `main.js` | Montagem das trilhas, planos e equipe, interações e animações (GSAP, ScrollTrigger, SplitText e Lenis via CDN) |
| `dados.js` | Conteúdo editável: trilhas, planos (VALORES PROVISÓRIOS), equipe, redes, segmentos e configurações |
| `assets/` | Fotos (WebP), vídeo, imagem de compartilhamento e `credits.json` com a origem e a licença de cada imagem |

## Antes da apresentação

1. **Nome do hackathon:** em `dados.js`, troque `hackathon: '[nome do hackathon]'`. O texto também aparece no `index.html` como reserva para quem estiver sem JavaScript; use buscar e substituir em `[nome do hackathon]`.
2. **Formulário da lista de espera:** crie um formulário em https://formspree.io e cole o endpoint em `dados.js` (`formEndpoint: 'https://formspree.io/f/...'`). Enquanto estiver vazio, o formulário funciona em modo demonstração: mostra o sucesso, mas **não guarda nenhum cadastro**.
3. **Equipe:** nomes, funções e fotos em `dados.js`. Para usar foto, coloque o arquivo em `assets/equipe/` (retrato 4:5) e preencha `foto`.
4. **Planos:** preços e itens em `dados.js`, marcados como VALORES PROVISÓRIOS. A condição de fundador (desconto, meses, trava de preço) fica em `fundador`.
5. **Redes sociais e e-mail:** em `dados.js` (`redes` e `email`).
6. **Compartilhamento (WhatsApp, LinkedIn):** depois de publicar, troque no `<head>` do `index.html` o caminho de `og:image` e `twitter:image` pelo endereço completo, por exemplo `https://seudominio.com.br/assets/og-image.jpg`.

## Ver no computador

Abra `index.html` direto no navegador, ou sirva a pasta:

```bash
node .taste-skill/servidor.mjs
```

e acesse http://localhost:5173.

## Publicar

Netlify (arraste a pasta em app.netlify.com/drop), Vercel, GitHub Pages ou qualquer hospedagem estática. As pastas `.taste-skill/` e `.claude/` são de trabalho e podem ficar de fora.

## Imagens

Fotos e o trecho de vídeo vêm do Wikimedia Commons, com licenças abertas (CC BY, CC BY-SA, CC0 e domínio público). Os créditos estão no rodapé da página e em `assets/credits.json`; mantenha-os enquanto as imagens estiverem no site. Os negócios dos posts de exemplo (Padaria Trigal, Pizzaria do Bairro etc.) são fictícios.
