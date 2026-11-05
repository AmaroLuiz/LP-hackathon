-- Fase 4: painel admin (edição de cursos, uploads e auditoria).

-- Carga horária do certificado definida no painel. Vazia: soma a duração das aulas.
alter table curso add column carga_horaria_minutos integer;

-- Materiais para baixar: a ordem em que aparecem na aula.
alter table material add column ordem integer not null default 0;

-- Ações de admin e eventos sensíveis de conta (login, senha, papel, bloqueio).
-- "antes" e "depois" guardam, em JSON, só os campos que mudaram.
create table auditoria (
    id          uuid         primary key,
    quando      timestamp with time zone not null,
    autor_id    uuid,
    autor_email varchar(254),
    acao        varchar(60)  not null,
    alvo_tipo   varchar(40)  not null,
    alvo_id     varchar(80)  not null,
    resumo      varchar(300),
    antes       varchar(20000),
    depois      varchar(20000),
    ip          varchar(64)
);
create index auditoria_quando on auditoria (quando);
create index auditoria_alvo on auditoria (alvo_tipo, alvo_id);
create index auditoria_autor on auditoria (autor_id, acao, alvo_tipo, alvo_id);

-- Métricas do painel.
create index progresso_aula_atualizado on progresso_aula (atualizado_em);
create index usuario_criado on usuario (criado_em);
