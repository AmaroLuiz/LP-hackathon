-- Contas de usuário (aluno e admin), tokens enviados por e-mail e sessões.

create table usuario (
    id                  uuid         primary key,
    nome                varchar(120) not null,
    email               varchar(254) not null unique,
    senha_hash          varchar(200) not null,
    papel               varchar(20)  not null,
    email_verificado_em timestamp with time zone,
    -- Ligado no admin criado na inicialização: troca a senha no primeiro acesso.
    deve_trocar_senha   boolean      not null default false,
    avatar_url          varchar(300),
    segmento_negocio    varchar(80),
    nome_negocio        varchar(120),
    cidade              varchar(120),
    telefone            varchar(30),
    bloqueado_em        timestamp with time zone,
    ultimo_acesso_em    timestamp with time zone,
    aceitou_termos_em   timestamp with time zone not null,
    aceitou_marketing   boolean      not null default false,
    criado_em           timestamp with time zone not null,
    atualizado_em       timestamp with time zone not null,
    excluido_em         timestamp with time zone
);

-- Links de uso único (verificar e-mail, redefinir senha, convite).
-- Guarda só o hash SHA-256 do token; o token puro vai apenas no e-mail.
create table token_conta (
    id         uuid        primary key,
    usuario_id uuid        not null references usuario (id),
    tipo       varchar(30) not null,
    token_hash varchar(64) not null unique,
    expira_em  timestamp with time zone not null,
    usado_em   timestamp with time zone,
    criado_em  timestamp with time zone not null
);
create index token_conta_usuario on token_conta (usuario_id, tipo);

-- Sessões do Spring Session JDBC (esquema oficial da biblioteca, versão PostgreSQL).
create table spring_session (
    primary_id            char(36)     not null,
    session_id            char(36)     not null,
    creation_time         bigint       not null,
    last_access_time      bigint       not null,
    max_inactive_interval integer      not null,
    expiry_time           bigint       not null,
    principal_name        varchar(100),
    constraint spring_session_pk primary key (primary_id)
);
create unique index spring_session_ix1 on spring_session (session_id);
create index spring_session_ix2 on spring_session (expiry_time);
create index spring_session_ix3 on spring_session (principal_name);

create table spring_session_attributes (
    session_primary_id char(36)     not null,
    attribute_name     varchar(200) not null,
    attribute_bytes    bytea        not null,
    constraint spring_session_attributes_pk primary key (session_primary_id, attribute_name),
    constraint spring_session_attributes_fk foreign key (session_primary_id)
        references spring_session (primary_id) on delete cascade
);
