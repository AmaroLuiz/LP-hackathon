-- Planos de assinatura e o que cada um libera.

create table plano (
    id            varchar(40)  primary key,
    nome          varchar(80)  not null,
    preco_centavos integer     not null,
    max_pessoas   integer      not null,
    ordem         integer      not null
);

create table plano_item (
    plano_id varchar(40)  not null references plano (id),
    ordem    integer      not null,
    texto    varchar(160) not null,
    primary key (plano_id, ordem)
);

-- Trilhas liberadas por plano, pelo número da trilha (o módulo de assinaturas
-- não depende das entidades do catálogo).
create table plano_trilha (
    plano_id      varchar(40) not null references plano (id),
    trilha_numero integer     not null,
    primary key (plano_id, trilha_numero)
);
