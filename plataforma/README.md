# PotencIA · plataforma

A plataforma de cursos. Dois projetos que trabalham juntos:

| Pasta | O que é | Stack |
| --- | --- | --- |
| `api/` | Regras, dados e segurança | Java 21+, Spring Boot 4.1, Spring Security 7, Spring Session JDBC, Spring Modulith, Spring Data JPA, Flyway, PostgreSQL (H2 no local) |
| `web/` | O site que o aluno e o admin usam | Next.js 16 (App Router, Cache Components), React 19, TypeScript, CSS com os tokens da landing |

O navegador só conversa com o Next. Chamadas a `/api/*` seguem para a API Spring pelo rewrite do `web/next.config.ts`, no mesmo domínio: o cookie de sessão (`POTENCIA_SESSAO`, httpOnly) e o cookie `XSRF-TOKEN` funcionam sem CORS.

O plano completo do produto (todas as fases) está em [PROMPT-plataforma-de-cursos.md](PROMPT-plataforma-de-cursos.md).

## Rodar no computador

Precisa de Java 21 ou mais novo e Node 20 ou mais novo. Maven e banco de dados não precisam ser instalados: a API traz o Maven Wrapper e, no local, usa um H2 em memória recriado a cada partida, já com os cursos, as categorias e os planos.

1. API (porta 8080). Espere aparecer `Started PotenciaApiApplication`:

   ```bash
   cd plataforma/api && ./mvnw spring-boot:run
   ```

2. Site (porta 3000), em outro terminal:

   ```bash
   cd plataforma/web && cp .env.example .env.local && npm install && npm run dev
   ```

3. Abra http://localhost:3000.

### Contas de teste (só no local)

- **Admin**: criado na partida da API com `potencia.admin.email` e `potencia.admin.senha-inicial` de `api/src/main/resources/application.properties` (valores de teste). No primeiro acesso ele é obrigado a trocar a senha. Como o banco local é em memória, a cada reinício da API o admin volta à senha inicial.
- **Aluno**: crie em `/cadastro`.
- **E-mails** (confirmação e redefinição de senha) não são enviados no local: aparecem no terminal da API, com o link pronto para abrir. Os últimos 200 também ficam em `GET /api/dev/emails?para=<e-mail>` (só no local, `potencia.dev.emails=true`; desligado no perfil prod), que os testes de ponta a ponta usam.
- **Currículo de exemplo**: no local, os cursos 0, 2 e 5 ganham módulos e aulas fictícios (`api/src/main/resources/db/exemplos`), só para exercitar a vitrine e o player. Essa pasta não roda no perfil prod.
- **Assinar sem pagar**: no local, o gateway de pagamento é o **falso** (`PAGAMENTOS_GATEWAY=falso`): "Assinar" em `/planos` aprova na hora, sem cobrança, e renova sozinho no fim do mês. Para assistir, o aluno também precisa confirmar o e-mail (link no terminal da API).
- **Simular o gateway**: `POST /api/webhooks/falso` aceita eventos no formato do Asaas (atraso, recusa, renovação...), com o cabeçalho `asaas-access-token` igual a `potencia.pagamentos.webhook-token` de `application.properties` (valor de teste). Os exemplos estão em `AssinaturasTests`.
- **Condição de fundador**: cole e-mails em `/admin/planos` → Lista de espera. Quem assina com um desses e-mails ganha o desconto.
- **Equipe do plano Negócio**: o convite vai por e-mail (no local, aparece no terminal da API com o link `/equipe/convite?token=...`).
- **Vídeo de exemplo**: no local (`VIDEO_PROVEDOR=exemplo`), toda aula de vídeo toca o mesmo trecho de 9 s das paneleiras (`web/public/videos/exemplo.mp4`). Vídeo enviado pelo painel toca no lugar dele, por URL assinada de 2 horas.
- **Painel admin**: entre como admin e abra `/admin`. Arquivos enviados pelo painel (capas, fotos, legendas, materiais, vídeos) ficam em `api/dados/arquivos` (fora do Git). O banco local é em memória: o que você edita some ao reiniciar a API; os arquivos ficam.
- **Cupons**: crie em `/admin/planos` → Cupons de desconto e use em `/planos` ("Tem um cupom de desconto?") ou com `/planos?cupom=CODIGO`.
- **Perguntas e avaliações**: perguntas na aba "Perguntas" do player; a avaliação abre depois de 30% do curso concluído. Moderação em `/admin/perguntas` e `/admin/avaliacoes`.
- **Login com Google**: desligado até configurar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (veja Produção). Sem eles, o botão não aparece.
- **Revalidação do site**: ao editar um curso publicado, a API chama `POST /api/revalidar` no Next com o segredo de teste `REVALIDAR_SEGREDO` (o mesmo em `application.properties` e em `web/.env.example`). Copie o `.env.example` para o `.env.local` para valer.

