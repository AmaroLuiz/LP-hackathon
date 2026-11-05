# Prompt: capas das 7 trilhas (cursos 0 a 6)

> Cole este arquivo inteiro numa sessão nova do Claude Code aberta nesta pasta.
> Uma capa por vez, na ordem 0 → 6. Mostre a 0 pronta antes de seguir para as outras.
> **Todas as imagens são geradas do zero.** Não usar nenhuma foto de `assets/` nem as capas atuais
> de `plataforma/web/public/capas/` como base.
> **As 5 imagens de `plataforma/capas-referencias/` são a referência visual principal.** Abra e
> analise todas antes de escrever qualquer coisa.

---

## 0. Referências visuais (ler primeiro)

As imagens estão em `plataforma/capas-referencias/`. Abra cada uma com a ferramenta de leitura de
imagem antes de começar e **use-as como o alvo de qualidade e de estilo** das capas: luz, contraste,
drama do objeto, peso e mistura da tipografia, camadas entre texto e objeto, textura.

| Arquivo | O que tirar dela |
| --- | --- |
| `ref-1-rei-caindo-pb.webp` | **Referência principal de tipografia.** Palavra fantasma enorme atrás do objeto, sans leve + serifa itálica colorida, caixa sólida atrás de uma palavra, rótulos pequenos espelhados nos cantos, textura de papel |
| `ref-2-impacto-estilhaco.webp` | **Referência principal de ação.** Objeto estilhaçando em movimento congelado, partículas, texto que se cruza com o objeto (parte da letra em contorno onde o objeto passa) |
| `ref-3-chess-escuro.png` | **Referência principal de luz.** Estúdio escuro, objeto metálico com brilho dourado, peças desfocadas em primeiro plano, palavra fantasma cinza cortada pela borda |
| `ref-4-venda-todos-os-dias.webp` | Só a hierarquia: palavra gigante em caixa alta + faixa sólida com a segunda linha. Ignorar pessoa, dinheiro, vidro e o vermelho |
| `ref-5-queimar-dinheiro.webp` | **Referência de cor.** Preto + dourado quente: é a paleta mais próxima da marca. Frase pequena em cima, palavra condensada gigante, objeto metafórico embaixo |

Como usar as referências em cada etapa:
1. **No `generate-image` do Canva**: subir **ref-1, ref-2 e ref-3** com `create-upload-url` uma
   vez só, no começo, e passar os três `mediaId` em `imageReferences` em todas as 7 gerações.
   Começar o prompt com "Use the reference images only for lighting, mood, contrast and
   composition style; do not copy their objects, text or colors." Não subir ref-4 e ref-5 para
   o gerador (puxam rosto, dólar e vermelho); elas valem só para a composição tipográfica.
2. **Na montagem (`edit-design`)**: reproduzir a estrutura tipográfica das referências: tamanhos
   relativos, sobreposição palavra/objeto, espaçamento, rótulos de canto.
3. **Na conferência**: comparar cada capa pronta com ref-1, ref-2 e ref-3 lado a lado. Se a capa
   parecer mais fraca, mais plana ou mais "template" que elas, refazer.

**Prioridade quando referência e marca discordarem**: a marca vence nas cores (ouro no lugar do
vermelho, carvão no lugar do preto puro), nas fontes (Chillax) e nos cantos retos. A referência
vence em todo o resto: drama, luz, composição, escala da tipografia, textura.

---

## 1. Ferramentas: tudo no Canva

A geração e a edição acontecem **no Canva, pelo conector do Canva** (ferramentas `mcp__…__*` do
Canva; carregar com `ToolSearch` antes de usar). Nada de Remotion nem de montagem por código.

| Etapa | Ferramenta do Canva |
| --- | --- |
| Subir as referências | `create-upload-url` (uma URL por arquivo, uso único) com os bytes de `ref-1`, `ref-2` e `ref-3` |
| Gerar a imagem de cada trilha | `generate-image` com o prompt da seção 4, `aspectRatio: LANDSCAPE_16_9` e as 3 referências em `imageReferences` (uma entrada `MEDIA` por referência) |
| Separar o objeto do fundo | `remove-background` numa cópia da imagem (ou `separate-image-layers`), para o objeto passar na frente da palavra fantasma |
| Criar o arquivo das capas | `create-design` com formato **"YouTube Thumbnail"** (1280×720). **Um design só, com 7 páginas**, uma por trilha, título "PotencIA · Capas das trilhas". Apagar os elementos que o Canva gerar sozinho e deixar a página vazia, fundo `#171E19` |
| Montar e ajustar | `edit-design` (`insert_fill`, `add_text`, `format_text`, `insert_shape`, `update_opacity`, `layer_element`, `position_element`, `add_page`) |
| Conferir | `read-design` + miniatura de cada página |
| Exportar | `export-design` em PNG, 1280×720, uma página por arquivo |

