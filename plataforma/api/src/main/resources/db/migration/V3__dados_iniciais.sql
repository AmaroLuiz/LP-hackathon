-- Conteúdo inicial, o mesmo da landing (dados.js).

insert into trilha (slug, numero, nome, ferramentas, aprende, resultado, foto) values
('primeiros-passos', 0, 'Primeiros passos', 'Claude e GitHub',
 'Instalar o Claude e criar sua conta no GitHub, sem medo de tecnologia. Cada passo mostrado na tela, sem termo técnico.',
 'seu computador pronto e o primeiro pedido feito ao Claude.', '/trilhas/teclado.webp'),
('estrategia-de-conteudo', 1, 'Estratégia de conteúdo', 'Claude',
 'O que postar, para quem e com qual objetivo. Roteiros escritos com o Claude a partir do que o seu negócio vende.',
 'um mês de conteúdo planejado, com os roteiros prontos.', '/trilhas/caderno-visconti.webp'),
('videos-em-motion', 2, 'Vídeos em motion', 'Remotion e Claude',
 'Animações profissionais com Remotion e Claude: textos que entram no ritmo, preços que aparecem, sua marca em movimento.',
 'um vídeo animado de 30 segundos com a sua marca.', '/trilhas/tipos.webp'),
('edicao-de-takes-reais', 3, 'Edição de takes reais', 'Remotion e Claude',
 'Gravações do celular viram vídeos de qualidade: cortes no tempo certo, legendas legíveis e bom enquadramento.',
 'um Reels editado a partir dos seus próprios takes.', '/trilhas/paneleiras.webp'),
('voz-e-narracao', 4, 'Voz e narração', 'ElevenLabs',
 'Locuções naturais com o ElevenLabs para narrar seus vídeos, sem estúdio e sem gravar dez vezes.',
 'a narração do seu vídeo, com voz natural em português.', '/trilhas/microfone.webp'),
('artes-e-carrosseis', 5, 'Artes e carrosséis que vendem', 'Claude',
 'Design limpo, hierarquia e identidade. Como montar um carrossel que se entende em três segundos.',
 'um carrossel de cinco telas no padrão da sua marca.', '/trilhas/pao-frances.webp'),
('da-postagem-a-venda', 6, 'Da postagem à venda', 'Todas as ferramentas',
 'Chamadas para ação, publicação e leitura de resultados. O caminho do post até a conversa no WhatsApp.',
 'seu primeiro relatório: o que trouxe cliente e o que não trouxe.', '/trilhas/celular.webp');

-- VALORES PROVISÓRIOS: preços e itens ainda em validação.
insert into plano (id, nome, preco_centavos, max_pessoas, ordem) values
('essencial', 'Essencial', 4900, 1, 1),
('completo', 'Completo', 8900, 1, 2),
('negocio', 'Negócio', 14900, 3, 3);

insert into plano_item (plano_id, ordem, texto) values
('essencial', 0, 'Trilhas 0, 1 e 5'),
('essencial', 1, 'Artes e carrosséis'),
('essencial', 2, 'Atualizações todo mês'),
('essencial', 3, '1 pessoa'),
('completo', 0, 'As 7 trilhas'),
('completo', 1, 'Vídeo, voz, artes e carrosséis'),
('completo', 2, 'Modelos prontos para adaptar'),
('completo', 3, 'Atualizações todo mês'),
('completo', 4, '1 pessoa'),
('negocio', 0, 'Tudo do plano Completo'),
('negocio', 1, 'Até 3 pessoas da equipe'),
('negocio', 2, 'Uma revisão do seu conteúdo por mês'),
('negocio', 3, 'Encontro ao vivo todo mês'),
('negocio', 4, 'Atualizações todo mês');

insert into plano_trilha (plano_id, trilha_numero) values
('essencial', 0), ('essencial', 1), ('essencial', 5),
('completo', 0), ('completo', 1), ('completo', 2), ('completo', 3), ('completo', 4), ('completo', 5), ('completo', 6),
('negocio', 0), ('negocio', 1), ('negocio', 2), ('negocio', 3), ('negocio', 4), ('negocio', 5), ('negocio', 6);