### Testes

```bash
cd plataforma/api && ./mvnw test
```

```bash
cd plataforma/web && npm test
```

Ponta a ponta (Playwright, no Chrome instalado; sobe a API pelo jar e o site em modo dev se não estiverem rodando):

```bash
cd plataforma/api && ./mvnw -o package -DskipTests
```

```bash
cd plataforma/web && npm run e2e
```

O relatório fica em `web/e2e/relatorio` (`npx playwright show-report e2e/relatorio`). Os testes criam contas com e-mail e senha gerados na hora. O admin entra com a senha inicial de teste e troca por uma gerada, que fica em `web/e2e/.senha-admin-local` (fora do Git) para a próxima execução.

Os da API cobrem o catálogo, o fluxo inteiro de conta (cadastro, CSRF, login, limite de tentativas, confirmação de e-mail, redefinição e troca de senha, sessões derrubadas), os papéis, a regra de acesso às aulas em todas as combinações (`AcessoTests`) e o caminho do aluno de ponta a ponta (prévia, bloqueio sem plano, assinatura, e-mail, progresso, conclusão, certificado, anotações de outra pessoa, lista de desejos, acesso manual), além da verificação de fronteiras entre módulos. `PainelAdminTests` cobre o painel: só admin entra (401/403), checklist que bloqueia a publicação, endereço e número repetidos, currículo reordenado entre módulos, duplicar, envio que confere o tipo real do arquivo (SVG disfarçado é recusado) e a proporção, material que só sai com link assinado, aula com progresso que não pode ser excluída, papel e bloqueio que valem na hora, o último admin protegido, nova senha exigida, filtros e CSV de usuários, categoria em uso e a auditoria. `AssinaturasTests` cobre o pagamento: checkout que ativa e registra a cobrança, webhook com token e idempotente (o mesmo evento duas vezes conta uma), atraso com 5 dias de carência e depois expirado, cobrança recusada avisada com o link da fatura, cancelar e reativar, upgrade na hora e downgrade no próximo ciclo, equipe do plano Negócio (convite, aceite só pelo e-mail convidado, vagas, remoção), fundador com desconto nas 3 primeiras cobranças, evento fora de ordem reprocessado pelo admin, reajuste de preço e plano fora de venda, e a leitura dos eventos no formato do Asaas. `AcabamentoTests` cobre a fase 6: perguntas (acesso, nome abreviado, "também tenho essa dúvida", e-mail para quem perguntou, resposta da equipe, moderação), avaliações (só com 30%, edição sem duplicar, média recalculada ao esconder, resposta da equipe), cupons (código único, plano, limite de usos, desconto nas primeiras cobranças), perfil e troca de e-mail (link no endereço novo, aviso no antigo, sessões derrubadas), sessões (listar e encerrar outra), LGPD (exportar tudo e excluir: o e-mail fica livre) e login com Google simulado (cria conta verificada, liga conta existente pelo e-mail, recusa e-mail não confirmado e estado errado). Os do site (test runner do próprio Node, sem dependências) cobrem a busca sem acento, os filtros, a ordenação e as recomendações do catálogo, as regras puras do painel (endereço, reordenação do currículo, duração) e o formato de preço. Os de ponta a ponta (`web/e2e`) cobrem: visitante → catálogo → prévia → cadastro → e-mail confirmado → assinatura → aula → progresso que fica depois de recarregar → curso concluído → certificado validado sem login; aluno sem plano (403 e convite para assinar); admin cria curso, monta o currículo, publica e o curso aparece no catálogo; pergunta respondida pela equipe no painel; avaliação publicada e escondida pela moderação; cupom do painel aplicado na assinatura; perfil, "Baixar meus dados" e exclusão da conta; e a auditoria automática de acessibilidade (axe, WCAG 2.1 AA) nas telas principais.

## O que já existe (fases 1 a 6)

**API**

