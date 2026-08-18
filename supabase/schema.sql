-- ============================================
-- Schema: Sistema OS para Técnicos de AC
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Habilita UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- TABELA: profiles (estende auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null default '',
  telefone text default '',
  empresa text default '',
  email text default '',
  avatar_url text default '',
  cover_url text default '',
  created_at timestamptz default now()
);

-- Adiciona colunas caso a tabela já exista (migration segura)
alter table public.profiles add column if not exists email text default '';
alter table public.profiles add column if not exists avatar_url text default '';
alter table public.profiles add column if not exists cover_url text default '';

-- Cria perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'telefone', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Função RPC para buscar email por telefone sem depender do RLS
-- (usuário não está autenticado ainda no momento do login por telefone)
create or replace function public.get_email_by_phone(phone_input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  found_email text;
begin
  select email into found_email
  from public.profiles
  where telefone = phone_input
  limit 1;
  return found_email;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- TABELA: clientes
-- ============================================
create table if not exists public.clientes (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null,
  telefone text not null default '',
  endereco text default '',
  created_at timestamptz default now()
);

create index if not exists idx_clientes_tecnico on public.clientes(tecnico_id);

-- ============================================
-- TABELA: ordens_servico
-- ============================================
create sequence if not exists os_numero_seq;

create table if not exists public.ordens_servico (
  id uuid default uuid_generate_v4() primary key,
  numero integer default nextval('os_numero_seq') not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  tipo_servico text not null default 'Manutenção',
  descricao text default '',
  status text not null default 'orcamento'
    check (status in ('orcamento', 'aprovado', 'em_andamento', 'concluido', 'cancelado')),
  valor numeric(10, 2) default 0,
  data_agendamento date,
  hora_agendamento time,
  observacoes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_os_tecnico on public.ordens_servico(tecnico_id);
create index if not exists idx_os_cliente on public.ordens_servico(cliente_id);
create index if not exists idx_os_status on public.ordens_servico(status);

-- Atualiza updated_at automaticamente
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.ordens_servico;
create trigger set_updated_at
  before update on public.ordens_servico
  for each row execute procedure public.update_updated_at();

-- ============================================
-- RLS (Row Level Security) — cada técnico
-- só vê seus próprios dados
-- ============================================
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.ordens_servico enable row level security;

-- Profiles
drop policy if exists "Usuário vê apenas seu perfil" on public.profiles;
create policy "Usuário vê apenas seu perfil"
  on public.profiles for all
  using (auth.uid() = id);

-- Clientes
drop policy if exists "Técnico vê seus clientes" on public.clientes;
create policy "Técnico vê seus clientes"
  on public.clientes for all
  using (auth.uid() = tecnico_id);

-- Ordens de serviço
drop policy if exists "Técnico vê suas OS" on public.ordens_servico;
create policy "Técnico vê suas OS"
  on public.ordens_servico for all
  using (auth.uid() = tecnico_id);

-- ============================================
-- TABELA: gastos (controle financeiro)
-- ============================================
create table if not exists public.gastos (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  data date not null default current_date,
  categoria text not null default 'Outros',
  descricao text not null,
  valor numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_gastos_tecnico on public.gastos(tecnico_id);
create index if not exists idx_gastos_data on public.gastos(tecnico_id, data);

alter table public.gastos enable row level security;

drop policy if exists "Técnico vê seus gastos" on public.gastos;
create policy "Técnico vê seus gastos"
  on public.gastos for all
  using (auth.uid() = tecnico_id);

-- ============================================
-- TABELA: receitas (controle financeiro)
-- ============================================
create table if not exists public.receitas (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  data date not null default current_date,
  descricao text not null,
  valor numeric(10,2) not null default 0,
  ordem_id uuid references public.ordens_servico(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_receitas_tecnico on public.receitas(tecnico_id);
create index if not exists idx_receitas_data on public.receitas(tecnico_id, data);

alter table public.receitas enable row level security;

drop policy if exists "Técnico vê suas receitas" on public.receitas;
create policy "Técnico vê suas receitas"
  on public.receitas for all
  using (auth.uid() = tecnico_id);

-- ============================================
-- TABELA: lembretes_manutencao
-- ============================================
create table if not exists public.lembretes_manutencao (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  ordem_id uuid references public.ordens_servico(id) on delete set null,
  tipo_servico text default 'Manutenção',
  data_prevista date not null,
  intervalo_meses int not null default 6,
  status text not null default 'pendente'
    check (status in ('pendente', 'concluido', 'dispensado')),
  created_at timestamptz default now()
);

create index if not exists idx_lembretes_tecnico on public.lembretes_manutencao(tecnico_id);
create index if not exists idx_lembretes_status on public.lembretes_manutencao(status);
create index if not exists idx_lembretes_data on public.lembretes_manutencao(data_prevista);

alter table public.lembretes_manutencao enable row level security;

drop policy if exists "Técnico gerencia seus lembretes" on public.lembretes_manutencao;
create policy "Técnico gerencia seus lembretes"
  on public.lembretes_manutencao for all
  using (auth.uid() = tecnico_id)
  with check (auth.uid() = tecnico_id);

-- ============================================
-- MIGRATION: Assinatura / Trial
-- ============================================
alter table public.profiles add column if not exists trial_starts_at timestamptz;
alter table public.profiles add column if not exists subscribed_until timestamptz;
alter table public.profiles add column if not exists plan text
  check (plan in ('monthly', 'monthly_saida50', 'plus', 'professional', 'annual'));
alter table public.profiles add column if not exists plan_locked_at timestamptz default null;
alter table public.profiles add column if not exists mp_subscription_id text;

-- Override manual: libera o histórico completo de OS de um cliente Básico
-- específico (ex: reclamação) sem destravar o resto do plano dele.
alter table public.profiles add column if not exists historico_liberado boolean not null default false;

-- Add-on pago do Assistente IA (R$19,90/mês) — independente do plano base,
-- por isso é uma coluna própria e não um valor em profiles.plan.
alter table public.profiles add column if not exists ai_addon_until timestamptz default null;
alter table public.profiles add column if not exists ai_addon_auto_renew boolean not null default false;

-- Usuários já existentes: trial começa da data de criação da conta
update public.profiles
  set trial_starts_at = created_at
  where trial_starts_at is null;

-- ============================================
-- MIGRATION: Recibo, Forma de Pagamento e Garantia
-- ============================================
alter table public.ordens_servico add column if not exists forma_pagamento text;
alter table public.ordens_servico add column if not exists garantia_valor integer;
alter table public.ordens_servico add column if not exists garantia_unidade text;
alter table public.ordens_servico add column if not exists garantia_vencimento date;
alter table public.ordens_servico add column if not exists garantia_obs text;

-- ============================================
-- MIGRATION: Pagamento parcial / múltiplas formas de pagamento
-- ============================================
-- `pagamentos`: array de { forma, valor } — cobre o caso de pagamento
-- dividido (ex: parte no Pix, parte em dinheiro). Quando presente, é a fonte
-- de verdade sobre o que foi recebido; `forma_pagamento` continua sendo
-- gravado com a primeira forma só por compatibilidade com código antigo.
-- `data_pagamento_pendente`: previsão de quando o saldo restante (valor da
-- OS menos a soma de `pagamentos`) será pago, quando o pagamento não foi
-- recebido por completo na conclusão do serviço.
alter table public.ordens_servico add column if not exists pagamentos jsonb;
alter table public.ordens_servico add column if not exists data_pagamento_pendente date;
alter table public.ordens_servico add column if not exists data_conclusao date;

-- Novos usuários: trigger inclui trial_starts_at = now()
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, email, telefone, trial_starts_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'telefone', ''),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- TABELA: ordens_fotos (registro fotográfico da OS)
-- ============================================
create table if not exists public.ordens_fotos (
  id uuid default uuid_generate_v4() primary key,
  ordem_id uuid references public.ordens_servico(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  created_at timestamptz default now()
);

create index if not exists idx_ordens_fotos_ordem on public.ordens_fotos(ordem_id);

alter table public.ordens_fotos enable row level security;

drop policy if exists "Técnico gerencia fotos de suas OS" on public.ordens_fotos;
create policy "Técnico gerencia fotos de suas OS"
  on public.ordens_fotos for all
  using (auth.uid() = tecnico_id)
  with check (auth.uid() = tecnico_id);

-- Storage bucket para as fotos da OS (público para exibição/PDF)
insert into storage.buckets (id, name, public)
values ('ordens-fotos', 'ordens-fotos', true)
on conflict (id) do nothing;

drop policy if exists "Técnico envia fotos de OS" on storage.objects;
create policy "Técnico envia fotos de OS"
  on storage.objects for insert
  with check (bucket_id = 'ordens-fotos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Técnico remove fotos de OS" on storage.objects;
create policy "Técnico remove fotos de OS"
  on storage.objects for delete
  using (bucket_id = 'ordens-fotos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Fotos de OS são públicas para leitura" on storage.objects;
create policy "Fotos de OS são públicas para leitura"
  on storage.objects for select
  using (bucket_id = 'ordens-fotos');

-- ============================================
-- SISTEMA DE AFILIADOS
-- ============================================
alter table public.profiles add column if not exists ref_code text default null;

-- Atualiza trigger para salvar ref_code na criação do usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, email, telefone, trial_starts_at, ref_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'telefone', ''),
    now(),
    new.raw_user_meta_data->>'ref_code'
  );
  return new;
end;
$$ language plpgsql security definer;

create table if not exists public.afiliados (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  codigo text unique not null,
  chave_pix text default '',
  saque_pendente boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.comissoes (
  id uuid default uuid_generate_v4() primary key,
  afiliado_id uuid references public.afiliados(id) on delete cascade not null,
  indicado_user_id uuid references public.profiles(id) on delete set null,
  valor numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  periodo_ref text not null,
  payment_ref text unique not null,
  created_at timestamptz default now()
);

create index if not exists idx_comissoes_afiliado on public.comissoes(afiliado_id);
create index if not exists idx_comissoes_status on public.comissoes(status);

alter table public.afiliados enable row level security;
alter table public.comissoes enable row level security;

alter table public.profiles add column if not exists assinatura_url text default null;

-- ============================================
-- MIGRATION: Cartão salvo / Renovação automática
-- ============================================
alter table public.profiles add column if not exists mp_customer_id text default null;
alter table public.profiles add column if not exists mp_card_id text default null;
alter table public.profiles add column if not exists mp_card_last_four text default null;
alter table public.profiles add column if not exists mp_card_brand text default null;
alter table public.profiles add column if not exists auto_renew boolean default false;

-- ============================================
-- MIGRATION: Asaas (substitui o Mercado Pago) — colunas mp_* acima ficam só
-- como histórico, não são mais escritas por código novo.
-- ============================================
alter table public.profiles add column if not exists cpf_cnpj text default null;
alter table public.profiles add column if not exists asaas_customer_id text default null;
alter table public.profiles add column if not exists asaas_subscription_id text default null;
alter table public.profiles add column if not exists asaas_addon_subscription_id text default null;

drop policy if exists "Afiliado gerencia seus dados" on public.afiliados;
create policy "Afiliado gerencia seus dados"
  on public.afiliados for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Afiliado vê suas comissões" on public.comissoes;
create policy "Afiliado vê suas comissões"
  on public.comissoes for select
  using (
    afiliado_id in (select id from public.afiliados where user_id = auth.uid())
  );

-- ============================================
-- CRON: Renovação automática de assinaturas mensais (Mercado Pago) — DESATIVADO.
-- Migração para Asaas usa assinaturas nativas (POST /v3/subscriptions), que cobram
-- o cliente a cada ciclo sozinhas e avisam via asaas-webhook — não precisa mais de
-- um cron re-tokenizando cartão todo dia.
-- ============================================
select cron.unschedule('auto-renew-monthly');

-- Bloco antigo mantido apenas como referência histórica (não executar de novo):
-- select cron.schedule(
--   'auto-renew-monthly',
--   '0 8 * * *',   -- Todo dia às 08:00 UTC
--   $$
--   select net.http_post(
--     url     := '<SUPABASE_URL>/functions/v1/auto-renew-subscriptions',
--     headers := jsonb_build_object(
--       'Content-Type',   'application/json',
--       'x-cron-secret',  '<CRON_SECRET>'
--     ),
--     body    := '{}'::jsonb
--   )
--   $$
-- );

-- ============================================
-- MIGRATION: Rastreamento de origem (Meta Ads / UTMify)
-- Persiste fbclid/fbc/fbp e UTMs no momento do cadastro,
-- para que o webhook do Mercado Pago consiga recuperá-los
-- na aprovação do pagamento e repassá-los à Utmify e à
-- Meta Conversions API mesmo quando o metadata do pagamento
-- não estiver disponível.
-- ============================================
alter table public.profiles add column if not exists fbclid text default null;
alter table public.profiles add column if not exists fbc text default null;
alter table public.profiles add column if not exists fbp text default null;
alter table public.profiles add column if not exists utm_source text default null;
alter table public.profiles add column if not exists utm_medium text default null;
alter table public.profiles add column if not exists utm_campaign text default null;
alter table public.profiles add column if not exists utm_content text default null;
alter table public.profiles add column if not exists utm_term text default null;
alter table public.profiles add column if not exists src text default null;
alter table public.profiles add column if not exists sck text default null;
alter table public.profiles add column if not exists signup_ip text default null;
alter table public.profiles add column if not exists signup_user_agent text default null;

-- ============================================
-- MIGRATION: event_source_url para a Meta Conversions API
-- Meta recomenda enviar a URL da página onde o evento ocorreu
-- (event_source_url); capturamos a URL no momento do cadastro.
-- ============================================
alter table public.profiles add column if not exists signup_page_url text default null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, nome, email, telefone, trial_starts_at, ref_code,
    fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck,
    signup_ip, signup_user_agent, signup_page_url
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'telefone', ''),
    now(),
    new.raw_user_meta_data->>'ref_code',
    new.raw_user_meta_data->>'fbclid',
    new.raw_user_meta_data->>'fbc',
    new.raw_user_meta_data->>'fbp',
    new.raw_user_meta_data->>'utm_source',
    new.raw_user_meta_data->>'utm_medium',
    new.raw_user_meta_data->>'utm_campaign',
    new.raw_user_meta_data->>'utm_content',
    new.raw_user_meta_data->>'utm_term',
    new.raw_user_meta_data->>'src',
    new.raw_user_meta_data->>'sck',
    new.raw_user_meta_data->>'signup_ip',
    new.raw_user_meta_data->>'signup_user_agent',
    new.raw_user_meta_data->>'signup_page_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- MIGRATION: Painel /admin/tracking-debug
-- Acesso administrativo (is_admin), atribuição de primeiro toque
-- (entry_url/referrer, capturados uma única vez na Landing) e log
-- persistente de cada tentativa de envio a Utmify/Meta CAPI — antes
-- disso só existia como console.log, sem histórico consultável.
-- ============================================
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists entry_url text default null;
alter table public.profiles add column if not exists referrer text default null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, nome, email, telefone, trial_starts_at, ref_code,
    fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck,
    signup_ip, signup_user_agent, signup_page_url, entry_url, referrer
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'telefone', ''),
    now(),
    new.raw_user_meta_data->>'ref_code',
    new.raw_user_meta_data->>'fbclid',
    new.raw_user_meta_data->>'fbc',
    new.raw_user_meta_data->>'fbp',
    new.raw_user_meta_data->>'utm_source',
    new.raw_user_meta_data->>'utm_medium',
    new.raw_user_meta_data->>'utm_campaign',
    new.raw_user_meta_data->>'utm_content',
    new.raw_user_meta_data->>'utm_term',
    new.raw_user_meta_data->>'src',
    new.raw_user_meta_data->>'sck',
    new.raw_user_meta_data->>'signup_ip',
    new.raw_user_meta_data->>'signup_user_agent',
    new.raw_user_meta_data->>'signup_page_url',
    new.raw_user_meta_data->>'entry_url',
    new.raw_user_meta_data->>'referrer'
  );
  return new;
end;
$$ language plpgsql security definer;

create table if not exists public.purchase_tracking_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  payment_id text not null,
  event_id text not null,
  plan text,
  value numeric(10,2),
  purchased_at timestamptz default now(),
  utmify_order_id text,
  utmify_status text,
  utmify_http_status int,
  utmify_response text,
  meta_capi_status text,
  meta_capi_http_status int,
  meta_capi_response text,
  updated_at timestamptz default now()
);

create unique index if not exists idx_purchase_tracking_log_payment on public.purchase_tracking_log(payment_id);
create index if not exists idx_purchase_tracking_log_user on public.purchase_tracking_log(user_id);

-- RLS habilitado sem nenhuma policy para anon/authenticated: só as Edge
-- Functions (service_role, que sempre ignora RLS) leem/gravam esta tabela.
alter table public.purchase_tracking_log enable row level security;

-- ============================================
-- MIGRATION: Analytics e observabilidade (/admin/analytics, /admin/purchase/:id)
-- Auditoria completa de cada envio (request/response/tempo/retries), log de
-- visitas da Landing (para conversão real) e funções SQL de agregação —
-- SUM/COUNT feitos no Postgres em vez de trazer todas as linhas para o
-- edge function somar em JS.
-- ============================================

-- Auditoria completa de cada tentativa de envio
alter table public.purchase_tracking_log add column if not exists utmify_request_json text;
alter table public.purchase_tracking_log add column if not exists utmify_sent_at timestamptz;
alter table public.purchase_tracking_log add column if not exists meta_request_json text;
alter table public.purchase_tracking_log add column if not exists meta_sent_at timestamptz;
alter table public.purchase_tracking_log add column if not exists retry_count int default 0;
alter table public.purchase_tracking_log add column if not exists last_retry_at timestamptz;
alter table public.purchase_tracking_log add column if not exists processing_time_ms int;
alter table public.purchase_tracking_log add column if not exists processing_status text;
alter table public.purchase_tracking_log add column if not exists error_message text;

-- Timestamps extras necessários para a timeline real da seção 4 (sem eles,
-- "webhook" e "liberação de acesso" cairiam no mesmo instante do Utmify/Meta).
alter table public.purchase_tracking_log add column if not exists payment_created_at timestamptz;
alter table public.purchase_tracking_log add column if not exists webhook_received_at timestamptz;
alter table public.purchase_tracking_log add column if not exists access_granted_at timestamptz;

-- Marca quando uma assinatura foi cancelada — sem isso não dá para contar
-- "cancelamentos" por período (só o estado atual, sem dimensão de tempo).
alter table public.profiles add column if not exists cancelled_at timestamptz default null;

-- Log de visitas da Landing (necessário para "Conversão da Landing" — hoje só
-- existe dado quando alguém se cadastra). Insert público, sem select público:
-- só service_role (edge functions de admin) lê de volta.
create table if not exists public.page_views (
  id uuid default uuid_generate_v4() primary key,
  session_key text not null,
  path text not null,
  fbclid text,
  utm_source text,
  utm_campaign text,
  created_at timestamptz default now()
);

alter table public.page_views enable row level security;

drop policy if exists "Qualquer um pode registrar page view" on public.page_views;
create policy "Qualquer um pode registrar page view"
  on public.page_views for insert
  with check (true);

-- Índices para as consultas de analytics (hoje profiles não tinha nenhum além
-- da PK, e purchase_tracking_log só tinha payment_id/user_id).
create index if not exists idx_profiles_created_at on public.profiles(created_at);
create index if not exists idx_profiles_plan on public.profiles(plan);
create index if not exists idx_profiles_utm_campaign on public.profiles(utm_campaign);
create index if not exists idx_profiles_utm_source on public.profiles(utm_source);
create index if not exists idx_profiles_cancelled_at on public.profiles(cancelled_at);

create index if not exists idx_purchase_tracking_log_purchased_at on public.purchase_tracking_log(purchased_at);
create index if not exists idx_purchase_tracking_log_processing_status on public.purchase_tracking_log(processing_status);

create index if not exists idx_page_views_session on public.page_views(session_key);
create index if not exists idx_page_views_created on public.page_views(created_at);
create index if not exists idx_page_views_campaign on public.page_views(utm_campaign);

-- ============================================
-- Funções de classificação (reaproveitadas por várias funções de agregação
-- abaixo — evita repetir o mesmo CASE WHEN em cada uma).
-- ============================================
create or replace function public.classify_origin(p_fbclid text, p_utm_source text, p_referrer text)
returns text language sql immutable as $$
  select case
    when p_fbclid is not null or p_utm_source ilike '%facebook%' or p_utm_source ilike '%fb%' then 'Facebook'
    when p_utm_source ilike '%instagram%' or p_referrer ilike '%instagram%' then 'Instagram'
    when p_utm_source ilike '%google%' or p_referrer ilike '%google%' then 'Google'
    when p_utm_source is null and p_referrer is null then 'Direto'
    when p_referrer is not null and p_utm_source is null then 'Orgânico'
    else 'Outros'
  end
$$;

create or replace function public.classify_device(p_user_agent text)
returns text language sql immutable as $$
  select case
    when p_user_agent is null then 'Desconhecido'
    when p_user_agent ilike '%iPad%' then 'Tablet'
    when p_user_agent ilike '%Android%' and p_user_agent not ilike '%Mobile%' then 'Tablet'
    when p_user_agent ilike '%Android%' then 'Android'
    when p_user_agent ilike '%iPhone%' then 'iPhone'
    when p_user_agent ilike '%Macintosh%' or p_user_agent ilike '%Windows%' or p_user_agent ilike '%Linux%' or p_user_agent ilike '%X11%' then 'Desktop'
    else 'Outros'
  end
$$;

create or replace function public.classify_browser(p_user_agent text)
returns text language sql immutable as $$
  select case
    when p_user_agent is null then 'Desconhecido'
    when p_user_agent ilike '%FBAN%' or p_user_agent ilike '%FBAV%' or p_user_agent ilike '%FB_IAB%' then 'Facebook In-App Browser'
    when p_user_agent ilike '%Instagram%' then 'Instagram In-App Browser'
    when p_user_agent ilike '%EdgiOS%' or p_user_agent ilike '%EdgA%' or p_user_agent ilike '%Edg/%' then 'Edge'
    when p_user_agent ilike '%Firefox%' or p_user_agent ilike '%FxiOS%' then 'Firefox'
    when p_user_agent ilike '%CriOS%' or p_user_agent ilike '%Chrome%' then 'Chrome'
    when p_user_agent ilike '%Safari%' then 'Safari'
    else 'Outros'
  end
$$;

-- ============================================
-- Funções de agregação para /admin/analytics (chamadas via supabase.rpc()).
-- Todas "stable" (sem efeitos colaterais) e recebem o intervalo de datas —
-- os filtros de campanha/origem/plano são opcionais (null = sem filtro).
-- ============================================
create or replace function public.analytics_summary(
  desde timestamptz, ate timestamptz,
  filtro_campanha text default null,
  filtro_origem text default null,
  filtro_plano text default null
)
returns table(receita numeric, compras bigint)
language sql stable as $$
  select coalesce(sum(ptl.value), 0), count(*)
  from public.purchase_tracking_log ptl
  join public.profiles p on p.id = ptl.user_id
  where ptl.purchased_at >= desde and ptl.purchased_at < ate
    and (filtro_campanha is null or p.utm_campaign = filtro_campanha)
    and (filtro_plano is null or ptl.plan = filtro_plano)
    and (filtro_origem is null or public.classify_origin(p.fbclid, p.utm_source, p.referrer) = filtro_origem)
$$;

create or replace function public.analytics_subscriptions(desde timestamptz, ate timestamptz)
returns table(novas_assinaturas bigint, assinaturas_ativas bigint, cancelamentos bigint)
language sql stable as $$
  select
    (select count(*) from (
      select user_id, min(purchased_at) as primeira_compra
      from public.purchase_tracking_log group by user_id
    ) t where t.primeira_compra >= desde and t.primeira_compra < ate),
    (select count(*) from public.profiles where subscribed_until >= now() and plan is not null),
    (select count(*) from public.profiles where cancelled_at >= desde and cancelled_at < ate)
$$;

create or replace function public.analytics_landing_conversion(desde timestamptz, ate timestamptz)
returns table(visitas bigint, cadastros bigint)
language sql stable as $$
  select
    (select count(*) from public.page_views where created_at >= desde and created_at < ate),
    (select count(*) from public.profiles where created_at >= desde and created_at < ate)
$$;

create or replace function public.analytics_por_campanha(desde timestamptz, ate timestamptz)
returns table(
  utm_campaign text, utm_source text, utm_medium text,
  compras bigint, receita numeric, ticket_medio numeric,
  visitas bigint, conversao numeric
)
language sql stable as $$
  with compras_camp as (
    select p.utm_campaign, p.utm_source, p.utm_medium,
      count(*) as compras, coalesce(sum(ptl.value), 0) as receita
    from public.purchase_tracking_log ptl
    join public.profiles p on p.id = ptl.user_id
    where ptl.purchased_at >= desde and ptl.purchased_at < ate
    group by p.utm_campaign, p.utm_source, p.utm_medium
  ),
  visitas_camp as (
    select utm_campaign, count(*) as visitas
    from public.page_views
    where created_at >= desde and created_at < ate
    group by utm_campaign
  )
  select c.utm_campaign, c.utm_source, c.utm_medium, c.compras, c.receita,
    case when c.compras > 0 then round(c.receita / c.compras, 2) else 0 end as ticket_medio,
    coalesce(v.visitas, 0) as visitas,
    case when coalesce(v.visitas, 0) > 0 then round((c.compras::numeric / v.visitas) * 100, 2) else null end as conversao
  from compras_camp c
  left join visitas_camp v on v.utm_campaign is not distinct from c.utm_campaign
  order by c.receita desc
$$;

create or replace function public.analytics_por_anuncio(desde timestamptz, ate timestamptz)
returns table(utm_content text, utm_term text, compras bigint, receita numeric)
language sql stable as $$
  select p.utm_content, p.utm_term, count(*), coalesce(sum(ptl.value), 0)
  from public.purchase_tracking_log ptl
  join public.profiles p on p.id = ptl.user_id
  where ptl.purchased_at >= desde and ptl.purchased_at < ate
    and (p.utm_content is not null or p.utm_term is not null)
  group by p.utm_content, p.utm_term
  order by 4 desc
$$;

create or replace function public.analytics_origem(desde timestamptz, ate timestamptz)
returns table(origem text, compras bigint, receita numeric)
language sql stable as $$
  select public.classify_origin(p.fbclid, p.utm_source, p.referrer) as origem,
    count(*), coalesce(sum(ptl.value), 0)
  from public.purchase_tracking_log ptl
  join public.profiles p on p.id = ptl.user_id
  where ptl.purchased_at >= desde and ptl.purchased_at < ate
  group by 1 order by 3 desc
$$;

create or replace function public.analytics_dispositivo(desde timestamptz, ate timestamptz)
returns table(dispositivo text, compras bigint, receita numeric)
language sql stable as $$
  select public.classify_device(p.signup_user_agent) as dispositivo,
    count(*), coalesce(sum(ptl.value), 0)
  from public.purchase_tracking_log ptl
  join public.profiles p on p.id = ptl.user_id
  where ptl.purchased_at >= desde and ptl.purchased_at < ate
  group by 1 order by 3 desc
$$;

create or replace function public.analytics_navegador(desde timestamptz, ate timestamptz)
returns table(navegador text, compras bigint, receita numeric)
language sql stable as $$
  select public.classify_browser(p.signup_user_agent) as navegador,
    count(*), coalesce(sum(ptl.value), 0)
  from public.purchase_tracking_log ptl
  join public.profiles p on p.id = ptl.user_id
  where ptl.purchased_at >= desde and ptl.purchased_at < ate
  group by 1 order by 3 desc
$$;

create or replace function public.analytics_revenue_timeseries(desde timestamptz, ate timestamptz)
returns table(dia date, receita numeric, compras bigint)
language sql stable as $$
  select date_trunc('day', purchased_at)::date as dia, coalesce(sum(value), 0), count(*)
  from public.purchase_tracking_log
  where purchased_at >= desde and purchased_at < ate
  group by 1 order by 1
$$;

-- ============================================
-- MIGRATION: ClimaPro IA 2.0 — Fase 3
-- Persistência de laudo técnico (antes só existia como PDF efêmero, gerado
-- a partir de um bloco <<<LAUDO_JSON>>> no texto da IA) + campos de
-- equipamento na OS, para a IA passar a ter contexto técnico persistente.
-- ============================================

-- TABELA: laudos
create table if not exists public.laudos (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  ordem_id uuid references public.ordens_servico(id) on delete set null,
  cliente_nome text not null default '',
  equipamento_tipo text not null default '',
  equipamento_marca text not null default '',
  equipamento_modelo text not null default '',
  equipamento_capacidade text not null default '',
  equipamento_fluido text not null default '',
  numero_serie text not null default '',
  defeito_relatado text not null default '',
  diagnostico text not null default '',
  servicos_executados text not null default '',
  pecas_utilizadas text not null default '',
  recomendacoes text not null default '',
  conclusao text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_laudos_tecnico on public.laudos(tecnico_id);
create index if not exists idx_laudos_ordem on public.laudos(ordem_id);

alter table public.laudos enable row level security;

drop policy if exists "Técnico gerencia seus laudos" on public.laudos;
create policy "Técnico gerencia seus laudos"
  on public.laudos for all
  using (auth.uid() = tecnico_id);

drop trigger if exists set_updated_at on public.laudos;
create trigger set_updated_at
  before update on public.laudos
  for each row execute procedure public.update_updated_at();

-- Campos de equipamento na OS — colunas planas (mesma convenção de
-- garantia_*/forma_pagamento acima), preenchidas pela IA ou manualmente.
alter table public.ordens_servico add column if not exists equipamento_tipo text;
alter table public.ordens_servico add column if not exists equipamento_marca text;
alter table public.ordens_servico add column if not exists equipamento_modelo text;
alter table public.ordens_servico add column if not exists equipamento_capacidade text;
alter table public.ordens_servico add column if not exists equipamento_fluido text;
alter table public.ordens_servico add column if not exists equipamento_numero_serie text;

-- ============================================
-- MIGRATION: ClimaPro IA 2.0 — Fase 5 (Modo Atendimento IA)
-- Histórico persistente de conversas (sessionStorage não é suficiente para
-- uma sessão de atendimento, que precisa sobreviver a troca de app/aba
-- durante o serviço) + linha do tempo estruturada do atendimento ao vivo.
-- ============================================

-- TABELA: ai_conversations
create table if not exists public.ai_conversations (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  ordem_id uuid references public.ordens_servico(id) on delete set null,
  tipo text not null default 'chat' check (tipo in ('chat', 'atendimento')),
  titulo text not null default '',
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ai_conversations_tecnico on public.ai_conversations(tecnico_id);
create index if not exists idx_ai_conversations_ordem on public.ai_conversations(ordem_id);

alter table public.ai_conversations enable row level security;

drop policy if exists "Técnico gerencia suas conversas" on public.ai_conversations;
create policy "Técnico gerencia suas conversas"
  on public.ai_conversations for all
  using (auth.uid() = tecnico_id);

drop trigger if exists set_updated_at on public.ai_conversations;
create trigger set_updated_at
  before update on public.ai_conversations
  for each row execute procedure public.update_updated_at();

-- TABELA: ai_messages
create table if not exists public.ai_messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content jsonb not null,
  tool_name text default null,
  tool_call_id text default null,
  created_at timestamptz default now()
);

create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id);

alter table public.ai_messages enable row level security;

drop policy if exists "Técnico gerencia suas mensagens" on public.ai_messages;
create policy "Técnico gerencia suas mensagens"
  on public.ai_messages for all
  using (auth.uid() = tecnico_id);

-- TABELA: atendimento_eventos (linha do tempo do Modo Atendimento IA)
-- Camada só de auditoria/exibição — o dado real (pagamento, status, laudo)
-- é sempre gravado pela ferramenta de domínio correspondente (gastos,
-- receitas, ordens_servico, laudos); esta tabela nunca é fonte de verdade.
create table if not exists public.atendimento_eventos (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  ordem_id uuid references public.ordens_servico(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  tipo text not null check (tipo in ('chegada', 'diagnostico', 'peca_trocada', 'pagamento', 'garantia', 'observacao', 'conclusao', 'outro')),
  descricao text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_atendimento_eventos_conversation on public.atendimento_eventos(conversation_id);
create index if not exists idx_atendimento_eventos_ordem on public.atendimento_eventos(ordem_id);

alter table public.atendimento_eventos enable row level security;

drop policy if exists "Técnico gerencia eventos de atendimento" on public.atendimento_eventos;
create policy "Técnico gerencia eventos de atendimento"
  on public.atendimento_eventos for all
  using (auth.uid() = tecnico_id);

-- ============================================
-- MIGRATION: RLS por entitlement em receitas/gastos
-- ============================================
-- Contexto: `hasFaturamento` e `hasAiAssistant` (src/hooks/useAuth.jsx) hoje só
-- escondem a UI (Relatorio.jsx bloqueia a tela; a Assistente de IA financeira
-- exige o add-on). O RLS de `receitas`/`gastos` liberava por tecnico_id apenas,
-- então um usuário Básico sem add-on de IA conseguia ler/gravar essas tabelas
-- direto pela API do Supabase, contornando os dois gates de UI. Esta migration
-- replica a mesma regra de entitlement no banco, para os dois únicos fluxos
-- legítimos de acesso: o Relatório de Faturamento (planos não-Básico, ou
-- Básico "grandfathered" sem plan_locked_at) e o Assistente de IA Financeiro
-- (add-on ai_addon_until ativo, independente do plano).
--
-- Não mexe em `ordens_servico` nem no limite de histórico completo por
-- cliente (`historico_liberado`) — isso depende de várias telas que listam OS
-- do técnico sem filtro por cliente (agenda, dashboard, painel, IA) e exigiria
-- uma view/função dedicada para não arriscar quebrar essas telas.

create or replace function public.has_faturamento(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not (
    coalesce(p.subscribed_until, 'epoch'::timestamptz) > now()
    and p.plan_locked_at is not null
    and p.plan = 'monthly'
  )
  from public.profiles p
  where p.id = uid;
$$;

create or replace function public.has_ai_assistant(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.ai_addon_until, 'epoch'::timestamptz) > now()
  from public.profiles p
  where p.id = uid;
$$;

-- receitas
drop policy if exists "Técnico vê suas receitas" on public.receitas;

create policy "Técnico lê receitas com entitlement"
  on public.receitas for select
  using (
    auth.uid() = tecnico_id
    and (public.has_faturamento(auth.uid()) or public.has_ai_assistant(auth.uid()))
  );

create policy "Técnico grava receitas com add-on de IA"
  on public.receitas for insert
  with check (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()));

create policy "Técnico atualiza/remove suas receitas com add-on de IA"
  on public.receitas for update
  using (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()))
  with check (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()));

create policy "Técnico remove suas receitas com add-on de IA"
  on public.receitas for delete
  using (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()));

-- gastos
drop policy if exists "Técnico vê seus gastos" on public.gastos;

create policy "Técnico lê gastos com entitlement"
  on public.gastos for select
  using (
    auth.uid() = tecnico_id
    and (public.has_faturamento(auth.uid()) or public.has_ai_assistant(auth.uid()))
  );

create policy "Técnico grava gastos com add-on de IA"
  on public.gastos for insert
  with check (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()));