Skill de apoio: `instagram-agent:ig-human` nas 7 frases antes de colocá-las no Canva (sem travessão,
sem cara de IA).

Fluxo de cada capa, em camadas (de trás para frente):
1. **Imagem gerada** ocupando a página toda (`insert_fill`, 1280×720, `left 0`, `top 0`).
2. **Palavra fantasma** (`add_text`), caixa alta, enorme, creme `#F6F1E7`, opacidade 0.08–0.12,
   cortada pela borda.
3. **Objeto recortado** (imagem sem fundo) exatamente em cima do objeto original, `layer_element`
   à frente da palavra fantasma.
4. **Frase**, **caixa ouro** (`insert_shape` retângulo, `corner_rounding: 0`), **expoente** e
   **rótulos de canto** na frente de tudo.

O texto é sempre **texto editável do Canva**, nunca escrito pelo gerador de imagem: o gerador erra
acentos, "ç", "ã" e o itálico de uma palavra só, e assim dá para corrigir uma letra sem gerar de novo.

**Aprovação**: o `edit-design` trabalha num rascunho. Mostrar a miniatura da página e só mandar
`finalize: "commit"` depois do ok do usuário. Guardar os `media_id` de cada imagem gerada para
poder refazer a página sem gerar a imagem de novo.

---

## 2. Linguagem visual (tradução das referências da seção 0 para a marca)

| Na referência | Na PotencIA |
| --- | --- |
| Foto em preto e branco dessaturada, uma única cor de destaque (vermelho) | P&B puxado para o verde-carvão `#171E19`; **única cor de destaque: ouro `#F2B705`**. Nada de vermelho |
| Palavra gigante "fantasma" atrás do objeto (VENDAS, CHESS), baixa opacidade, o objeto passa por cima | Uma **palavra-tema** por trilha, caixa alta, 8–12% de opacidade em creme, cortada pela borda do quadro. Para o objeto passar por cima, pedir a imagem com fundo limpo e recortar o objeto numa segunda camada |
| Mistura de tipos: sans leve + uma palavra em serifa itálica colorida ("não *cresce.*") | Chillax 400/600 para a frase; **uma palavra só** em serifa itálica de alto contraste, em ouro |
| Caixa sólida atrás de uma palavra ("técnica..." em caixa vermelha) | Caixa ouro retangular (raio 0) atrás de **uma** palavra, texto em `#171E19` |
| Objeto único e dramático como metáfora: rei caindo, peça estilhaçando, dinheiro queimando | Um objeto do pequeno negócio brasileiro no momento da virada: queda, estilhaço, explosão congelada, partículas no ar |
| Fotografia de estúdio, luz dura lateral, fundo escuro, profundidade de campo rasa, tabuleiro em perspectiva | Mesmo tratamento: estúdio escuro, luz dura da esquerda, chão em perspectiva desfocado |
| Textura de papel/tela e granulação | Granulação fina de filme por cima de tudo (4–6%) |
| Rótulos pequenos em caixa alta nos cantos, espelhados no topo e no rodapé | Topo esq.: `POTENCIA` · topo dir.: expoente dourado com o número · rodapé esq.: ferramentas · rodapé dir.: `TRILHA N` |

**Não trazer das referências** (o briefing da plataforma proíbe): degradê vermelho de fundo,
botão "Leia a legenda", selo de verificado, rosto de celebridade ou de pessoa reconhecível,
cédulas de dólar.

---

## 3. Regras fixas das 7 capas

- **Tamanho**: página do Canva 1280×720 (formato YouTube Thumbnail), imagem gerada em
  `LANDSCAPE_16_9`. Exportar PNG 1280×720 do Canva e converter localmente para WebP em 1280×720,
  640×360 e 320×180. Saída: `plataforma/web/public/capas/<slug>.webp` (substitui os arquivos atuais).