- **Catálogo** (`catalogo`): cursos com capa, destaque, categoria, nível, instrutores, listas (o que aprende, requisitos, para quem é), módulos e aulas. `GET /api/cursos`, `GET /api/cursos/{slug}`, `GET /api/categorias`. Públicos. O `videoId` das aulas nunca sai nessas rotas. `GET /api/admin/cursos` (admin) lista também rascunhos e arquivados.
- **Contas** (`contas`): `POST /api/auth/cadastro | entrar | sair | verificar-email | esqueci-senha | redefinir-senha`, `GET /api/auth/csrf`, `GET /api/me`, `PATCH /api/me/perfil` (onboarding: segmento, objetivo, familiaridade com IA), `POST /api/me/senha`, `POST /api/me/reenviar-verificacao`.
  - Sessão no servidor (Spring Session JDBC), cookie httpOnly + SameSite=Lax (Secure em produção), 12 h sem uso ou 30 dias com "Continuar conectado".
  - CSRF no padrão SPA (cookie `XSRF-TOKEN` → cabeçalho `X-XSRF-TOKEN`).
  - Senhas com bcrypt; tokens de e-mail de uso único, guardados só como hash SHA-256 (verificação: 48 h; redefinição: 1 h).
  - 5 erros de login em 15 min por e-mail e IP → 429 com `Retry-After`. Mensagem de erro igual para e-mail inexistente e senha errada.
  - Redefinir ou trocar a senha encerra as outras sessões.
  - Papéis `USUARIO` e `ADMIN`. `/api/admin/**` exige admin **e** senha provisória já trocada.
- **Assinaturas** (`assinaturas`): planos e os cursos que cada um libera (`GET /api/planos`, só os à venda), assinatura e acesso manual concedido por admin (`POST /api/admin/acessos`).
  - **Checkout**: `POST /api/assinaturas` cria a assinatura `PENDENTE` e abre a página de pagamento do gateway (Checkout recorrente do Asaas: cartão ou Pix; o cartão nunca passa pela PotencIA). A resposta traz `urlPagamento`; voltar sem pagar e assinar de novo reaproveita a mesma página por 50 minutos. No local, o gateway falso aprova na hora.
  - **Webhook**: `POST /api/webhooks/{gateway}` (token no cabeçalho `asaas-access-token`, sem sessão nem CSRF). Cada evento é guardado com o id dele (entregue de novo, é ignorado) e aplicado à assinatura: checkout pago, assinatura criada ou encerrada, cobrança criada, confirmada, atrasada, recusada ou estornada. A assinatura é achada pelo id no gateway, pelo checkout, pela referência externa ou pelo cliente, então eventos fora de ordem funcionam; o que não achar fica com o erro para o admin reprocessar.
  - **Ciclo de vida**: confirmada → acesso até um mês depois do vencimento (no horário de Brasília); atrasada → `EM_ATRASO` com 5 dias de carência; cancelada → acesso até o fim do período pago, com reativação até lá (o gateway suspende e volta a cobrar no fim do período). Uma rotina de hora em hora expira o que passou do prazo, aplica a troca agendada e (no falso) renova.
  - **Trocar de plano**: mais caro vale na hora; mais barato, na próxima cobrança (dá para desfazer antes). **Cancelar** pede um motivo opcional, sem dificultar.
  - **Preço contratado** fica na assinatura. Mudar o preço de um plano no painel reajusta quem assina a partir da próxima cobrança, exceto fundador com preço travado.
  - **Condição de fundador**: e-mail da lista de espera ganha o desconto nas primeiras cobranças e o preço travado, congelados na assinatura (`GET /api/condicao-fundador` é a regra em vigor; `GET /api/me/condicao-fundador` diz se a pessoa tem direito).
  - **Equipe do plano Negócio**: `GET /api/me/equipe`, `POST /api/me/equipe/convites`, `DELETE /api/me/equipe/membros/{id}`, convite público `GET /api/equipe/convites/{token}` e `POST .../aceitar` (só a conta do e-mail convidado; aceitar confirma o e-mail). Quem entra vê os cursos do plano enquanto a assinatura do titular der acesso.
  - **E-mails**: assinatura ativa, pagamento confirmado, pagamento recusado (com o link da fatura), em atraso, cancelada e convite da equipe.
  - **Painel**: `GET /api/admin/assinaturas` (+ `/{id}` com cobranças, eventos e equipe), `GET|PUT /api/admin/planos`, `GET|PUT /api/admin/fundador` (+ `/lista`), `GET /api/admin/eventos-gateway` e `POST .../{id}/reprocessar`. Métricas: receita recorrente (próximas cobranças, com descontos), recebido no mês e nos últimos 6 meses, em atraso, cancelamentos e fundadores.
