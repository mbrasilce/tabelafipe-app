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

-- RLS ligado, sem policies: só a service_role (usada pelas functions da
-- Vercel) acessa. Nenhum código do cliente lê essas tabelas direto.
alter table veiculos_cache enable row level security;
alter table buscas_log enable row level security;
alter table fontes_quota enable row level security;

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
  criado_em timestamptz default now(),
  -- dono do anúncio (Supabase Auth) + ciclo de vida
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'vendido', 'pausado')),
  publicado_em timestamptz not null default now() -- resetado ao reativar; controla a expiração de 30 dias
);

-- RLS ligado. Inserts continuam só via service_role (Edge Functions).
-- Leitura/edição/exclusão do próprio anúncio: liberada pro dono via RLS
-- (o painel /vendedor.html usa a sessão do vendedor direto, sem endpoints
-- customizados).
alter table anuncios enable row level security;

drop policy if exists "vendedor le proprios anuncios" on anuncios;
create policy "vendedor le proprios anuncios" on anuncios for select using (auth.uid() = user_id);

drop policy if exists "vendedor atualiza proprios anuncios" on anuncios;
create policy "vendedor atualiza proprios anuncios" on anuncios for update using (auth.uid() = user_id);

drop policy if exists "vendedor apaga proprios anuncios" on anuncios;
create policy "vendedor apaga proprios anuncios" on anuncios for delete using (auth.uid() = user_id);

create index if not exists idx_anuncios_criado_em on anuncios (criado_em desc);
create index if not exists idx_anuncios_tipo on anuncios (tipo);
create index if not exists idx_anuncios_user_id on anuncios (user_id);

-- Interessados (leads) por anúncio — gerados pelo fluxo "Entrar em contato"
-- em /anuncios.html, via Edge Function solicitar-contato.
create table if not exists interessados (
  id bigint generated always as identity primary key,
  anuncio_id bigint not null references anuncios(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text not null,
  criado_em timestamptz default now()
);
alter table interessados enable row level security;

create index if not exists idx_interessados_anuncio on interessados (anuncio_id);

drop policy if exists "vendedor le interessados dos proprios anuncios" on interessados;
create policy "vendedor le interessados dos proprios anuncios" on interessados for select using (
  exists (select 1 from anuncios a where a.id = interessados.anuncio_id and a.user_id = auth.uid())
);

-- View pública consumida por /anuncios.html: nunca expõe telefone/email —
-- o contato agora é mediado por email (fluxo "Entrar em contato" +
-- Edge Function solicitar-contato), não mais um link direto de WhatsApp.
-- Filtra por status ativo e por publicado_em dentro dos últimos 30 dias
-- (isso resolve a expiração sem precisar de cron job). SECURITY DEFINER é
-- intencional aqui — é o que permite ler através da tabela protegida por
-- RLS acima, expondo só as colunas selecionadas.
drop view if exists anuncios_publicos;
create view anuncios_publicos
with (security_invoker = false)
as
select id, tipo, marca, modelo, ano_modelo, valor_fipe, valor_desejado,
       estado, cidade, cor, quilometragem, pneus, estofados, texto, criado_em
from anuncios
where status = 'ativo' and publicado_em > now() - interval '30 days'
order by publicado_em desc;

grant select on anuncios_publicos to anon, authenticated;

-- ========================================
-- Notícias (RSS) — carros/motos/caminhões
-- ========================================
create table if not exists noticias (
  id bigint generated always as identity primary key,
  categoria text not null check (categoria in ('carros', 'motos', 'caminhoes')),
  titulo text not null,
  resumo text,
  link text not null unique,   -- chave de dedupe: o <link> do item RSS é estável
  imagem_url text,
  fonte text not null,         -- nome do site de origem (ex: 'Quatro Rodas')
  publicado_em timestamptz,    -- parseado do <pubDate>; pode ser null se não parsear
  criado_em timestamptz not null default now()
);

create index if not exists idx_noticias_categoria_publicado
  on noticias (categoria, publicado_em desc);

-- Mesmo padrão de veiculos_cache: RLS ligada, sem policies — só a
-- Edge Function atualizar-noticias e as functions da Vercel (service_role)
-- tocam essa tabela. Nenhum código de navegador lê direto.
alter table noticias enable row level security;

-- ========================================
-- Agendamento (pg_cron + pg_net) da atualização de notícias
-- ========================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- project_url e anon_key ficam no Vault em vez de hardcoded no cron.job
-- (que fica visível em cron.job.command pra quem acessa o SQL editor).
select vault.create_secret('https://cklgxrebbjddhybbkzpn.supabase.co', 'project_url');
select vault.create_secret('<SUPABASE_ANON_KEY>', 'anon_key');

select cron.schedule(
  'atualizar-noticias-a-cada-2h',
  '0 */2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/atualizar-noticias',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000  -- default é só 2000ms, insuficiente pra buscar 4 feeds
  ) as request_id;
  $$
);
