# Prompt: PotencIA, plataforma de cursos completa

> Cole este documento inteiro como instrução para quem vai construir (pessoa ou IA).
> Ele descreve o produto, as regras visuais, os dados, as telas, a API, a segurança, os testes
> e a ordem de entrega. Onde houver uma decisão ainda não tomada pelo cliente, ela está marcada
> como **PREMISSA** (o que fazer até alguém dizer o contrário).

---

## 1. Contexto e papel

Você vai evoluir a plataforma de cursos da **PotencIA**, um produto brasileiro que ensina donos de
pequenos negócios (padaria, salão, oficina, loja de bairro) a criar vídeos, artes e carrosséis com
IA (Claude, GitHub, Remotion, ElevenLabs). O público tem pouca intimidade com tecnologia: clareza
vale mais que efeito.

Trabalhe como um time sênior de produto + engenharia + design. Escreva todo o texto da interface
em **português do Brasil**, sem jargão técnico para o aluno.

### O que já existe no repositório

```
potencIA/
├── index.html, style.css, main.js, dados.js   ← landing page estática (NÃO alterar neste trabalho)
├── assets/                                     ← fotos (WebP), vídeo, credits.json com licenças
└── plataforma/
    ├── README.md
    ├── api/   ← Spring Boot 4.1.2, Java 21, Spring Modulith 2.1, Spring Data JPA, Flyway,
    │            Spring Security, H2 (modo PostgreSQL) no local, PostgreSQL em produção (perfil prod)
    └── web/   ← Next.js 16.4 (App Router, cacheComponents: true), React 19, TypeScript, CSS puro
```

- API: módulos `catalogo` (Trilha, Aula) e `assinaturas` (Plano com itens e trilhas liberadas).
  Rotas públicas `GET /api/trilhas`, `GET /api/trilhas/{slug}`, `GET /api/planos`.
  Migrações em `api/src/main/resources/db/migration` (V1 a V3). Testes: `ApiPublicaTests`,
  `ModularityTests`.
- Web: catálogo `/`, `/trilhas/[slug]`, `/planos`. Dados via `src/lib/api.ts` com `"use cache"`,
  `cacheLife("hours")`, `cacheTag("catalogo")`. Rewrite `/api/*` → API Spring (mesmo domínio).
- **Leia `plataforma/web/AGENTS.md` e a documentação em `web/node_modules/next/dist/docs/`
  antes de escrever código do Next.** Esta versão tem APIs novas (Cache Components, `instant`,
  `PageProps`/`LayoutProps` globais, `params` assíncrono).

### Objetivo

Transformar o catálogo simples numa **plataforma de cursos real**, no nível de uma Udemy em
funcionalidade e no nível de um site premiado no Awwwards em acabamento: capa e página de detalhe
para cada curso, cadastro, login, área do aluno com player e progresso, e um painel de
administração completo. **Reformule completamente a parte de cursos**: o conceito "trilha" vira
**curso** (com módulos e aulas). Não é preciso manter compatibilidade com as rotas `/trilhas`;
redirecione `/trilhas/:slug` → `/cursos/:slug` (301).

---

## 2. Regras inegociáveis

1. **Paleta da marca** (copiar os tokens de `style.css` da landing, sem inventar cores novas):

   | Token | Hex | Uso |
   | --- | --- | --- |
   | `--preto` (carvão) | `#171E19` | chão das telas escuras, área do aluno, player |
   | `--grafite` | `#1F2822` | superfícies no escuro (cards, painéis) |
   | `--carvao` | `#2A342D` | segundo tom no escuro, bordas, fundo de imagem |
   | `--papel` (creme) | `#F6F1E7` | chão das telas claras, painel admin |
   | `--pedra` | `#E7E0D1` | superfícies no claro |
   | `--texto` | `#1A1A1A` | texto sobre claro |
   | `--cinza-escuro` | `#4E5750` | texto secundário no claro (6,7:1) |
   | `--cinza-claro` | `#A6ADA2` | texto secundário no escuro (7,4:1) |
   | `--ouro` | `#F2B705` | destaque, expoente, estrelas, foco, botão principal |
   | `--ouro-texto` | `#7A5A00` | dourado para TEXTO sobre fundo claro (contraste AA) |
   | `--salvia` | `#6B8F71` | crescimento: progresso, concluído, fios, sucesso |
   | `--erro` | `#9A2A1F` | erros e ações destrutivas |

   Use o sistema de "chão" (`[data-chao="preto" | "papel" | "pedra"]`) que redefine
   `--tinta`, `--suave`, `--superficie`, `--acento-texto`, `--foco`. Nenhum componente usa hex
   direto; tudo passa pelos papéis.
2. **Tipografia**: Chillax 400/500/600 (Fontshare) para tudo; Libre Baskerville 700 **só** no nome
   "PotencIA". Escala fluida já definida (`--passo-pequeno` … `--passo-titulo`). Números com
   `font-variant-numeric: tabular-nums` (preços, durações, contadores).
3. **Motivo visual: o expoente.** "Potência" é x²: um quadrado dourado no canto superior direito
   marca o número do curso, o botão principal, a etapa atual, o item ativo. Use com parcimônia:
   no máximo um expoente por bloco de atenção.