- **Aprendizado** (`aprendizado`): a regra única de acesso (`Acesso.decidir`: admin, assinatura, acesso manual, prévia, e-mail não confirmado, sem acesso, indisponível), matrícula no primeiro play, posição do vídeo, conclusão de aula, conclusão do curso, certificado com código curto (`PTC-XXXX-XXXX`), anotações por aula (só o dono vê), lista de desejos e "meus cursos".
  - `GET /api/cursos/{slug}/acesso`, `GET /api/aprender/{slug}`, `GET /api/aulas/{id}`, `PUT /api/aulas/{id}/posicao`, `PUT /api/aulas/{id}/conclusao`, `GET|POST /api/aulas/{id}/anotacoes`, `PUT|DELETE /api/anotacoes/{id}`, `GET /api/me/cursos`, `GET /api/me/resumo`, `GET|PUT|DELETE /api/me/lista-desejos/...`, `GET /api/me/certificados`.
  - Públicos: `GET /api/aulas/{id}/previa` (só aulas de prévia) e `GET /api/certificados/{codigo}` (validação: nome, curso, data e carga horária).
- **Comunidade** (`comunidade`): perguntas por aula e avaliações de curso.
  - Perguntas: `GET|POST /api/aulas/{id}/perguntas` (só quem pode ver a aula), `POST /api/perguntas/{id}/respostas`, `PUT /api/perguntas/{id}/util` ("também tenho essa dúvida"), `DELETE /api/perguntas/{id}` (a própria). Para os outros alunos o nome sai abreviado ("Marta C."). Quem perguntou recebe e-mail quando alguém responde. Limite de 15 envios por hora por pessoa (perguntas, respostas e avaliações).
  - Avaliações: `GET /api/cursos/{slug}/avaliacoes?nota=&pagina=` (pública: média, total, distribuição 5→1 e lista), `GET /api/cursos/{slug}/minha-avaliacao`, `PUT|DELETE /api/cursos/{slug}/avaliacao`. Só avalia quem concluiu 30% do curso; uma por pessoa e curso. A média e o total do card são recalculados a cada mudança e o site é revalidado. `GET /api/depoimentos` traz as avaliações reais de 4 e 5 estrelas com comentário, para a home.
  - Moderação: `GET /api/admin/perguntas?filtro=sem-resposta|todas|ocultas`, `POST /api/admin/perguntas/{id}/respostas` (como "Equipe PotencIA"), `PUT /api/admin/perguntas/{id}/oculta`, `PUT /api/admin/respostas/{id}/oculta`, `GET /api/admin/avaliacoes?status=&nota=`, `PUT /api/admin/avaliacoes/{id}/oculta` (tira da média) e `PUT .../resposta`. Tudo na auditoria.
