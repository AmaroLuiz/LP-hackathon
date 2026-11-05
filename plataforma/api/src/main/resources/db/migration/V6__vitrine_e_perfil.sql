-- Fase 2: vitrine (destaques e textos completos dos cursos) e perfil do aluno
-- (respostas do onboarding, usadas nas recomendações).

alter table curso add column destaque boolean not null default false;

alter table usuario add column objetivo varchar(30);
alter table usuario add column familiaridade varchar(30);
alter table usuario add column onboarding_concluido_em timestamp with time zone;

-- Cursos em destaque na home (o admin escolhe no painel a partir da fase 4).
update curso set destaque = true where numero in (0, 2, 5);

-- ---------------------------------------------------------------------------
-- Textos das páginas dos cursos. Rascunho a partir da landing: revise e ajuste
-- pelo painel admin (fase 4).
-- ---------------------------------------------------------------------------

update curso set descricao = 'Este é o ponto de partida da PotencIA. Você instala o Claude, cria sua conta no GitHub e entende para que serve cada coisa, sem termo técnico.

Cada passo é mostrado na tela, devagar. No fim, seu computador está pronto e você já fez o primeiro pedido ao Claude.'
where numero = 0;
update curso set descricao = 'Postar sem saber o que postar cansa e não traz cliente. Aqui você define para quem fala, quais temas aproximam quem compra e com que frequência publicar.

Depois, o Claude escreve os roteiros com você, a partir do que o seu negócio vende de verdade.'
where numero = 1;
update curso set descricao = 'Vídeos animados com cara de agência, feitos por você. O Remotion monta a animação e o Claude escreve o que precisa: você descreve o vídeo, ajusta e exporta.

Textos que entram no ritmo, preços que aparecem na hora certa e a sua marca em movimento.'
where numero = 2;
update curso set descricao = 'Você já grava no celular. Este curso ensina o acabamento: cortes no tempo certo, legendas que se leem sem som e enquadramento que valoriza o produto.

Tudo a partir dos seus próprios takes.'
where numero = 3;
update curso set descricao = 'Narração natural em português, sem estúdio e sem gravar dez vezes. Você escolhe a voz no ElevenLabs, escreve o texto pensando em como ele soa e junta a narração ao vídeo.'
where numero = 4;
update curso set descricao = 'Arte bonita que ninguém entende não vende. Você aprende hierarquia, escolhe a identidade da sua marca e monta carrosséis que se entendem em três segundos.'
where numero = 5;
update curso set descricao = 'O último passo: transformar post em conversa. Chamadas para ação que levam ao WhatsApp, publicação no formato certo e leitura dos números que importam.

No fim, você tem o seu primeiro relatório: o que trouxe cliente e o que não trouxe.'
where numero = 6;

insert into curso_aprendizado (curso_id, ordem, texto)
select id, 0, 'Instalar o Claude no computador, passo a passo' from curso where numero = 0
union all select id, 1, 'Criar sua conta no GitHub e entender para que ela serve' from curso where numero = 0
union all select id, 2, 'Fazer os primeiros pedidos ao Claude com segurança' from curso where numero = 0
union all select id, 3, 'Organizar uma pasta de trabalho para os próximos cursos' from curso where numero = 0
union all select id, 0, 'Definir para quem o seu negócio fala' from curso where numero = 1
union all select id, 1, 'Escolher temas que aproximam quem compra' from curso where numero = 1
union all select id, 2, 'Montar um calendário de um mês' from curso where numero = 1
union all select id, 3, 'Escrever roteiros com o Claude a partir do que você vende' from curso where numero = 1
union all select id, 0, 'Criar animações com o Remotion pedindo ao Claude' from curso where numero = 2
union all select id, 1, 'Fazer textos e preços entrarem no ritmo' from curso where numero = 2
union all select id, 2, 'Aplicar as cores, as fontes e o logo da sua marca' from curso where numero = 2
union all select id, 3, 'Exportar no formato do Reels' from curso where numero = 2
union all select id, 0, 'Gravar no celular com luz e enquadramento melhores' from curso where numero = 3
union all select id, 1, 'Cortar os takes no tempo certo' from curso where numero = 3
union all select id, 2, 'Colocar legendas legíveis' from curso where numero = 3
union all select id, 3, 'Montar um Reels com começo, meio e chamada' from curso where numero = 3
union all select id, 0, 'Escolher uma voz natural em português no ElevenLabs' from curso where numero = 4
union all select id, 1, 'Escrever o texto pensando em como ele soa' from curso where numero = 4
union all select id, 2, 'Gerar e ajustar a narração' from curso where numero = 4
union all select id, 3, 'Juntar a narração ao seu vídeo' from curso where numero = 4
union all select id, 0, 'Hierarquia: o que o olho vê primeiro' from curso where numero = 5
union all select id, 1, 'Definir a identidade visual da sua marca' from curso where numero = 5
union all select id, 2, 'Estruturar um carrossel de cinco telas' from curso where numero = 5
union all select id, 3, 'Escrever títulos que fazem a pessoa deslizar' from curso where numero = 5
union all select id, 0, 'Escrever chamadas para ação que levam ao WhatsApp' from curso where numero = 6
union all select id, 1, 'Publicar no formato certo para cada rede' from curso where numero = 6
union all select id, 2, 'Ler os números que importam' from curso where numero = 6
union all select id, 3, 'Montar um relatório simples do que trouxe cliente' from curso where numero = 6;

insert into curso_requisito (curso_id, ordem, texto)
select id, 0, 'Computador com Windows ou Mac e acesso à internet' from curso where numero = 0
union all select id, 1, 'Nenhum conhecimento de tecnologia' from curso where numero = 0
union all select id, 0, 'Ter feito o curso Primeiros passos, ou já usar o Claude' from curso where numero in (1, 2, 5, 6)
union all select id, 0, 'Celular com câmera' from curso where numero = 3
union all select id, 1, 'Ter feito o curso Primeiros passos, ou já usar o Claude' from curso where numero = 3
union all select id, 0, 'Uma conta gratuita no ElevenLabs (o curso mostra como criar)' from curso where numero = 4;

insert into curso_publico (curso_id, ordem, texto)
select id, 0, 'Quem nunca usou inteligência artificial' from curso where numero = 0
union all select id, 1, 'Quem tem receio de instalar programas e criar contas' from curso where numero = 0
union all select id, 0, 'Quem posta sem saber o que postar' from curso where numero = 1
union all select id, 1, 'Quem quer constância sem passar horas atrás de ideia' from curso where numero = 1
union all select id, 0, 'Quem quer vídeos com cara profissional sem contratar editor' from curso where numero = 2
union all select id, 0, 'Quem já grava vídeos e sente que falta acabamento' from curso where numero = 3
union all select id, 0, 'Quem não gosta de gravar a própria voz' from curso where numero = 4
union all select id, 1, 'Quem quer narrar vídeos sem estúdio' from curso where numero = 4
union all select id, 0, 'Quem faz artes e sente que elas ficam poluídas' from curso where numero = 5
union all select id, 0, 'Quem posta, mas não sabe se o post vende' from curso where numero = 6;