4. **Cantos retos em tudo** (raio 0). Exceção única: a pílula do cabeçalho, como na landing.
5. **Sem**: gradientes decorativos, sombras pesadas, glassmorphism fora do cabeçalho, emojis na
   interface, ícones genéricos coloridos, cards arredondados estilo "template SaaS".
6. **Acessibilidade WCAG 2.2 AA**: contraste conferido em cada par de cores, foco visível
   (`outline` dourado no escuro, carvão no claro), navegação por teclado completa (player,
   acordeões, menus, modais com foco preso), `prefers-reduced-motion` respeitado, alvos de toque
   ≥ 44 px, legendas no player, formulários com rótulo visível e erro associado (`aria-describedby`).
7. **Mobile-first**. Toda tela funciona em 360 px de largura.
8. **Movimento**: transições CSS de 140 a 240 ms com `cubic-bezier(0.22, 1, 0.36, 1)`.
   GSAP/Lenis só nas páginas públicas de vitrine (home, página do curso), nunca no painel admin
   nem no player.
9. **Arquitetura da API**: cada pasta direta de `br.com.potencia` é um módulo do Spring Modulith;
   um módulo nunca usa classes internas de outro (o `ModularityTests` tem de continuar passando).
   Comunicação entre módulos por serviço público do módulo ou por evento de domínio.
10. **Nada de segredo no código.** Chaves, senhas e tokens só por variável de ambiente;
    `.env.example` documentado.

---

## 3. Referências

### Udemy: copiar o funcionamento, não a aparência

| Udemy | Na PotencIA |
| --- | --- |
| Card do curso: capa 16:9, título, instrutor, nota, nº de avaliações, duração, nível, selo | Card com capa 16:9, número do curso como expoente dourado, título, nota (estrelas em ouro), nº de alunos, duração total, nível, plano que libera |
| Página do curso: cabeçalho escuro com título, subtítulo, nota, alunos, "criado por", última atualização, idioma | Igual, no chão carvão |
| Caixa "O que você aprenderá" | "O que você vai aprender" (lista de 4 a 8 resultados concretos) |
| "Conteúdo do curso": seções em acordeão, nº de aulas, duração, aulas de prévia gratuitas | Módulos em acordeão, "Expandir tudo", aulas com duração e selo "Prévia" que abre o vídeo num modal |
| Requisitos, descrição, "Para quem é este curso" | Mesmas seções |
| Card fixo lateral: vídeo de prévia, preço, botões, "Este curso inclui" | Card fixo: prévia, status de acesso, botão principal, "Este curso inclui" (horas de vídeo, materiais, certificado, acesso no celular) |
| Bloco do instrutor e avaliações com distribuição de estrelas | Igual, com filtro por nota |
| Player: vídeo + currículo lateral com checkboxes, abas Visão geral / Perguntas / Anotações / Avaliações | Igual (ver seção 7.4) |
| "Meu aprendizado", lista de desejos, certificado de conclusão | Igual |
| Busca com filtros (nota, duração, nível, tema, idioma) | Igual (ver 7.2) |

**Não copiar da Udemy**: contagem regressiva de promoção, "desconto" permanente falso, selos
inventados ("mais vendido" sem critério), excesso de banners, cards apertados, cores chamativas
genéricas. A PotencIA é calma, editorial e honesta.

### Awwwards: o acabamento