- **Cupons** (`assinaturas`): `GET|POST /api/admin/cupons`, `PUT /api/admin/cupons/{id}` (percentual, cobranças com desconto, plano, validade, limite de usos, ativo); `GET /api/cupons/{codigo}?plano=` (pública) confere antes de assinar; `POST /api/assinaturas` aceita `cupom`. Não soma com a condição de fundador: fica o que dá mais desconto no total (percentual × cobranças), e o fundador mantém o preço travado. Um uso conta quando a primeira cobrança é paga; no fim do desconto, o gateway passa a cobrar o preço cheio.
- **Perfil, sessões e LGPD**: `PATCH /api/me` (nome, negócio, segmento, cidade, telefone, e-mails de novidades; a mudança do consentimento vai para a auditoria), `POST /api/me/email` (troca de e-mail com a senha: o link vai para o endereço novo e o antigo é avisado; confirmar em `POST /api/auth/confirmar-email` derruba todas as sessões), `GET /api/me/sessoes` e `DELETE /api/me/sessoes/{id}` (o id é um apelido, um hash; o id real da sessão nunca sai da API). O módulo `privacidade` junta `GET /api/me/dados` (JSON com tudo: conta, assinaturas e pagamentos, aprendizado, comunidade) e `DELETE /api/me` (confirmação digitando o e-mail): para a cobrança no gateway, encerra a assinatura e a equipe, apaga progresso, anotações, lista de desejos, certificados e avaliações, esconde perguntas e respostas e anonimiza a conta (o e-mail fica livre). Os pagamentos ficam, ligados à conta anônima, por obrigação fiscal.
- **Login com Google** (`contas`): fluxo OAuth com PKCE feito à mão (o projeto roda sem baixar dependências novas): `GET /api/auth/provedores`, `GET /api/auth/google?voltar=` e `GET /api/auth/google/retorno`. Liga pelo "sub" do Google; senão, pela conta com o mesmo e-mail (o Google precisa ter confirmado o e-mail); senão, cria a conta já confirmada. Volta só para caminhos do próprio site.
- **Vídeo** (`midia`): interface `ProvedorVideo` que só é chamada depois de checar o acesso. No local, `exemplo`. O provedor real (Bunny Stream ou Panda Video) entra quando a decisão for tomada; ele deve gerar URL assinada e curta.
- **Arquivos** (`midia`): envio em dois passos, como num provedor de nuvem: `POST /api/admin/uploads` devolve uma URL de envio assinada (30 min) e o arquivo vai puro, por `PUT`, para ela. A API confere o tipo real pelos primeiros bytes (SVG nunca entra), o tamanho e a proporção das imagens, dá um nome aleatório e guarda pela interface `Armazenamento` (`local` em disco; R2/S3 em produção). Públicos (capas, fotos, legendas) saem em `/api/arquivos/publico/...`; privados (materiais, vídeos locais) só com URL assinada e curta.
- **Painel** (`catalogo`, `contas`, `assinaturas`, `administracao`, `auditoria`): `/api/admin/cursos` (CRUD, `/checklist`, `/publicar|despublicar|arquivar|duplicar`, `/previa`, `/planos`, `/modulos`, `/curriculo/ordem`), `/api/admin/modulos/{id}` (+ `/aulas`), `/api/admin/aulas/{id}` (+ `/materiais`), `/api/admin/materiais/{id}`, `/api/admin/categorias` (+ `/ordem`), `/api/admin/instrutores`, `/api/admin/usuarios` (+ `.csv`, `/{id}`, `/papel`, `/bloqueio`, `/reenviar-verificacao`, `/redefinir-senha`, `/sessoes`, `/acessos`), `/api/admin/metricas`, `/api/admin/auditoria`. Paginação no formato `{ itens, pagina, tamanho, total }`.
- **Auditoria** (`auditoria`): os módulos publicam `EventoAuditoria` (em `compartilhado`) e ela grava na mesma transação. Entram as ações de admin e os eventos de conta: login, troca e redefinição de senha.
- **Revalidação**: quando o que é público muda, os módulos publicam `SiteDesatualizado`; depois do commit, a API chama `POST /api/revalidar` no Next (segredo compartilhado), que roda `revalidateTag` em `catalogo` e `curso:{slug}`. O aviso se repete 5 s depois: se o site estava regerando a página com os dados de antes, essa regeração não fica valendo.
- **E-mail** (`email`): `EnviadorEmail` com duas implementações: `log` (local) e `resend` (produção).
- **Erros**: todos em Problem Details (RFC 9457), em português, inclusive os padrão do Spring (método não permitido etc.); erros de formulário trazem `campos`.
- **Textos dos cursos**: `V6__vitrine_e_perfil.sql` traz descrição, o que aprende, requisitos e público de cada curso, escritos a partir da landing. São rascunho: revise antes do lançamento.

**Site**