create policy "Técnico atualiza suas gastos com add-on de IA"
  on public.gastos for update
  using (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()))
  with check (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()));

create policy "Técnico remove seus gastos com add-on de IA"
  on public.gastos for delete
  using (auth.uid() = tecnico_id and public.has_ai_assistant(auth.uid()));

-- ============================================
-- MIGRATION: PMOC (Plano de Manutenção, Operação e Controle)
-- Módulo novo e independente: atende Portaria GM/MS nº 3.523/1998,
-- RE ANVISA 09/2003 e NBR 13971. Cadastro persistente de ambientes
-- climatizados e equipamentos por PMOC (distinto dos campos equipamento_*
-- efêmeros de ordens_servico/laudos), plano de manutenção com periodicidade
-- por item (copiado de um template em src/lib/pmocTemplates.js na criação
-- do equipamento, editável depois) e histórico de execuções — uma linha
-- por visita (pmoc_execucoes) + uma linha por item marcado (pmoc_execucao_itens),
-- com snapshot de descrição/periodicidade/data para o histórico não mudar
-- se o plano for editado depois. "Próxima data" nunca é armazenada — é
-- sempre calculada em runtime (última execução + periodicidade) em
-- src/lib/pmoc.js. Referencia clientes/ordens_servico só como leitura,
-- sem alterar nenhuma dessas tabelas.
-- ============================================

