-- SÓ NO AMBIENTE LOCAL (pasta db/exemplos, fora do perfil prod).
-- Currículo de exemplo para exercitar a vitrine: acordeão de módulos, duração,
-- aulas de prévia e filtros. Não é o conteúdo real dos cursos.

insert into modulo (curso_id, ordem, titulo, descricao)
select id, 1, 'Preparando o computador', 'Instalação e contas, um passo de cada vez.' from curso where numero = 0
union all select id, 2, 'Primeiros pedidos', 'Como pedir bem e o que esperar da resposta.' from curso where numero = 0
union all select id, 1, 'A primeira animação', 'Do pedido ao Claude ao vídeo exportado.' from curso where numero = 2
union all select id, 2, 'Sua marca em movimento', 'Cores, fontes, logo e ritmo.' from curso where numero = 2
union all select id, 1, 'Fundamentos de design', 'O que faz uma arte se entender rápido.' from curso where numero = 5;

insert into aula (modulo_id, ordem, titulo, tipo, resumo, duracao_segundos, previa, publicada)
select m.id, 1, 'Boas-vindas: o que você vai fazer', 'VIDEO', 'Um tour pelo curso.', 185, true, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 0 and m.ordem = 1
union all select m.id, 2, 'Baixando e instalando o Claude', 'VIDEO', null, 492, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 0 and m.ordem = 1
union all select m.id, 3, 'Criando sua conta no GitHub', 'VIDEO', null, 431, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 0 and m.ordem = 1
union all select m.id, 1, 'Como pedir bem: contexto, tarefa e formato', 'VIDEO', null, 618, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 0 and m.ordem = 2
union all select m.id, 2, 'Seu primeiro pedido de verdade', 'EXERCICIO', 'Peça ao Claude três ideias de post.', 720, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 0 and m.ordem = 2
union all select m.id, 1, 'O que é o Remotion (e por que ele)', 'VIDEO', null, 240, true, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 2 and m.ordem = 1
union all select m.id, 2, 'Pedindo a primeira animação ao Claude', 'VIDEO', null, 905, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 2 and m.ordem = 1
union all select m.id, 3, 'Exportando para o Reels', 'VIDEO', null, 380, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 2 and m.ordem = 1
union all select m.id, 1, 'Cores e fontes da sua marca', 'VIDEO', null, 640, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 2 and m.ordem = 2
union all select m.id, 2, 'Preço que aparece no tempo da música', 'VIDEO', null, 775, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 2 and m.ordem = 2
union all select m.id, 1, 'Hierarquia em três segundos', 'VIDEO', null, 420, true, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 5 and m.ordem = 1
union all select m.id, 2, 'Montando o carrossel', 'VIDEO', null, 1080, false, true
  from modulo m join curso c on c.id = m.curso_id where c.numero = 5 and m.ordem = 1;