- Cabeçalho em pílula de vidro (como a landing), fixo no topo, com busca que abre a partir do ícone e menu em tela cheia no celular.
- Home (`/`): herói com busca e mosaico dos destaques, "Para o seu negócio" (recomendações pelo onboarding, só logado), faixa com todos os cursos, temas, como funciona, planos resumidos e perguntas frequentes. Faixas por tema aparecem sozinhas quando um tema tiver 3 cursos ou mais.
- Catálogo (`/cursos`): busca sem acento, filtros (tema, ferramenta, duração, nível, nota, plano, prévia grátis) que se aplicam sozinhos e ficam na URL, chips para remover, ordenação e "Carregar mais". Funciona sem JavaScript.
- Card do curso: capa 16:9, número no expoente dourado, nota ou "Novo", duração, nível, plano mínimo.
- Página do curso (`/cursos/[slug]`): cabeçalho com metadados, cartão lateral fixo com preço e botão que muda conforme quem vê (visitante, aluno, admin), o que aprende, ferramentas, conteúdo em acordeão com prévias, requisitos, descrição, público, instrutores, avaliações, cursos relacionados, compartilhar e dados estruturados `Course` (schema.org). `/trilhas/...` redireciona para `/cursos/...`.
- Planos (`/planos`): degraus, condição de fundador (a do painel, só quando está valendo), tabela de quais cursos cada plano libera e dúvidas sobre a cobrança. "Assinar" leva à página de pagamento do gateway; voltar sem pagar mostra um aviso. Com `?curso=slug`, mostra em quais planos o curso está.
- Conta: `/cadastro` → `/boas-vindas` (três perguntas, todas opcionais), `/entrar`, `/esqueci-senha`, `/redefinir-senha`, `/verificar-email`, `/minha-conta`, `/minha-conta/senha`.
- SEO: `sitemap.xml`, `robots.txt` (áreas pessoais fora da busca), metadados e Open Graph por curso.
- **Player** (`/aprender/[slug]/[aula]`, sem o cabeçalho da vitrine): vídeo com os controles do navegador mais retomar de onde parou, salvar a posição a cada 10 s e ao sair, concluir sozinho ao passar de 90%, velocidade (lembrada entre aulas), atalhos de teclado (espaço/K, ←/→, J/L, F, M, C) e "próxima aula em 5 s"; aulas de texto em Markdown; abas Visão geral e Anotações (presas ao momento do vídeo, clicáveis); currículo lateral recolhível com marcar/desmarcar concluída; tela de parabéns com o certificado. `/aprender/[slug]` leva para a aula de onde o aluno parou. Sem acesso ou sem e-mail confirmado, mostra o que fazer.
- Página do curso: o cartão mostra "Começar", "Continuar" com o progresso, "Ver certificado / Rever", "Confirmar e-mail" ou "Assinar o plano X", conforme o caso. Aulas de prévia abrem num modal, para qualquer visitante.
- Planos: botão "Assinar" em cada plano (visitante vai para o cadastro e volta).
- Área do aluno: `/minha-conta/cursos` (em andamento, concluídos, lista de desejos), `/minha-conta/certificados` e **`/minha-conta/assinatura`** (plano, próxima cobrança, forma de pagamento, condição de fundador, histórico de cobranças com faturas, trocar de plano, cancelar com motivo, reativar, equipe do plano Negócio e as equipes de que a pessoa participa). Convite da equipe em `/equipe/convite`. Na home, "Continue de onde parou". Nos cards, coração da lista de desejos e barra de progresso (carregados à parte, para os cards continuarem em cache para todo mundo).
- Certificado (`/certificados/[codigo]`): página pública de validação que é o próprio certificado, com o desenho da marca; "Salvar em PDF ou imprimir" usa a impressão do navegador em A4 deitado.
- **Painel admin** (`/admin`, layout próprio com navegação lateral, chão creme). Quem não é admin recebe 404; a API confere de novo em toda rota.
  - **Visão geral**: alunos estudando (7/30 dias), contas e e-mails confirmados, cadastros por dia (30 dias), assinaturas ativas por plano, receita mensal estimada, cancelamentos do mês, taxa de conclusão por curso e as aulas onde os alunos param. Cada gráfico tem a tabela equivalente.
  - **Cursos**: busca, filtro por status, ordenação por coluna, ações em lote (publicar, voltar para rascunho, arquivar) e "Novo curso".
  - **Editor de curso** em abas: *Página do curso* (título, subtítulo, endereço gerado e editável, número, categoria, nível, idioma, ferramentas, instrutores, descrição em Markdown com "Ver como fica", listas, resultado final, SEO); *Capa e prévia* (recorte 16:9 no navegador, com arrastar, zoom e teclado, enviado em WebP 1280 × 720; texto alternativo; card como fica no catálogo); *Currículo* (módulos e aulas com arrastar e soltar e botões subir/descer, inclusive entre módulos; gaveta da aula com vídeo, duração lida do arquivo, legenda .vtt, prévia, publicada e materiais); *Acesso* (planos, certificado, carga horária, destaque na home); *Publicar* (checklist que bloqueia a publicação, despublicar, arquivar, duplicar). Rascunho salva sozinho ("Salvo às 14:32"); curso publicado só muda no "Salvar alterações". Pré-visualização como aluno em `/admin/cursos/[id]/previa`.
  - **Categorias** (criar, editar, ordenar, excluir se vazia) e **Instrutores** (com foto quadrada recortada no painel).
  - **Usuários**: busca, filtros (papel, plano, e-mail, situação), paginação e CSV; ficha com conta, sessões abertas, assinatura, acessos manuais (conceder e revogar), cursos e progresso e histórico. Ações: promover/rebaixar admin, bloquear/desbloquear, reenviar confirmação, exigir senha nova, encerrar sessões. Ninguém muda o próprio papel, se bloqueia ou rebaixa o último admin; mudar papel, bloquear ou exigir senha derruba as sessões da pessoa.
  - **Auditoria**: quem fez o quê e quando, com os campos antes/depois, filtrável por ação, item, pessoa e período. Edições seguidas do mesmo item em 10 minutos viram um registro só.
  - **Componentes** (`/admin/design`): o inventário, agora com abas, modal, gaveta lateral, aviso flutuante, paginação, alternador, rádio, área de texto, seleção e tabela com ordenação.