create table if not exists public.pmoc_planos (
  id uuid default uuid_generate_v4() primary key,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete cascade not null unique,
  responsavel_tecnico text not null default '',
  responsavel_documento text not null default '',
  data_inicio date not null default current_date,
  observacoes text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pmoc_planos_tecnico on public.pmoc_planos(tecnico_id);
drop trigger if exists set_updated_at on public.pmoc_planos;
create trigger set_updated_at before update on public.pmoc_planos
  for each row execute procedure public.update_updated_at();

create table if not exists public.pmoc_ambientes (
  id uuid default uuid_generate_v4() primary key,
  pmoc_id uuid references public.pmoc_planos(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null,
  area_m2 numeric(8,2),
  observacoes text not null default '',
  created_at timestamptz default now()
);
create index if not exists idx_pmoc_ambientes_pmoc on public.pmoc_ambientes(pmoc_id);
create index if not exists idx_pmoc_ambientes_tecnico on public.pmoc_ambientes(tecnico_id);

create table if not exists public.pmoc_equipamentos (
  id uuid default uuid_generate_v4() primary key,
  pmoc_id uuid references public.pmoc_planos(id) on delete cascade not null,
  ambiente_id uuid references public.pmoc_ambientes(id) on delete set null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  tag text not null default '',
  tipo text not null default '',
  marca text not null default '',
  modelo text not null default '',
  capacidade text not null default '',
  fluido text not null default '',
  numero_serie text not null default '',
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pmoc_equipamentos_pmoc on public.pmoc_equipamentos(pmoc_id);
create index if not exists idx_pmoc_equipamentos_ambiente on public.pmoc_equipamentos(ambiente_id);
create index if not exists idx_pmoc_equipamentos_tecnico on public.pmoc_equipamentos(tecnico_id);
drop trigger if exists set_updated_at on public.pmoc_equipamentos;
create trigger set_updated_at before update on public.pmoc_equipamentos
  for each row execute procedure public.update_updated_at();

create table if not exists public.pmoc_plano_itens (
  id uuid default uuid_generate_v4() primary key,
  equipamento_id uuid references public.pmoc_equipamentos(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  descricao text not null,
  periodicidade text not null
    check (periodicidade in ('diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual')),
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pmoc_plano_itens_equipamento on public.pmoc_plano_itens(equipamento_id);
create index if not exists idx_pmoc_plano_itens_tecnico on public.pmoc_plano_itens(tecnico_id);
drop trigger if exists set_updated_at on public.pmoc_plano_itens;
create trigger set_updated_at before update on public.pmoc_plano_itens
  for each row execute procedure public.update_updated_at();

create table if not exists public.pmoc_execucoes (
  id uuid default uuid_generate_v4() primary key,
  pmoc_id uuid references public.pmoc_planos(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  ordem_id uuid references public.ordens_servico(id) on delete set null,
  data date not null default current_date,
  observacoes text not null default '',
  created_at timestamptz default now()
);
create index if not exists idx_pmoc_execucoes_pmoc on public.pmoc_execucoes(pmoc_id, data);
create index if not exists idx_pmoc_execucoes_tecnico on public.pmoc_execucoes(tecnico_id);

create table if not exists public.pmoc_execucao_itens (
  id uuid default uuid_generate_v4() primary key,
  execucao_id uuid references public.pmoc_execucoes(id) on delete cascade not null,
  pmoc_id uuid references public.pmoc_planos(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  equipamento_id uuid references public.pmoc_equipamentos(id) on delete set null,
  plano_item_id uuid references public.pmoc_plano_itens(id) on delete set null,
  descricao text not null,
  periodicidade text not null
    check (periodicidade in ('diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual')),
  situacao text not null default 'ok'
    check (situacao in ('ok', 'nao_ok', 'nao_aplicavel')),
  observacao text not null default '',
  data date not null,
  created_at timestamptz default now()
);
create index if not exists idx_pmoc_execucao_itens_execucao on public.pmoc_execucao_itens(execucao_id);
create index if not exists idx_pmoc_execucao_itens_pmoc_item on public.pmoc_execucao_itens(pmoc_id, plano_item_id, data);
create index if not exists idx_pmoc_execucao_itens_tecnico on public.pmoc_execucao_itens(tecnico_id);

alter table public.pmoc_planos enable row level security;
alter table public.pmoc_ambientes enable row level security;
alter table public.pmoc_equipamentos enable row level security;
alter table public.pmoc_plano_itens enable row level security;
alter table public.pmoc_execucoes enable row level security;
alter table public.pmoc_execucao_itens enable row level security;

drop policy if exists "Técnico gerencia seus PMOCs" on public.pmoc_planos;
create policy "Técnico gerencia seus PMOCs" on public.pmoc_planos for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);
drop policy if exists "Técnico gerencia ambientes de seus PMOCs" on public.pmoc_ambientes;
create policy "Técnico gerencia ambientes de seus PMOCs" on public.pmoc_ambientes for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);
drop policy if exists "Técnico gerencia equipamentos de seus PMOCs" on public.pmoc_equipamentos;
create policy "Técnico gerencia equipamentos de seus PMOCs" on public.pmoc_equipamentos for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);
drop policy if exists "Técnico gerencia itens de plano de seus PMOCs" on public.pmoc_plano_itens;
create policy "Técnico gerencia itens de plano de seus PMOCs" on public.pmoc_plano_itens for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);
drop policy if exists "Técnico gerencia execuções de seus PMOCs" on public.pmoc_execucoes;
create policy "Técnico gerencia execuções de seus PMOCs" on public.pmoc_execucoes for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);
drop policy if exists "Técnico gerencia itens de execução de seus PMOCs" on public.pmoc_execucao_itens;
create policy "Técnico gerencia itens de execução de seus PMOCs" on public.pmoc_execucao_itens for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);

-- ============================================
-- MIGRATION: PMOC v2 — Estabelecimento como entidade própria, wizard de
-- criação em 5 etapas, plano de manutenção expandido (periodicidade
-- personalizada, responsável por atividade, override da 1ª data
-- prevista), execução com campos de detalhe + evidência fotográfica,
-- documentos anexos ao plano e status do plano (ativo/encerrado).
-- pmoc_ambientes e pmoc_equipamentos.ambiente_id ficam intactos no banco,
-- não usados pela UI nova (Ambientes saiu do fluxo). Todas as tabelas
-- pmoc_* estavam com 0 linhas em produção, então os ALTERs abaixo trocam
-- colunas diretamente (drop+add), sem necessidade de migrar dados.
-- ============================================

-- pmoc_planos: um cliente pode ter vários PMOCs; registro profissional
-- estruturado (tipo + número) no lugar do texto único; ART/TRT; status
-- do plano (ativo/encerrado — soft close, não é exclusão).
alter table public.pmoc_planos drop constraint if exists pmoc_planos_cliente_id_key;

alter table public.pmoc_planos add column if not exists registro_tipo text
  check (registro_tipo in ('crea', 'cau', 'cft', 'crt', 'outro'));
alter table public.pmoc_planos add column if not exists registro_numero text not null default '';
alter table public.pmoc_planos add column if not exists art_trt text not null default '';
alter table public.pmoc_planos add column if not exists status text not null default 'ativo'
  check (status in ('ativo', 'encerrado'));
alter table public.pmoc_planos drop column if exists responsavel_documento;

create index if not exists idx_pmoc_planos_status on public.pmoc_planos(status);

-- pmoc_estabelecimentos: dados do local climatizado (1:1 com o plano,
-- separado por decisão explícita do usuário mesmo sendo 1:1).
create table if not exists public.pmoc_estabelecimentos (
  id uuid default uuid_generate_v4() primary key,
  pmoc_id uuid references public.pmoc_planos(id) on delete cascade not null unique,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null default '',
  cnpj_cpf text not null default '',
  cep text not null default '',
  rua text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  tipo_estabelecimento text not null default ''
    check (tipo_estabelecimento in (
      '', 'comercio', 'escritorio', 'clinica', 'hospital', 'escola',
      'academia', 'restaurante', 'hotel', 'industria', 'igreja',
      'residencia', 'outro'
    )),
  area_climatizada_m2 numeric(10, 2),
  qtd_ambientes int,
  observacoes text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_pmoc_estabelecimentos_tecnico on public.pmoc_estabelecimentos(tecnico_id);
drop trigger if exists set_updated_at on public.pmoc_estabelecimentos;
create trigger set_updated_at before update on public.pmoc_estabelecimentos
  for each row execute procedure public.update_updated_at();

-- pmoc_equipamentos: campos estruturados no lugar de capacidade (texto
-- livre) e ativo (boolean); fabricante substitui marca; ambiente_id
-- mantido na tabela, não usado pela UI nova.
alter table public.pmoc_equipamentos add column if not exists codigo_interno text not null default '';
alter table public.pmoc_equipamentos add column if not exists localizacao text not null default '';
alter table public.pmoc_equipamentos add column if not exists capacidade_valor numeric(10, 2);
alter table public.pmoc_equipamentos add column if not exists capacidade_unidade text
  check (capacidade_unidade in ('btu', 'tr', 'kw'));
alter table public.pmoc_equipamentos add column if not exists status text not null default 'ativo'
  check (status in ('ativo', 'inativo', 'manutencao'));
alter table public.pmoc_equipamentos add column if not exists observacoes text not null default '';
alter table public.pmoc_equipamentos add column if not exists fabricante text not null default '';
alter table public.pmoc_equipamentos drop column if exists ativo;
alter table public.pmoc_equipamentos drop column if exists capacidade;
alter table public.pmoc_equipamentos drop column if exists marca;

create index if not exists idx_pmoc_equipamentos_status on public.pmoc_equipamentos(status);

-- pmoc_plano_itens: periodicidade conforme lista pedida (substitui a
-- lista v1), periodicidade personalizada em dias, override da 1ª data
-- prevista, responsável e observações por atividade.
alter table public.pmoc_plano_itens drop constraint if exists pmoc_plano_itens_periodicidade_check;
alter table public.pmoc_plano_itens add constraint pmoc_plano_itens_periodicidade_check
  check (periodicidade in ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'personalizada'));
alter table public.pmoc_plano_itens add column if not exists periodicidade_dias int;
alter table public.pmoc_plano_itens add column if not exists proxima_execucao_override date;
alter table public.pmoc_plano_itens add column if not exists responsavel text not null default '';
alter table public.pmoc_plano_itens add column if not exists observacoes text not null default '';

-- pmoc_execucao_itens: campos de detalhe opcionais (colapsados por
-- padrão na UI — o fluxo rápido OK/Não OK/N-A continua funcionando sem
-- preenchê-los) + override manual da próxima manutenção desta ocorrência.
alter table public.pmoc_execucao_itens add column if not exists situacao_encontrada text not null default '';
alter table public.pmoc_execucao_itens add column if not exists servico_executado text not null default '';
alter table public.pmoc_execucao_itens add column if not exists materiais_utilizados text not null default '';
alter table public.pmoc_execucao_itens add column if not exists proxima_manutencao_override date;

-- pmoc_execucao_fotos: evidência fotográfica por item de execução.
create table if not exists public.pmoc_execucao_fotos (
  id uuid default uuid_generate_v4() primary key,
  execucao_item_id uuid references public.pmoc_execucao_itens(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  created_at timestamptz default now()
);
create index if not exists idx_pmoc_execucao_fotos_item on public.pmoc_execucao_fotos(execucao_item_id);

-- pmoc_documentos: anexos livres do plano (manuais, certificados
-- anteriores, notas fiscais etc).
create table if not exists public.pmoc_documentos (
  id uuid default uuid_generate_v4() primary key,
  pmoc_id uuid references public.pmoc_planos(id) on delete cascade not null,
  tecnico_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null default '',
  url text not null,
  tipo text not null default '',
  created_at timestamptz default now()
);
create index if not exists idx_pmoc_documentos_pmoc on public.pmoc_documentos(pmoc_id);

alter table public.pmoc_estabelecimentos enable row level security;
alter table public.pmoc_execucao_fotos enable row level security;
alter table public.pmoc_documentos enable row level security;

drop policy if exists "Técnico gerencia estabelecimentos de seus PMOCs" on public.pmoc_estabelecimentos;
create policy "Técnico gerencia estabelecimentos de seus PMOCs" on public.pmoc_estabelecimentos for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);

drop policy if exists "Técnico gerencia fotos de execução de seus PMOCs" on public.pmoc_execucao_fotos;
create policy "Técnico gerencia fotos de execução de seus PMOCs" on public.pmoc_execucao_fotos for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);