- **Paleta**: `#171E19` chão · `#2A342D` sombras · `#F6F1E7` texto e palavra fantasma ·
  `#F2B705` destaque · `#6B8F71` sálvia (opcional, no máximo um detalhe). Nenhuma outra cor.
- **Fontes**: Chillax (Fontshare) para frase e rótulos. Serifa itálica só na palavra de destaque
  (Libre Baskerville Italic ou Instrument Serif Italic). `POTENCIA` do canto em Libre Baskerville 700.
  O `edit-design` do conector não troca a família da fonte (só tamanho, peso, itálico, cor).
  Então: se o usuário tiver um **kit de marca no Canva** com essas fontes, perguntar e usá-lo
  (`list-brand-kits`); senão, montar com a fonte padrão e, no fim, avisar quais textos o usuário
  precisa trocar para Chillax / Libre Baskerville à mão no editor do Canva (são os mesmos 4 a 6
  textos em todas as páginas).
- **Expoente**: quadrado ouro 56×56 px no canto superior direito, com o número da trilha em
  Chillax 600, cor `#171E19`. É o único elemento ouro sólido além da caixa de destaque.
- **Grade**: margem de 56 px; frase no terço indicado em cada trilha, nunca sobre o objeto.
  O objeto ocupa o lado oposto e passa por cima da palavra fantasma.
- **Hierarquia**: no máximo 2 linhas de frase + 1 palavra de destaque. Legível em 320×180.
- **Cantos retos**, sem sombra pesada, sem degradê decorativo. Vinheta só se vier da luz da foto.
- **Consistência de série**: mesma luz, mesmo estúdio escuro, mesmo tratamento P&B, mesma posição
  dos rótulos. Postas lado a lado, as 7 têm de parecer uma coleção.

### Bloco de estilo comum (colar no fim de todos os prompts de imagem)

```
Style: high-end editorial advertising photograph, dark studio, black and white with a subtle
deep green-charcoal tint (#171E19), hard directional side light from the left, deep crushed
shadows, shallow depth of field, dramatic low camera angle, frozen high-speed action,
fine film grain, matte finish. The only color in the whole image is a small warm golden-yellow
(#F2B705) accent where indicated. Keep a large calm dark empty area on the {LADO} third of the
frame for typography. Aspect ratio 16:9.
Negative: no text, no letters, no numbers, no logos, no watermark, no readable screens,
no banknotes, no red tones, no colorful background, no gradient wash, no glossy 3D render look,
no cartoon, no stock-photo smiles, no recognizable faces.
```

Prompt final enviado ao `generate-image` = frase de uso das referências (seção 0) + prompt da
trilha (seção 4) + este bloco, com `{LADO}` trocado. Mandar o texto inteiro, sem resumir.

---

## 4. As 7 capas

### Trilha 0 · Primeiros passos · Claude e GitHub
- **Palavra fantasma**: `COMEÇO` · **Frase à direita**
- **Frase**: "Todo negócio grande / começou com um *clique.*" (*clique.* em serifa itálica ouro)
- **Prompt de imagem** ({LADO}=right):
  ```
  Extreme close-up of a single blank black mechanical keyboard key, pressed down
  by an index finger, the key cap cracking the surface below it with small dark fragments flying
  outward, a thin line of warm golden light bursting from under the key, the rest of the
  keyboard receding into blur and darkness.
  ```

### Trilha 1 · Estratégia de conteúdo · Claude
- **Palavra fantasma**: `ESTRATÉGIA` · **Frase à esquerda**
- **Frase**: "Post sem [estratégia] / é *jogada perdida.*" ([estratégia] na caixa ouro)
- **Prompt de imagem** ({LADO}=left):
  ```
  A dark chess king standing firm on a chessboard whose squares are made of torn paper sheets
  from a planning notebook, a cream-colored king knocked over and falling against it in frozen
  motion, its crown edge catching a golden rim light, camera at board level, other pieces
  blurred in the background.
  ```