- No player, a aba Visão geral lista os **materiais para baixar** (links assinados de 2 horas) e o vídeo ganha a **legenda** enviada no painel.
- Se a API cair, o cabeçalho e as partes pessoais seguem como visitante; páginas que dependem dela mostram a página de erro da marca.
- **Player**: abas Perguntas (perguntar, responder, "também tenho essa dúvida", ordenar por recentes, mais úteis ou sem resposta; respostas da equipe com o expoente dourado) e Avaliações do curso (estrelas por teclado ou mouse, comentário, editar e apagar; antes de 30%, mostra quanto falta). A tela de parabéns pede a avaliação.
- **Página do curso**: avaliações com média grande, distribuição 5→1 em barras que filtram a lista, "Ver mais" e a resposta da equipe. **Home**: "O que dizem os alunos", só com avaliações reais (sem nenhuma, o bloco não aparece).
- **Planos**: campo de cupom (confere em cada plano e guarda em `?cupom=`); "Minha assinatura" mostra o cupom e quantas cobranças ainda têm desconto. Valores com centavos aparecem com centavos (R$ 62,30).
- **Perfil e privacidade** (`/minha-conta/perfil`): dados, e-mails de novidades, troca de e-mail (`/confirmar-email`), sessões abertas com "Encerrar", "Baixar meus dados" e "Excluir minha conta".
- **Entrar / Criar conta**: "Continuar com o Google" quando configurado.
- **Painel**: Avaliações e Perguntas (filas de moderação) e Cupons na tela de Planos.
- `/termos` e `/privacidade` são **provisórias**: o texto final depende de revisão jurídica.

## Desempenho

Medido no build de produção, no computador (sem CDN), com a limitação do Lighthouse mobile (CPU 4× mais lenta, 4G lento), por `web/scripts/medir-desempenho.mjs`:

| Página | LCP | CLS | TBT | JS (comprimido) |
| --- | --- | --- | --- | --- |
| `/` | 2,1 s | 0 | 1,15 s | 155 KB |
| `/cursos` | 1,6 s | 0 | 0,41 s | 159 KB |
| `/cursos/primeiros-passos` | 1,7 s | 0,003 | 0,52 s | 169 KB |
| `/planos` | 1,5 s | 0,023 | 1,10 s | 159 KB |
| `/entrar` | 2,6 s | 0 | 1,34 s | 165 KB |

LCP e CLS estão dentro do "bom" (até 2,5 s e 0,1), menos o LCP de `/entrar`, no limite. O tempo de bloqueio (TBT) está alto para celular simples (o "bom" é até 0,2 s): é a hidratação do React mais o prefetch dos links visíveis. Próximos passos: medir de novo na Vercel (Speed Insights), adiar o prefetch dos links do rodapé e do cabeçalho e ver o custo da tela de carregamento da home.

```bash
cd plataforma/web && npm run build && npm run start -- -p 3100
```

```bash
cd plataforma/web && node scripts/medir-desempenho.mjs http://localhost:3100
```

## Módulos da API

Cada pasta direta de `br.com.potencia` é um módulo do Spring Modulith (`catalogo`, `contas`, `assinaturas`, `aprendizado`, `comunidade`, `privacidade`, `midia`, `email`, `auditoria`, `administracao`, `compartilhado`). Um módulo não usa as classes internas de outro; o teste `ModularityTests` falha se isso acontecer. O `aprendizado` conversa com os outros só pelos serviços públicos (`CatalogoService`, `AssinaturasService`, `ContaService`, `ProvedorVideo`, `Envios`). O `administracao` só junta os serviços públicos de contas, assinaturas, aprendizado, catálogo e auditoria para a visão geral e a ficha do usuário. A `comunidade` usa catálogo, aprendizado (quem pode ver a aula, percentual concluído) e contas. A `privacidade` só coordena: cada módulo exporta e apaga os próprios dados. A auditoria e a revalidação do site chegam por eventos (`EventoAuditoria`, `SiteDesatualizado`, em `compartilhado`).

