-- Fase 6: perguntas e respostas por aula, avaliações de curso com moderação,
-- cupons de desconto, login com Google e preferências de privacidade.

create table pergunta (
    id            uuid          primary key,
    aula_id       bigint        not null references aula (id),
    curso_id      bigint        not null references curso (id),
    usuario_id    uuid          not null references usuario (id),
    titulo        varchar(160)  not null,
    texto         varchar(4000) not null,
    oculta        boolean       not null default false,
    criado_em     timestamp with time zone not null,
    atualizado_em timestamp with time zone not null
);
create index pergunta_aula on pergunta (aula_id, criado_em);
create index pergunta_curso on pergunta (curso_id);

create table resposta (
    id          uuid          primary key,
    pergunta_id uuid          not null references pergunta (id),
    usuario_id  uuid          not null references usuario (id),
    -- Resposta dada pelo painel, como "Equipe PotencIA" (aparece em destaque).
    da_equipe   boolean       not null,
    texto       varchar(4000) not null,
    oculta      boolean       not null default false,
    criado_em   timestamp with time zone not null
);
create index resposta_pergunta on resposta (pergunta_id, criado_em);

-- "Também tenho essa dúvida": uma marcação por pessoa.
create table pergunta_util (
    pergunta_id uuid not null references pergunta (id),
    usuario_id  uuid not null references usuario (id),
    primary key (pergunta_id, usuario_id)
);

create table avaliacao (
    id              uuid          primary key,
    usuario_id      uuid          not null references usuario (id),
    curso_id        bigint        not null references curso (id),
    nota            integer       not null,
    comentario      varchar(2000),
    status          varchar(20)   not null,
    resposta_equipe varchar(2000),
    respondida_em   timestamp with time zone,
    criado_em       timestamp with time zone not null,
    atualizado_em   timestamp with time zone not null,
    unique (usuario_id, curso_id)
);
create index avaliacao_curso on avaliacao (curso_id, status);

create table cupom (
    id          uuid         primary key,
    codigo      varchar(40)  not null unique,
    descricao   varchar(200),
    percentual  integer      not null,
    -- Em quantas cobranças o desconto vale.
    meses       integer      not null,
    -- Só para este plano (vazio: qualquer plano).
    plano_id    varchar(40)  references plano (id),
    valido_ate  timestamp with time zone,
    limite_usos integer,
    usos        integer      not null default 0,
    ativo       boolean      not null default true,
    criado_em   timestamp with time zone not null
);

alter table assinatura add column cupom_codigo varchar(40);

-- Login com Google: o "sub" (id fixo da conta Google) ligado à conta da PotencIA.
alter table usuario add column google_sub varchar(64);
create unique index usuario_google on usuario (google_sub);

-- Troca de e-mail: o endereço novo espera a confirmação pelo link enviado a ele.
alter table usuario add column email_novo varchar(254);