drop policy if exists "Técnico gerencia documentos de seus PMOCs" on public.pmoc_documentos;
create policy "Técnico gerencia documentos de seus PMOCs" on public.pmoc_documentos for all
  using (auth.uid() = tecnico_id) with check (auth.uid() = tecnico_id);

insert into storage.buckets (id, name, public)
values ('pmoc-evidencias', 'pmoc-evidencias', true)
on conflict (id) do nothing;

drop policy if exists "Técnico envia evidências de PMOC" on storage.objects;
create policy "Técnico envia evidências de PMOC"
  on storage.objects for insert
  with check (bucket_id = 'pmoc-evidencias' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Técnico remove evidências de PMOC" on storage.objects;
create policy "Técnico remove evidências de PMOC"
  on storage.objects for delete
  using (bucket_id = 'pmoc-evidencias' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Evidências de PMOC são públicas para leitura" on storage.objects;
create policy "Evidências de PMOC são públicas para leitura"
  on storage.objects for select
  using (bucket_id = 'pmoc-evidencias');

insert into storage.buckets (id, name, public)
values ('pmoc-documentos', 'pmoc-documentos', true)
on conflict (id) do nothing;

drop policy if exists "Técnico envia documentos de PMOC" on storage.objects;
create policy "Técnico envia documentos de PMOC"
  on storage.objects for insert
  with check (bucket_id = 'pmoc-documentos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Técnico remove documentos de PMOC" on storage.objects;
create policy "Técnico remove documentos de PMOC"
  on storage.objects for delete
  using (bucket_id = 'pmoc-documentos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Documentos de PMOC são públicos para leitura" on storage.objects;
create policy "Documentos de PMOC são públicos para leitura"
  on storage.objects for select
  using (bucket_id = 'pmoc-documentos');

-- ============================================
-- CLIENTES: endereço estruturado (CEP/ViaCEP)
-- ============================================
alter table public.clientes add column if not exists cep text default '';
alter table public.clientes add column if not exists rua text default '';
alter table public.clientes add column if not exists numero text default '';
alter table public.clientes add column if not exists complemento text default '';
alter table public.clientes add column if not exists bairro text default '';
alter table public.clientes add column if not exists cidade text default '';
alter table public.clientes add column if not exists estado text default '';

-- ============================================
-- CLIENTES: origem do cliente (indicação, internet, panfleto...)
-- ============================================
alter table public.clientes add column if not exists origem text default '';
