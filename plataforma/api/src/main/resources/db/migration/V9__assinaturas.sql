-- Fase 5: assinaturas de verdade (checkout no gateway, webhooks, pagamentos,
-- troca de plano, cancelamento, equipe do plano Negócio e condição de fundador).

-- Plano fora de venda some do site, mas quem já assina continua.
alter table plano add column ativo boolean not null default true;

-- O que foi contratado fica na assinatura: mudar o preço do plano depois não
-- muda o que a pessoa paga sem aviso (ver Assinatura.precoCentavos).
alter table assinatura add column preco_centavos integer;
update assinatura set preco_centavos = (select p.preco_centavos from plano p where p.id = assinatura.plano_id);
alter table assinatura alter column preco_centavos set not null;

-- Condição de fundador, congelada na contratação.
alter table assinatura add column fundador boolean not null default false;
alter table assinatura add column desconto_percentual integer not null default 0;
alter table assinatura add column meses_desconto integer not null default 0;
alter table assinatura add column preco_travado_ate timestamp with time zone;

alter table assinatura add column pagamentos_confirmados integer not null default 0;
alter table assinatura add column motivo_cancelamento varchar(300);
-- Troca para um plano mais barato: vale a partir do próximo ciclo.
alter table assinatura add column plano_agendado_id varchar(40) references plano (id);
-- Ligação com o gateway: checkout (página de pagamento), cliente e assinatura.
alter table assinatura add column checkout_id varchar(120);
alter table assinatura add column checkout_url varchar(500);
alter table assinatura add column gateway_cliente varchar(120);
alter table assinatura add column atualizada_em timestamp with time zone;
update assinatura set atualizada_em = criada_em;
create index assinatura_gateway_id on assinatura (gateway_id);
create index assinatura_checkout on assinatura (checkout_id);
create index assinatura_cliente on assinatura (gateway_cliente);

-- Cobranças. O dado do cartão nunca passa por aqui: o pagamento é na página do gateway.
create table pagamento (
    id             uuid         primary key,
    assinatura_id  uuid         not null references assinatura (id),
    gateway_id     varchar(120) unique,
    valor_centavos integer      not null,
    metodo         varchar(20),
    status         varchar(20)  not null,
    vencimento     date,
    pago_em        timestamp with time zone,
    url_fatura     varchar(500),
    criado_em      timestamp with time zone not null,
    atualizado_em  timestamp with time zone not null
);
create index pagamento_assinatura on pagamento (assinatura_id);
create index pagamento_pago_em on pagamento (pago_em);

-- Eventos recebidos do gateway (webhook). O id do evento é a chave: o mesmo
-- evento entregue duas vezes é processado uma vez só.
create table evento_gateway (
    id            varchar(120) primary key,
    gateway       varchar(20)  not null,
    tipo          varchar(60)  not null,
    payload       varchar(20000) not null,
    assinatura_id uuid         references assinatura (id),
    recebido_em   timestamp with time zone not null,
    processado_em timestamp with time zone,
    tentativas    integer      not null default 0,
    erro          varchar(500)
);
create index evento_gateway_pendente on evento_gateway (processado_em);

-- Equipe do plano Negócio: convites (por e-mail, link de uso único) e membros.
create table membro_equipe (
    id               uuid         primary key,
    assinatura_id    uuid         not null references assinatura (id),
    email            varchar(254) not null,
    usuario_id       uuid         references usuario (id),
    status           varchar(20)  not null,
    token_hash       varchar(64)  unique,
    convite_expira_em timestamp with time zone,
    convidado_em     timestamp with time zone not null,
    entrou_em        timestamp with time zone,
    removido_em      timestamp with time zone
);
create index membro_equipe_assinatura on membro_equipe (assinatura_id, status);
create index membro_equipe_usuario on membro_equipe (usuario_id, status);

-- Condição de fundador (uma linha só, editada no painel) e a lista de espera.
create table condicao_fundador (
    id                  integer primary key,
    ativa               boolean not null,
    desconto_percentual integer not null,
    meses_desconto      integer not null,
    meses_preco_travado integer not null,
    valida_ate          timestamp with time zone
);
insert into condicao_fundador (id, ativa, desconto_percentual, meses_desconto, meses_preco_travado)
values (1, true, 50, 3, 12);

create table fundador_email (
    email         varchar(254) primary key,
    adicionado_em timestamp with time zone not null
);
