/* ==========================================================================
   PotencIA · dados.js
   Conteúdo editável da landing page. O main.js monta as trilhas, os planos,
   a equipe e as opções do formulário a partir deste arquivo.
   Edite só os textos entre aspas; mantenha vírgulas e chaves no lugar.
   ========================================================================== */

window.POTENCIA_DADOS = {

  /* ------------------------------------------------------------------------
     Configuração geral
     ------------------------------------------------------------------------ */
  config: {
    // Nome do evento. Aparece no bloco do hackathon, nos planos e no rodapé.
    hackathon: 'SE²PIN²',

    // Endereço que recebe os cadastros da lista de espera.
    // Formspree: crie um formulário em https://formspree.io, copie o endpoint
    // e cole aqui, por exemplo: 'https://formspree.io/f/abcdwxyz'.
    // Vazio = modo demonstração (o formulário mostra o sucesso, mas não envia nada).
    formEndpoint: '',

    // Redes sociais do rodapé. Troque '#' pelo endereço do perfil.
    redes: [
      { nome: 'Instagram', url: '#' },
      { nome: 'YouTube', url: '#' },
      { nome: 'LinkedIn', url: '#' },
      { nome: 'TikTok', url: '#' }
    ],

    // E-mail de contato no rodapé. Vazio = a linha não aparece.
    email: '',

    // Opções do campo "Segmento do negócio" no formulário.
    segmentos: [
      'Alimentação (padaria, lanchonete, restaurante)',
      'Beleza e estética',
      'Moda e acessórios',
      'Saúde e bem-estar',
      'Serviços (oficina, conserto, limpeza)',
      'Comércio local',
      'Educação e cursos',
      'Outro'
    ]
  },

  /* ------------------------------------------------------------------------
     Trilhas
     numero: aparece como expoente na foto e no nome ("Trilha 0").
     foto: miniatura quadrada em assets/mini/ (160 × 160 px).
     ------------------------------------------------------------------------ */
  trilhas: [
    {
      numero: 0,
      nome: 'Primeiros passos',
      ferramentas: 'Claude e GitHub',
      aprende: 'Instalar o Claude e criar sua conta no GitHub, sem medo de tecnologia. Cada passo mostrado na tela, sem termo técnico.',
      resultado: 'seu computador pronto e o primeiro pedido feito ao Claude.',
      foto: 'assets/mini/teclado.webp'
    },
    {
      numero: 1,
      nome: 'Estratégia de conteúdo',
      ferramentas: 'Claude',
      aprende: 'O que postar, para quem e com qual objetivo. Roteiros escritos com o Claude a partir do que o seu negócio vende.',
      resultado: 'um mês de conteúdo planejado, com os roteiros prontos.',
      foto: 'assets/mini/caderno-visconti.webp'
    },
    {
      numero: 2,
      nome: 'Vídeos em motion',
      ferramentas: 'Remotion e Claude',
      aprende: 'Animações profissionais com Remotion e Claude: textos que entram no ritmo, preços que aparecem, sua marca em movimento.',
      resultado: 'um vídeo animado de 30 segundos com a sua marca.',
      foto: 'assets/mini/tipos.webp'
    },
    {
      numero: 3,
      nome: 'Edição de takes reais',
      ferramentas: 'Remotion e Claude',
      aprende: 'Gravações do celular viram vídeos de qualidade: cortes no tempo certo, legendas legíveis e bom enquadramento.',
      resultado: 'um Reels editado a partir dos seus próprios takes.',
      foto: 'assets/mini/paneleiras.webp'
    },
    {
      numero: 4,
      nome: 'Voz e narração',
      ferramentas: 'ElevenLabs',
      aprende: 'Locuções naturais com o ElevenLabs para narrar seus vídeos, sem estúdio e sem gravar dez vezes.',
      resultado: 'a narração do seu vídeo, com voz natural em português.',
      foto: 'assets/mini/microfone.webp'
    },
    {
      numero: 5,
      nome: 'Artes e carrosséis que vendem',
      ferramentas: 'Claude',
      aprende: 'Design limpo, hierarquia e identidade. Como montar um carrossel que se entende em três segundos.',
      resultado: 'um carrossel de cinco telas no padrão da sua marca.',
      foto: 'assets/mini/pao-frances.webp'
    },
    {
      numero: 6,
      nome: 'Da postagem à venda',
      ferramentas: 'Todas as ferramentas',
      aprende: 'Chamadas para ação, publicação e leitura de resultados. O caminho do post até a conversa no WhatsApp.',
      resultado: 'seu primeiro relatório: o que trouxe cliente e o que não trouxe.',
      foto: 'assets/mini/celular.webp'
    }
  ],

  /* ------------------------------------------------------------------------
     Planos de assinatura mensal
     VALORES PROVISÓRIOS: preços e itens ainda em validação.
     Troque antes do lançamento. Os blocos sobem em degraus na ordem da lista.
     ------------------------------------------------------------------------ */
  planos: [
    {
      id: 'essencial',
      nome: 'Essencial',
      preco: 49, // VALORES PROVISÓRIOS
      inclui: ['Trilhas 0, 1 e 5', 'Artes e carrosséis', 'Atualizações todo mês', '1 pessoa']
    },
    {
      id: 'completo',
      nome: 'Completo',
      preco: 89, // VALORES PROVISÓRIOS
      inclui: ['As 7 trilhas', 'Vídeo, voz, artes e carrosséis', 'Modelos prontos para adaptar', 'Atualizações todo mês', '1 pessoa']
    },
    {
      id: 'negocio',
      nome: 'Negócio',
      preco: 149, // VALORES PROVISÓRIOS
      inclui: ['Tudo do plano Completo', 'Até 3 pessoas da equipe', 'Uma revisão do seu conteúdo por mês', 'Encontro ao vivo todo mês', 'Atualizações todo mês']
    }
  ],

  // VALORES PROVISÓRIOS: condição especial de quem entra na lista de espera.
  fundador: {
    desconto: 0.5,   // 0.5 = metade do valor
    meses: 3,        // por quantos meses vale o desconto
    travaMeses: 12   // por quantos meses o preço de lançamento fica garantido
  },

  /* ------------------------------------------------------------------------
     Equipe (nomes e funções provisórios)
     foto: caminho da imagem, por exemplo 'assets/equipe/ana.webp' (retrato 4:5).
     Vazio = mostra as iniciais no lugar da foto.
     ------------------------------------------------------------------------ */
  equipe: [
    { nome: 'Luiz Amaro', funcao: 'Programação e marketing', foto: '' },
    { nome: 'Pedro Kliemann', funcao: 'Idealização', foto: '' },
    { nome: 'Gabriel Henrique', funcao: 'Roteirista e gravador', foto: '' },
    { nome: 'Lucas Andrade', funcao: 'Coleta de dados', foto: '' },
    { nome: 'Samuel Salles', funcao: 'Coleta de dados', foto: '' },
    { nome: 'Ramon Henrique', funcao: 'Idealização e marketing', foto: '' }
  ]
};