Abra e estude antes de desenhar (todos na coleção https://www.awwwards.com/inspiration_search/Courses/):

- **Bettr Academy** (https://bettr.academy/): catálogo denso com marca forte e arquitetura de
  informação rigorosa → **catálogo e filtros**.
- **Mastering Web Animations / VWLAB** (Site of the Day e Developer Award,
  https://vwlab.io/pages/animaster): o movimento da página prova o conteúdo → **página do curso
  de motion** pode usar um trecho do vídeo como capa animada.
- **Abadir Academy** (menção honrosa, mar/2026, https://www.abadir.net/): acessível e clara para
  quem está começando → **onboarding e cadastro**.
- **Fast Forward by Escac** (menção honrosa, jul/2025, https://off.escac.com/): a página se adapta
  às escolhas do visitante → **onboarding que pergunta o segmento do negócio** e personaliza as
  recomendações.
- **PTL** (menção honrosa, ago/2026): divulgação de uma série de cursos intensivos → **seção de
  destaque da home**.
- **Awwwards Academy** (https://www.awwwards.com/academy/): assinatura com mais de 100 cursos e
  player → **modelo de assinatura e player**.

O que levar dessas referências: tipografia grande e confiante nos títulos, muito espaço, grade
rígida, fios finos (1 px em sálvia a 55%) separando blocos, fotos recortadas em formato fixo,
hover discreto (outros itens esmaecem a 40%), números grandes como elemento gráfico.

---

## 4. Tipos de usuário e permissões

Dois papéis no sistema, mais o visitante sem conta.

| Ação | Visitante | Usuário (aluno) | Admin |
| --- | :-: | :-: | :-: |
| Ver home, catálogo, página do curso, planos | ✓ | ✓ | ✓ |
| Assistir aulas marcadas como prévia | ✓ | ✓ | ✓ |
| Cadastrar-se, entrar, recuperar senha | ✓ | | |
| Assistir aulas de cursos liberados, marcar progresso | | ✓ | ✓ |
| Anotações, perguntas, avaliar curso, lista de desejos | | ✓ | ✓ |
| Certificado de cursos concluídos | | ✓ | ✓ |
| Gerenciar o próprio perfil, assinatura e dados (LGPD) | | ✓ | ✓ |
| Painel admin: cursos, módulos, aulas, capas, vídeos, categorias | | | ✓ |
| Publicar, despublicar e arquivar cursos | | | ✓ |
| Ver e gerenciar usuários, promover a admin, bloquear | | | ✓ |
| Ver assinaturas e pagamentos, conceder acesso manual | | | ✓ |
| Moderar avaliações e responder perguntas como "Equipe PotencIA" | | | ✓ |
| Ver métricas do painel | | | ✓ |

- Papéis: enum `Papel { USUARIO, ADMIN }`. Um usuário tem exatamente um papel.
- **PREMISSA**: não existe papel de instrutor. Os cursos são criados pelos admins; cada curso tem
  um ou mais **instrutores** cadastrados como perfil público (nome, foto, mini-bio), que não
  precisam ter conta.
- O primeiro admin é criado na inicialização a partir de `ADMIN_EMAIL` e `ADMIN_SENHA_INICIAL`
  (só se ainda não existir nenhum admin), e é obrigado a trocar a senha no primeiro acesso.
  Admin pode promover outro usuário a admin e rebaixar, mas nunca o último admin.
- Toda verificação de permissão acontece **na API** (Spring Security + checagem por recurso).
  O front só esconde o que o usuário não pode usar; não é ele que protege.

---

## 5. Modelo de negócio e acesso

- **PREMISSA**: o acesso é por **assinatura mensal**, mantendo os planos atuais
  (Essencial R$ 49, Completo R$ 89, Negócio R$ 149, VALORES PROVISÓRIOS), cada plano libera uma
  lista de cursos. O plano Negócio permite até 3 pessoas (o titular convida por e-mail).
- Condição de fundador (da landing): 50% de desconto nos 3 primeiros meses e preço travado por
  12 meses para quem veio da lista de espera. Configurável no admin.
- Um usuário **pode acessar uma aula** se, e somente se: a aula é prévia, OU é admin, OU tem
  assinatura `ATIVA` (ou em período de carência) cujo plano inclui o curso, OU recebeu acesso
  manual concedido por um admin (com data de expiração opcional e motivo registrado).
- Concentre essa regra num único serviço (`AcessoService.podeAssistir(usuario, aula)`) com testes
  para cada caso.
- **Gateway de pagamento**: Asaas (cartão recorrente, Pix e boleto). Abstrair atrás de uma interface
  `GatewayPagamento`; em desenvolvimento, usar uma implementação **falsa** que aprova na hora,
  para todo o fluxo funcionar sem conta no Asaas. Webhooks idempotentes (guardar o id do evento)
  e com assinatura/token verificado.
- Status de assinatura: `PENDENTE`, `ATIVA`, `EM_ATRASO` (carência de 5 dias com acesso),
  `CANCELADA` (acesso até o fim do período pago), `EXPIRADA`.

---

## 6. Modelo de dados

Use Flyway para tudo (nunca `ddl-auto=update`). Migrações compatíveis com H2 (modo PostgreSQL)
e PostgreSQL. Substitua as tabelas `trilha`/`aula` por este modelo numa migração nova; os
7 cursos atuais viram dados iniciais.

**Módulo `contas`**
- `usuario`: id (UUID), nome, email (único, minúsculo), senha_hash, papel, email_verificado_em,
  avatar_url, segmento_negocio, nome_negocio, cidade, telefone (opcional), bloqueado_em,
  ultimo_acesso_em, aceitou_termos_em, aceitou_marketing (bool), criado_em, atualizado_em,
  excluido_em (exclusão lógica + anonimização).
- `token_conta`: id, usuario_id, tipo (`VERIFICAR_EMAIL`, `REDEFINIR_SENHA`, `CONVITE_EQUIPE`),
  hash do token (nunca o token puro), expira_em, usado_em.
- `equipe` e `membro_equipe` (plano Negócio): titular, membros, convites pendentes.
- Sessões: Spring Session JDBC (tabelas próprias da biblioteca, via migração).

**Módulo `catalogo`**
- `categoria`: id, slug, nome, descricao, ordem (ex.: Primeiros passos, Conteúdo, Vídeo, Voz,
  Design, Vendas).
- `instrutor`: id, nome, foto_url, titulo, bio.
- `curso`: id, slug (único), numero (o expoente, único), titulo, subtitulo, descricao (Markdown),
  capa_url, capa_alt, video_previa_id, nivel (`INICIANTE`, `INTERMEDIARIO`, `AVANCADO`),
  idioma, categoria_id, ferramentas (lista), o_que_aprende (lista), requisitos (lista),
  para_quem_e (lista), resultado_final, status (`RASCUNHO`, `PUBLICADO`, `ARQUIVADO`),
  publicado_em, atualizado_em, duracao_total_segundos (calculado), total_aulas (calculado),
  nota_media e total_avaliacoes (desnormalizados, atualizados por evento), total_alunos,
  certificado_habilitado, seo_titulo, seo_descricao.
- `curso_instrutor`: curso_id, instrutor_id, ordem.
- `modulo`: id, curso_id, ordem, titulo, descricao.
- `aula`: id, modulo_id, ordem, titulo, tipo (`VIDEO`, `TEXTO`, `MATERIAL`, `EXERCICIO`),
  resumo, conteudo (Markdown, para texto/exercício), video_id, duracao_segundos, previa (bool),
  legenda_url, publicada (bool).
- `material`: id, aula_id, nome, arquivo_url, tamanho_bytes, tipo_mime.

**Módulo `assinaturas`**
- `plano` (já existe) + `plano_curso` (substitui `plano_trilha`, por curso_id) + preço por ciclo,
  ativo (bool).
- `assinatura`: id, usuario_id, plano_id, status, gateway_id, inicio, fim_periodo_atual,
  cancelada_em, motivo_cancelamento, fundador (bool).
- `pagamento`: id, assinatura_id, valor_centavos, metodo, status, gateway_id, pago_em, url_fatura.
- `evento_gateway`: id externo único, tipo, payload, recebido_em, processado_em.
- `acesso_manual`: usuario_id, curso_id (ou plano_id), concedido_por, motivo, expira_em.
- `cupom` (opcional, fase 4): código, desconto, validade, limite de usos.

**Módulo `aprendizado`**
- `matricula`: usuario_id, curso_id, iniciada_em, concluida_em, ultima_aula_id
  (criada no primeiro play; é o "Meu aprendizado").
- `progresso_aula`: usuario_id, aula_id, posicao_segundos, concluida_em, atualizado_em.
- `anotacao`: id, usuario_id, aula_id, posicao_segundos, texto, criado_em.
- `pergunta` e `resposta`: por aula, com autor, texto, criado_em, marcada_util, oculta (moderação).
- `avaliacao`: usuario_id, curso_id (única por par), nota 1–5, comentario, status
  (`PUBLICADA`, `OCULTA`), resposta_equipe, criado_em. Só pode avaliar quem concluiu ≥ 30% do curso.
- `lista_desejos`: usuario_id, curso_id.
- `certificado`: id, codigo_validacao (curto, público), usuario_id, curso_id, emitido_em,
  nome_no_certificado.

**Módulo `midia`**
- Interface `ProvedorVideo` (Bunny Stream em produção; em dev, uma implementação que serve
  `assets/paneleiras-take.mp4` para qualquer aula) que gera **URL assinada e com validade curta**
  só depois de `AcessoService` autorizar.
- Interface `Armazenamento` para capas, avatares e materiais (disco local em dev; Cloudflare R2/S3
  em produção). Validar tipo real do arquivo (não só a extensão), limite de tamanho, gerar
  versões WebP da capa (1280×720, 640×360, 320×180).

**Módulo `auditoria`**: registro de ações de admin (quem, o quê, quando, antes/depois) e
eventos sensíveis (login, troca de senha, mudança de papel).

---

## 7. Telas e funcionalidades

Para cada tela: estados **carregando** (esqueleto com as proporções reais), **vazio** (texto útil
+ próxima ação), **erro** (mensagem humana + "Tentar de novo") e **API fora do ar** (página de erro
da marca, não a tela padrão do Next).

### 7.1 Público

**Cabeçalho** (pílula de vidro da landing): marca, "Cursos", "Planos", busca (ícone que abre
campo), e à direita "Entrar" / "Criar conta" ou, logado, avatar com menu (Meu aprendizado,
Lista de desejos, Minha assinatura, Perfil, Painel admin se admin, Sair). Menu de celular em tela
cheia.

**Home `/`**
- Hero em chão carvão: título grande, frase de apoio, busca, CTA "Ver cursos" (botão com expoente).
- "Continue de onde parou" (só logado, com barra de progresso em sálvia).
- Cursos em destaque (escolhidos no admin), por categoria em faixas horizontais com rolagem por
  teclado e setas, "Recomendados para o seu negócio" (pelo segmento do perfil).
- Como funciona a assinatura (3 passos), planos resumidos, avaliações reais de alunos (sem
  inventar), perguntas frequentes, rodapé com créditos das imagens.

**Catálogo `/cursos`**
- Busca por texto (título, subtítulo, ferramentas; sem acento e sem diferenciar maiúsculas).
- Filtros: categoria, nível, duração (até 1 h, 1–3 h, 3 h+), ferramenta, nota mínima, plano que
  libera, "só com prévia gratuita". Ordenação: relevância, mais novos, mais bem avaliados, mais
  populares. Filtros ficam na URL (`searchParams`), compartilháveis.
- Grade de **cards** (1 coluna no celular, 2 no tablet, 3–4 no desktop). Contador de resultados.
  Paginação ou "carregar mais" mantendo a posição.

**Card do curso** (componente único usado em todo o site)
- Capa 16:9 com `next/image`, número do curso no **expoente dourado** no canto superior direito.
- Título (2 linhas no máximo), instrutor, nota com estrelas douradas + "(nº)", duração total,
  nº de aulas, nível. Selo "Incluído no seu plano" quando o usuário tem acesso; senão o plano
  mínimo que libera.
- Botão de lista de desejos (coração em contorno; preenchido em ouro).
- Barra de progresso quando o usuário já começou.
- Hover: capa aproxima 3%, os outros cards da faixa esmaecem; foco por teclado com o mesmo
  destaque. Card inteiro clicável, com um único link acessível.

**Página do curso `/cursos/[slug]`** (estrutura Udemy, acabamento Awwwards)
- Cabeçalho carvão: trilha de navegação (Cursos › Categoria), título com expoente, subtitulo,
  nota + nº avaliações (link para a seção), nº de alunos, instrutores, "Atualizado em mm/aaaa",
  idioma, nível.
- **Card fixo** (lateral no desktop, no fim da tela no celular): capa ou vídeo de prévia (play
  abre modal), estado de acesso e botão principal:
  - visitante → "Criar conta e começar" (+ "Ver planos");
  - logado sem acesso → "Assinar o plano X" (o mais barato que libera);
  - com acesso, não começou → "Começar o curso";
  - em andamento → "Continuar: Aula N" + % concluído;
  - concluído → "Ver certificado" e "Rever o curso".
  "Este curso inclui": horas de vídeo, nº de materiais para baixar, exercícios, certificado,
  acesso no celular. Botões "Lista de desejos" e "Compartilhar".
- Seções: O que você vai aprender (2 colunas com marcador sálvia) · Ferramentas usadas ·
  Conteúdo do curso (módulos em acordeão, totais, "Expandir tudo", prévias clicáveis, aulas
  bloqueadas com cadeado e texto alternativo) · Requisitos · Descrição (Markdown seguro) ·
  Para quem é · Ao final você terá (resultado concreto em destaque dourado) · Instrutores ·
  Avaliações (média grande, distribuição 5→1 com barras, filtro por nota, lista paginada) ·
  Cursos relacionados.
- SEO: `generateMetadata`, Open Graph com a capa, dados estruturados `Course` (schema.org),
  URL canônica.

**Planos `/planos`**: os três planos em degraus (como hoje), comparativo detalhado em tabela
(quais cursos cada um libera), FAQ de cobrança (cancelamento, Pix, nota fiscal), condição de
fundador quando aplicável.

**Validação de certificado `/certificados/[codigo]`**: pública, mostra nome, curso, data e carga
horária, sem outros dados pessoais.

**Páginas legais**: Termos de uso, Política de privacidade (LGPD), Política de cookies. Banner de
cookies só se houver cookie não essencial, com "Recusar" tão visível quanto "Aceitar".

### 7.2 Autenticação

- **Cadastro `/cadastro`**: nome, e-mail, senha (mín. 10 caracteres, medidor de força, mostrar/ocultar),
  aceite dos termos (obrigatório, não pré-marcado), aceite de e-mails de marketing (opcional).
  Depois: e-mail de verificação e **onboarding** em 3 passos (segmento do negócio, objetivo
  principal, nível de familiaridade com tecnologia) que alimenta as recomendações.
- **Entrar `/entrar`**: e-mail e senha, "Lembrar de mim" (sessão de 30 dias), link "Esqueci minha
  senha". Mensagem de erro genérica ("E-mail ou senha incorretos"). Após entrar, volta para a
  página de onde veio (`?voltar=`, só caminhos internos).
- **Esqueci a senha / redefinir**: token de uso único, válido por 1 hora; resposta igual exista ou
  não o e-mail.
- **Verificar e-mail**: link com token; sem verificação o usuário navega, mas não assiste aulas
  pagas (aviso fixo com "Reenviar e-mail").
- **Login com Google** (fase 3, opcional): OAuth2 do Spring Security, vinculando pelo e-mail
  verificado.
- **Sessão**: Spring Security com sessão no servidor (Spring Session JDBC), cookie `httpOnly`,
  `Secure`, `SameSite=Lax`, servido no mesmo domínio pelo rewrite do Next. CSRF ativo (token em
  cookie legível + cabeçalho `X-XSRF-TOKEN` nas mutações). Nada de JWT no `localStorage`.
- Limite de tentativas: 5 logins errados por e-mail/IP em 15 min → espera progressiva.
- Senhas com `DelegatingPasswordEncoder` (bcrypt). Trocar senha encerra as outras sessões.
- No Next: proteger `/aprender/**`, `/minha-conta/**` e `/admin/**` no servidor (checar a sessão
  chamando `GET /api/me`), redirecionando para `/entrar?voltar=...`. Ver o guia
  `authentication-with-cache-components.md` na documentação local do Next: dados do usuário
  **nunca** dentro de `"use cache"` compartilhado.

### 7.3 Área do aluno

- **Meu aprendizado `/minha-conta/cursos`**: abas "Em andamento", "Concluídos", "Lista de desejos".
  Card com progresso e "Continuar".
- **Minha assinatura `/minha-conta/assinatura`**: plano atual, status, próxima cobrança, método,
  histórico de pagamentos com faturas, trocar de plano (upgrade imediato, downgrade no fim do
  ciclo), cancelar (com pergunta de motivo, sem dificultar), reativar. Plano Negócio: gerenciar
  equipe (convidar por e-mail, remover, vagas restantes).
- **Perfil `/minha-conta/perfil`**: nome, foto, dados do negócio, trocar e-mail (com verificação),
  trocar senha, preferências de e-mail, sessões ativas (encerrar), **baixar meus dados** (JSON) e
  **excluir minha conta** (confirmação digitando o e-mail; anonimiza e cancela assinatura).
- **Certificados `/minha-conta/certificados`**: lista, baixar PDF, link público de validação.

### 7.4 Player `/aprender/[slugCurso]/[idAula]`

- Chão carvão, foco total. Topo enxuto: voltar ao curso, título do curso, progresso geral
  ("12 de 30 aulas · 40%"), botão "Avaliar curso".
- Vídeo (16:9) com: play/pausa, barra com pré-visualização de tempo, velocidade 0,75–2×,
  legendas, qualidade, tela cheia, atalhos de teclado (espaço, ←/→ 5 s, J/L 10 s, F, M, C).
  Retoma da última posição. Salva a posição a cada 10 s e ao pausar/sair.
  Marca a aula como concluída ao passar de 90% (e também por botão manual).
  Ao terminar: tela de "Próxima aula em 5 s" com cancelar.
- Aulas de texto/exercício renderizam Markdown com boa tipografia de leitura (65 caracteres por linha).
- **Currículo lateral** (painel recolhível; no celular, abaixo do vídeo): módulos em acordeão,
  aulas com caixa de concluída (sálvia), duração, aula atual marcada com expoente dourado,
  progresso por módulo.
- Abas abaixo do vídeo: **Visão geral** (resumo da aula, materiais para baixar) ·
  **Anotações** (criar com o tempo atual do vídeo; clicar no tempo leva o vídeo até lá; editar,
  excluir) · **Perguntas** (listar, perguntar, responder, marcar como útil; respostas da equipe
  destacadas) · **Avaliações do curso**.
- Ao concluir 100%: tela de parabéns com o certificado (se habilitado) e pedido de avaliação.

### 7.5 Painel admin `/admin`

Chão creme/pedra, denso e funcional (tabelas, filtros, ações em lote). Navegação lateral fixa:
Visão geral · Cursos · Categorias · Instrutores · Usuários · Assinaturas · Avaliações ·
Perguntas · Planos e cupons · Configurações · Auditoria.

- **Visão geral**: alunos ativos (7/30 dias), novos cadastros, assinaturas ativas por plano,
  receita recorrente mensal (MRR), cancelamentos do mês, taxa de conclusão por curso, aulas mais
  abandonadas, avaliações recentes. Gráficos simples com a paleta (ouro, sálvia, carvão) e tabela
  equivalente acessível.
- **Cursos**: tabela com capa mini, título, status, nº de aulas, alunos, nota, atualizado em;
  busca e filtro por status; ações: editar, duplicar, pré-visualizar como aluno, publicar,
  despublicar, arquivar.
- **Editor de curso** (abas, salvando rascunho automaticamente com aviso "Salvo às 14:32"):
  1. *Página do curso*: título, subtítulo, slug (gerado e editável), número, categoria, nível,
     idioma, ferramentas, instrutores, descrição (editor Markdown com pré-visualização), listas
     (o que aprende, requisitos, para quem é), resultado final, SEO.
  2. *Capa e prévia*: upload com recorte 16:9, texto alternativo obrigatório, pré-visualização
     do card como ficará no catálogo; vídeo de prévia.
  3. *Currículo*: módulos e aulas com **arrastar e soltar** (e alternativa por teclado com
     botões subir/descer), criar/editar aula em painel lateral, upload de vídeo com progresso
     (envio direto ao provedor por URL assinada), duração lida automaticamente, marcar prévia,
     anexar materiais, legendas.
  4. *Acesso*: em quais planos o curso entra, certificado habilitado, carga horária.
  5. *Publicar*: checklist que bloqueia a publicação se faltar algo (capa, alt, ≥ 1 módulo com
     ≥ 1 aula publicada, descrição, o que aprende ≥ 4 itens, plano associado).
- **Usuários**: busca por nome/e-mail, filtros (papel, plano, status, verificado), detalhe com
  assinatura, cursos e progresso, pagamentos, sessões; ações: conceder acesso manual, reenviar
  verificação, forçar redefinição de senha, bloquear/desbloquear, promover/rebaixar admin
  (com confirmação e registro na auditoria). Exportar CSV.
- **Assinaturas e pagamentos**: lista com status, filtros, detalhe, link para o gateway,
  reprocessar webhook com falha.
- **Avaliações e Perguntas**: fila de moderação, ocultar/republicar, responder como Equipe PotencIA.
- **Planos e cupons**: editar preço, itens e cursos de cada plano; condição de fundador; cupons.
- **Configurações**: cursos em destaque na home, textos da home, e-mail de suporte, redes sociais.
- **Auditoria**: lista filtrável das ações de admin.

### 7.6 E-mails transacionais

Enviados pela Resend em produção (interface `EnviadorEmail`; em dev, impressos no log com o link).
Modelos em HTML simples com a marca (creme, carvão, botão dourado) e versão em texto puro:
boas-vindas, verificar e-mail, redefinir senha, senha alterada, e-mail alterado, assinatura
ativada, pagamento confirmado, pagamento recusado (com link para atualizar), assinatura em atraso,
assinatura cancelada, convite de equipe, curso novo no seu plano, curso concluído com certificado,
resposta à sua pergunta. Todo e-mail de marketing tem descadastro em um clique.

---

## 8. API (REST, JSON, prefixo `/api`)

Padrões: DTOs como `record`, validação com Bean Validation, erros no formato
**Problem Details (RFC 9457)** com mensagens em português, paginação
`?pagina=&tamanho=&ordem=` com resposta `{ itens, pagina, tamanho, total }`, datas ISO-8601 em UTC.
Documentar com springdoc-openapi (`/api/docs`, só fora de produção ou só para admin).

- **Público**: `GET /cursos` (busca + filtros), `GET /cursos/{slug}`, `GET /cursos/{slug}/avaliacoes`,
  `GET /categorias`, `GET /planos`, `GET /certificados/{codigo}`, `GET /aulas/{id}/previa`.
- **Conta**: `POST /auth/cadastro`, `POST /auth/entrar`, `POST /auth/sair`, `GET /me`,
  `POST /auth/verificar-email`, `POST /auth/reenviar-verificacao`, `POST /auth/esqueci-senha`,
  `POST /auth/redefinir-senha`, `PATCH /me`, `POST /me/senha`, `GET /me/sessoes`,
  `DELETE /me/sessoes/{id}`, `GET /me/dados` (LGPD), `DELETE /me`.
- **Aprendizado** (logado): `GET /me/cursos`, `POST /cursos/{slug}/matricula`,
  `GET /aprender/{slug}` (currículo + progresso), `GET /aulas/{id}` (conteúdo + URL assinada do
  vídeo, 403 se sem acesso), `PUT /aulas/{id}/progresso`, `POST /aulas/{id}/concluir`,
  CRUD `/aulas/{id}/anotacoes`, `/aulas/{id}/perguntas`, `/perguntas/{id}/respostas`,
  `PUT /cursos/{slug}/avaliacao`, `PUT|DELETE /me/lista-desejos/{slug}`, `GET /me/certificados`,
  `GET /me/certificados/{id}/pdf`.
- **Assinatura** (logado): `GET /me/assinatura`, `POST /assinaturas` (inicia checkout),
  `POST /me/assinatura/trocar-plano`, `POST /me/assinatura/cancelar`, `POST /me/assinatura/reativar`,
  equipe: `POST /me/equipe/convites`, `DELETE /me/equipe/membros/{id}`, `POST /equipe/convites/{token}/aceitar`.
- **Webhook**: `POST /webhooks/asaas` (sem sessão, com verificação de token, idempotente).
- **Admin** (`hasRole('ADMIN')`): `/admin/metricas`, CRUD `/admin/cursos`, `/admin/cursos/{id}/modulos`,
  `/admin/modulos/{id}/aulas`, `PUT /admin/cursos/{id}/curriculo/ordem`,
  `POST /admin/cursos/{id}/publicar|despublicar|arquivar|duplicar`, `POST /admin/uploads` (URL
  assinada), CRUD `/admin/categorias`, `/admin/instrutores`, `/admin/planos`, `/admin/cupons`,
  `/admin/usuarios` (+ `/acessos`, `/papel`, `/bloqueio`), `/admin/assinaturas`,
  `/admin/avaliacoes`, `/admin/perguntas`, `/admin/configuracoes`, `/admin/auditoria`.

Quando um curso for publicado ou editado, a API chama um endpoint protegido do Next
(`POST /api/revalidar` com segredo compartilhado) que executa `revalidateTag("catalogo")` e
`revalidateTag("curso:{slug}")`.

---

## 9. Segurança e privacidade (checklist obrigatório)

- [ ] Autorização por recurso em toda rota (um aluno não lê anotação nem progresso de outro; teste
      explícito de IDOR).
- [ ] URL de vídeo assinada, curta (≤ 2 h), gerada só após checar acesso; `video_id` nunca exposto
      em rota pública.
- [ ] Uploads: tipo real verificado, tamanho máximo, nome aleatório, sem execução, sem SVG enviado
      por usuário.
- [ ] Markdown renderizado com sanitização (sem HTML cru, sem `javascript:`).
- [ ] Cabeçalhos: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors` (só o
      player do provedor de vídeo liberado).
- [ ] Limite de requisições em login, cadastro, esqueci senha, perguntas e avaliações.
- [ ] Tokens de e-mail guardados como hash; links de uso único.
- [ ] Logs sem senha, token ou dado de cartão; dados de cartão nunca passam pela PotencIA
      (checkout do gateway).
- [ ] LGPD: base legal registrada, consentimento de marketing separado, exportação e exclusão de
      conta, retenção definida, DPO/contato na política.
- [ ] Dependências sem vulnerabilidades conhecidas altas (`npm audit`, OWASP dependency-check).

---

## 10. Design: telas e componentes

Antes de codar as telas, monte um **inventário de componentes** (página `/admin/design` só para
admin, ou Storybook) com: botão (principal com expoente, secundário, fantasma, destrutivo,
carregando, desabilitado), campo de texto, senha, área de texto, seleção, caixa de seleção,
rádio, alternador, envio de arquivo, chip de filtro, selo de status, estrelas (leitura e entrada),
barra de progresso, acordeão, abas, modal, gaveta lateral, aviso (toast) com `aria-live`,
tabela com ordenação, paginação, esqueleto, estado vazio, card do curso, card do plano, avatar,
menu do usuário, trilha de navegação.

Regras de composição:
- Grade de 12 colunas, largura máxima 76 rem, margens fluidas (`--margem`).
- Ritmo vertical generoso entre seções (`--secao`); dentro de painéis, densidade de ferramenta.
- Um único ponto de ênfase dourado por bloco. Texto dourado sobre claro sempre `--ouro-texto`.
- Estados de sucesso e conclusão em sálvia; erro em `--erro` com ícone e texto (nunca só cor).
- Imagens: capa 16:9 com fundo `--carvao` enquanto carrega; avatar quadrado (cantos retos).
- Capas iniciais: gerar a partir das fotos de `assets/` (versões grandes) com recorte 16:9, título
  não sobreposto à foto (o título fica no card). Manter os créditos do Wikimedia Commons no rodapé
  e em `/creditos`.
- Microcopy: verbos claros ("Começar o curso", "Continuar", "Salvar alterações"), erros que
  dizem como resolver, nada de "Ops!".

---

## 11. Qualidade, desempenho e SEO

- Core Web Vitals no catálogo e na página do curso: LCP < 2,5 s, CLS < 0,1, INP < 200 ms
  (medir com Lighthouse no build de produção).
- Catálogo e página do curso pré-renderizados com `"use cache"` + tags; dados do usuário
  (progresso, acesso) carregados à parte, dentro de `<Suspense>`, sem quebrar o cache público.
- `sitemap.xml`, `robots.txt`, metadados e Open Graph por curso.
- Fontes com `display=swap` e pré-conexão; imagens com `next/image` e tamanhos corretos.
- Página de erro da marca (`error.tsx`, `global-error.tsx`, `not-found.tsx`) e tratamento de
  API fora do ar.

---

## 12. Testes (obrigatórios para considerar pronto)

- **API**: unitários do `AcessoService` (todas as combinações de papel, plano, status, prévia,
  acesso manual, expiração); MockMvc para cada endpoint (200, 400, 401, 403, 404); testes de IDOR;
  webhook idempotente; regras de publicação; `ModularityTests`.
- **Web**: testes de componentes críticos e **Playwright** de ponta a ponta:
  visitante vê catálogo e prévia → cria conta → verifica e-mail (link capturado do log em dev) →
  assina com gateway falso → assiste aula → progresso salvo após recarregar → conclui curso →
  baixa certificado → valida pelo link público. E: admin cria curso, monta currículo, publica,
  e o curso aparece no catálogo. E: aluno sem plano recebe 403 e vê o CTA de assinatura.
- Acessibilidade automática (axe) nas páginas principais, sem violações sérias.

---

## 13. Ordem de entrega (cada fase termina rodando, testada e com README atualizado)

1. **Fundação**: novo modelo de dados (cursos, módulos, aulas, categorias, instrutores) com os
   7 cursos atuais como dados iniciais; módulo `contas` com cadastro, login, sessão, papéis,
   verificação de e-mail e redefinição de senha (e-mails impressos no log em dev); admin inicial
   por variável de ambiente; inventário de componentes.
2. **Vitrine**: home, catálogo com busca e filtros, card do curso, página do curso completa,
   planos, SEO, páginas de erro.
3. **Aprendizado**: matrícula, player, progresso, currículo lateral, anotações, conclusão,
   certificado e validação pública, Meu aprendizado, lista de desejos. Provedor de vídeo falso em dev.
4. **Admin**: visão geral, CRUD de cursos com editor completo e currículo arrastável, uploads,
   publicação com checklist, categorias, instrutores, usuários, auditoria.
5. **Assinaturas**: gateway falso → Asaas sandbox, checkout, webhooks, minha assinatura, troca de
   plano, cancelamento, equipe do plano Negócio, condição de fundador, métricas de receita.
6. **Comunidade e acabamento**: perguntas e respostas, avaliações com moderação, login com
   Google, cupons, LGPD (exportar/excluir), testes de ponta a ponta completos, auditoria de
   acessibilidade e desempenho.

Ao fim de cada fase, informe: o que foi feito, como testar (comandos e credenciais de teste
geradas, guardadas no `.env.example`/dados iniciais de dev, nunca no chat), o que ficou pendente
e qualquer desvio deste documento com o motivo.

---

## 14. Decisões em aberto (confirmar com o cliente)

1. Só assinatura, ou também **compra avulsa** de curso (como a Udemy)? A PREMISSA atual é só assinatura.
2. Os cursos terão **instrutores com conta própria** no futuro (papel de instrutor)? Hoje: não.
3. Provedor de vídeo: **Bunny Stream** (mais barato, região São Paulo) ou **Panda Video**
   (brasileiro, proteção contra pirataria, cobra em real)?
4. Precisa de **nota fiscal** automática (ex.: via Asaas) desde o lançamento?
5. Certificado: qual carga horária e qual texto/assinatura aparecem?
6. Domínio final (para cookies, e-mails e links de certificado).
7. Preços definitivos dos planos (hoje VALORES PROVISÓRIOS).