### Trilha 2 · Vídeos em motion · Remotion e Claude
- **Palavra fantasma**: `MOVIMENTO` · **Frase à esquerda**
- **Frase**: "Foto parada / *não para o dedo.*"
- **Prompt de imagem** ({LADO}=left):
  ```
  A slice of Brazilian chocolate cake exploding upward in mid-air, crumbs and chocolate
  sprinkles suspended around it in a spiral, a printed still photo frame shattering into
  shards next to it, frozen high-speed photography with slight motion trails, one golden
  spark of light on the frosting, dark bakery counter blurred below.
  ```

### Trilha 3 · Edição de takes reais · Remotion e Claude
- **Palavra fantasma**: `CORTE` · **Frase à direita**
- **Frase**: "O celular já grava. / Falta o *corte certo.*"
- **Prompt de imagem** ({LADO}=right):
  ```
  Close-up of a Brazilian artisan's hands shaping a dark clay pot on a wooden wheel, wet clay
  texture, clay droplets flying, a razor-thin vertical golden light line slicing the whole
  scene in two, the two halves slightly offset like a film edit cut, face not visible.
  ```

### Trilha 4 · Voz e narração · ElevenLabs
- **Palavra fantasma**: `VOZ` · **Frase à esquerda**
- **Frase**: "Sua voz vende / mesmo [sem estúdio]." ([sem estúdio] na caixa ouro)
- **Prompt de imagem** ({LADO}=left):
  ```
  A vintage chrome desk microphone in a dark room, a burst of fine dust particles exploding
  from the grille and forming concentric sound wave rings in the air, an old foam studio
  panel crumbling to pieces behind it, one warm golden rim light on the metal.
  ```

### Trilha 5 · Artes e carrosséis que vendem · Claude
- **Palavra fantasma**: `DESIGN` · **Frase à direita**
- **Frase**: "Três segundos. / Ou *passa direto.*"
- **Prompt de imagem** ({LADO}=right):
  ```
  Rows of Brazilian pão francês bread rolls on a dark bakery tray, all in grayscale and soft
  focus, except one single roll lifted in mid-air in sharp focus and warm golden color,
  flour dust and crust crumbs suspended around it, low angle.
  ```

### Trilha 6 · Da postagem à venda · Todas as ferramentas
- **Palavra fantasma**: `VENDA` · **Frase à direita**
- **Frase**: "Curtida não paga boleto. / *Venda paga.*"
- **Prompt de imagem** ({LADO}=right):
  ```
  A hand holding a smartphone with a dark blank screen, the screen glass shattering outward
  and Brazilian real coins bursting out of it in frozen motion, small heart icons
  crumbling to dust and falling away, one coin catching golden light, dramatic low angle.
  ```

---

## 5. Entrega e conferência

1. Rodar `ig-human` nas 7 frases antes de ir para o Canva. Se mudar alguma, avisar qual e por quê.
2. Subir ref-1, ref-2 e ref-3 (`create-upload-url`) uma vez só.
3. Trilha 0: `generate-image` → mostrar a imagem → só depois do ok, montar a página 1 no Canva
   (`edit-design`, `keep_open`) → mostrar a miniatura → `commit` só depois do ok.
4. Se a imagem vier com texto, letras, cor fora da paleta ou rosto reconhecível, gerar de novo;
   não corrigir com retoque pesado.
5. Repetir para as trilhas 1 a 6, cada uma numa página nova do mesmo design (`add_page`
   1280×720, fundo `#171E19`), copiando posições e tamanhos da página 1 para manter a série.
6. Entregar o link do design no Canva para o usuário editar por lá.
7. Exportar as 7 páginas em PNG (`export-design`), baixar para `plataforma/capas-fonte/`
   e converter para WebP 1280×720, 640×360 e 320×180 (qualidade 82) em
   `plataforma/web/public/capas/`.
8. Conferir as 7 miniaturas juntas com ref-1, ref-2 e ref-3: mesma luz, rótulos no mesmo lugar,
   um único ouro sólido por capa, frase legível em 320×180, mesmo nível das referências.
9. Contraste: texto creme sobre a imagem ≥ 4,5:1 na área da frase (se precisar, retângulo
   `#171E19` com opacidade 0.3–0.5 atrás da frase, sem degradê visível).
10. Os textos alternativos (`capa_alt`) mudam, porque as imagens são novas: criar uma migration
   nova com os alts atualizados (não editar a `V4__cursos.sql`).
