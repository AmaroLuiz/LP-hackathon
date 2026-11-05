-- Fase 3: aprendizado (matrícula, progresso, anotações, lista de desejos,
-- certificado) e a base do acesso pago (assinatura e acesso manual).

-- Assinatura: só o essencial para liberar cursos. Cobrança, webhooks, troca de
-- plano e equipe completam na fase 5.
create table assinatura (
    id                uuid        primary key,
    usuario_id        uuid        not null references usuario (id),
    plano_id          varchar(40) not null references plano (id),
    status            varchar(20) not null,
    gateway           varchar(20) not null,
    gateway_id        varchar(120),
    inicio            timestamp with time zone not null,
    fim_periodo_atual timestamp with time zone not null,
    cancelada_em      timestamp with time zone,
    criada_em         timestamp with time zone not null
);
create index assinatura_usuario on assinatura (usuario_id, status);

-- Acesso concedido por um admin (cortesia, parceria, suporte), com motivo e validade.
create table acesso_manual (
    id            uuid         primary key,
    usuario_id    uuid         not null references usuario (id),
    curso_id      bigint       references curso (id),
    plano_id      varchar(40)  references plano (id),
    motivo        varchar(300) not null,
    concedido_por uuid         not null references usuario (id),
    expira_em     timestamp with time zone,
    criado_em     timestamp with time zone not null
);
create index acesso_manual_usuario on acesso_manual (usuario_id);

create table matricula (
    id            uuid   primary key,
    usuario_id    uuid   not null references usuario (id),
    curso_id      bigint not null references curso (id),
    iniciada_em   timestamp with time zone not null,
    atualizada_em timestamp with time zone not null,
    concluida_em  timestamp with time zone,
    ultima_aula_id bigint references aula (id),
    unique (usuario_id, curso_id)
);

create table progresso_aula (
    usuario_id       uuid    not null references usuario (id),
    aula_id          bigint  not null references aula (id),
    posicao_segundos integer not null default 0,
    concluida_em     timestamp with time zone,
    atualizado_em    timestamp with time zone not null,
    primary key (usuario_id, aula_id)
);

create table anotacao (
    id               uuid          primary key,
    usuario_id       uuid          not null references usuario (id),
    aula_id          bigint        not null references aula (id),
    posicao_segundos integer       not null,
    texto            varchar(2000) not null,
    criado_em        timestamp with time zone not null,
    atualizado_em    timestamp with time zone not null
);
create index anotacao_usuario_aula on anotacao (usuario_id, aula_id);

create table lista_desejos (
    usuario_id uuid   not null references usuario (id),
    curso_id   bigint not null references curso (id),
    criado_em  timestamp with time zone not null,
    primary key (usuario_id, curso_id)
);

-- Certificado: guarda o nome e o título como estavam na emissão (o documento não
-- muda se a conta ou o curso forem renomeados depois).
create table certificado (
    id                    uuid         primary key,
    codigo                varchar(20)  not null unique,
    usuario_id            uuid         not null references usuario (id),
    curso_id              bigint       not null references curso (id),
    nome_aluno            varchar(120) not null,
    titulo_curso          varchar(160) not null,
    carga_horaria_minutos integer      not null,
    emitido_em            timestamp with time zone not null,
    unique (usuario_id, curso_id)
);