Quando os módulos começarem a trocar eventos (por exemplo, "assinatura ativada"), adicione `spring-modulith-starter-jpa` ao `pom.xml` e uma migração com a tabela `event_publication`.

## Produção

**API** (`SPRING_PROFILES_ACTIVE=prod`):

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` | PostgreSQL (JDBC, ex.: `jdbc:postgresql://host:5432/potencia`) |
| `WEB_URL` | Endereço do site, usado nos links dos e-mails |
| `EMAIL_REMETENTE`, `RESEND_CHAVE` | Envio de e-mail pela Resend |
| `ADMIN_EMAIL`, `ADMIN_SENHA_INICIAL` | Primeiro admin (só é criado se não existir nenhum) |
| `PAGAMENTOS_GATEWAY` | `asaas`. Vazio: a assinatura responde que ainda não abriu. **Nunca** `falso` em produção |
| `ASAAS_CHAVE`, `ASAAS_URL` | Chave da API do Asaas e o endereço (`https://api-sandbox.asaas.com` no sandbox; `https://api.asaas.com` em produção, o padrão do perfil prod) |
| `ASAAS_FORMAS` | Formas no checkout (padrão `CREDIT_CARD,PIX`; o Checkout do Asaas não oferece boleto) |
| `PAGAMENTOS_WEBHOOK_TOKEN` | O mesmo `authToken` cadastrado no webhook do Asaas (32 caracteres ou mais) |
| `ASAAS_LINK_ASSINATURA` | Opcional: endereço da assinatura no painel do Asaas, com `{id}` (vira o link "Abrir no gateway" do painel) |
| `VIDEO_PROVEDOR` | Vazio até escolher o provedor (aulas abrem sem vídeo). **Nunca** `exemplo` em produção |
| `ARMAZENAMENTO_PROVEDOR`, `ARMAZENAMENTO_PASTA` | Onde guardar os arquivos do painel. Vazio: o envio responde que não está disponível. `local` só com volume persistente e uma instância (R2/S3 ainda não implementado) |
| `ARQUIVOS_SEGREDO` | Assina as URLs de envio e de arquivos privados (obrigatório; igual em todas as instâncias) |
| `REVALIDAR_SEGREDO` | Segredo para a API pedir ao site a revalidação do catálogo (o mesmo no site) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login com Google (Google Cloud → Credenciais → ID do cliente OAuth "Aplicativo da Web"; URI de redirecionamento: `WEB_URL/api/auth/google/retorno`). Vazios: sem o botão |
| `CONTATO_PRIVACIDADE` | Canal do encarregado de dados (DPO), citado no arquivo de "Baixar meus dados" |
| `PORT` | Porta (padrão 8080) |

O cookie de sessão sai com `Secure` no perfil prod. A API deve ficar acessível só pelo Next (rede interna ou firewall): o IP do cliente vem do `X-Forwarded-For` enviado pelo proxy.

**Site** (Vercel): `API_URL`, `SITE_URL`, `REVALIDAR_SEGREDO` e `NEXT_PUBLIC_LANDING_URL` (endereço da landing; os links "Sobre", "Sobre a PotencIA" e "Lista de espera" levam para lá, e por ser `NEXT_PUBLIC_` o valor entra no build). Na landing, o caminho inverso fica em `dados.js` → `config.plataforma`. A API precisa estar no ar durante o build, porque as páginas dos cursos são geradas a partir dela.

O limite de tentativas de login e o de perguntas e avaliações ficam na memória da API: com mais de uma instância, troque por Redis.

**Asaas**: cadastre um webhook (no painel do Asaas ou por `POST /v3/webhooks`) para `https://<site>/api/webhooks/asaas`, com `authToken` = `PAGAMENTOS_WEBHOOK_TOKEN` e os eventos `CHECKOUT_*`, `SUBSCRIPTION_*` e `PAYMENT_*`. A chamada passa pelo Next (rewrite) até a API. Antes de lançar, faça uma assinatura de ponta a ponta no sandbox: a documentação do Asaas não diz se a referência externa do checkout é copiada para a assinatura e as cobranças, por isso a reconciliação também usa o id do checkout e o cliente.

## Imagens

As capas (`web/public/capas/`) foram geradas a partir das fotos da landing, do Wikimedia Commons, em 16:9. A capa de "Edição de takes reais" é o take vertical das paneleiras sobre fundo carvão. Os créditos ficam no rodapé do site; mantenha-os enquanto as imagens forem usadas.
