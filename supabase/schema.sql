-- ========================================
-- TabelaFipe.site — schema inicial Supabase
-- ========================================

-- Cache dos veículos já pesquisados (nossa "base replicada" da FIPE)
create table if not exists veiculos_cache (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('carros', 'motos', 'caminhoes')),
  marca text not null,
  modelo text not null,
  ano_modelo integer not null,
  combustivel text,
  codigo_fipe text,
  valor text not null,
  mes_referencia text,
  fonte text not null,          -- qual fonte respondeu (parallelum, fipeapi, fipeonline...)
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  unique (tipo, marca, modelo, ano_modelo, combustivel)
);

-- Log de cada busca feita no chat (útil para analytics e para saber se veio do cache)
create table if not exists buscas_log (
  id bigint generated always as identity primary key,
  tipo text,
  marca text,
  modelo text,
  ano_modelo integer,
  veio_do_cache boolean not null,
  fonte_usada text,
  ip_cliente text,
  criado_em timestamptz default now()
);

-- Controle de quota diária/mensal por fonte externa, pra saber quando "esgotou"
create table if not exists fontes_quota (
  fonte text not null,
  periodo text not null,        -- 'YYYY-MM-DD' (diário) ou 'YYYY-MM' (mensal), conforme o limite da fonte
  requisicoes integer default 0,
  limite integer not null,
  primary key (fonte, periodo)
);

-- Índices úteis para a busca por texto (marca/modelo)
create index if not exists idx_veiculos_cache_busca
  on veiculos_cache (tipo, marca, modelo, ano_modelo);

create index if not exists idx_buscas_log_criado_em
  on buscas_log (criado_em desc);

-- Função usada pela API para incrementar (ou criar) a contagem de uso de uma fonte
create or replace function incrementar_quota(p_fonte text, p_periodo text, p_limite integer)
returns void as $$
begin
  insert into fontes_quota (fonte, periodo, requisicoes, limite)
  values (p_fonte, p_periodo, 1, p_limite)
  on conflict (fonte, periodo)
  do update set requisicoes = fontes_quota.requisicoes + 1;
end;
$$ language plpgsql;

-- ========================================
-- Anúncios de venda (texto gerado com IA)
-- ========================================

-- Anúncios de venda gerados pelo chat (texto criado com IA)
create table if not exists anuncios (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('carros', 'motos', 'caminhoes')),
  marca text not null,
  modelo text not null,
  ano_modelo integer not null,
  valor_fipe text,
  valor_desejado text,
  estado text,
  cidade text,
  cor text,
  quilometragem text,
  pneus text,
  estofados text,
  telefone text not null,
  email text,
  texto text not null,
  criado_em timestamptz default now()
);

-- RLS ligado, sem policies para anon/authenticated: só a service_role
-- (usada pela Edge Function gerar-anuncio) pode inserir/ler a tabela base.
alter table anuncios enable row level security;

create index if not exists idx_anuncios_criado_em on anuncios (criado_em desc);
create index if not exists idx_anuncios_tipo on anuncios (tipo);

-- View pública consumida pela página /anuncios.html: nunca expõe telefone
-- ou email em texto puro, só um link pronto do WhatsApp. SECURITY DEFINER
-- é intencional aqui — é o que permite ela ler através da tabela protegida
-- por RLS acima, expondo só as colunas selecionadas.
create or replace view anuncios_publicos
with (security_invoker = false)
as
select
  id, tipo, marca, modelo, ano_modelo, valor_fipe, valor_desejado,
  estado, cidade, cor, quilometragem, pneus, estofados, texto, criado_em,
  ('https://wa.me/55' || regexp_replace(telefone, '\D', '', 'g')) as whatsapp_link
from anuncios
order by criado_em desc;

grant select on anuncios_publicos to anon, authenticated;
