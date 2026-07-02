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
-- CRON: Renovação automática de assinaturas mensais
-- Pré-requisitos:
--   1. Habilitar extensões no Supabase Dashboard → Database → Extensions:
--      • pg_cron
--      • pg_net
--   2. Definir CRON_SECRET nas env vars da Edge Function (Dashboard → Edge Functions → auto-renew-subscriptions → Secrets)
--   3. Substituir <SUPABASE_URL> e <CRON_SECRET> pelos valores reais antes de executar
-- ============================================
select cron.schedule(
  'auto-renew-monthly',
  '0 8 * * *',   -- Todo dia às 08:00 UTC
  $$
  select net.http_post(
    url     := '<SUPABASE_URL>/functions/v1/auto-renew-subscriptions',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  )
  $$
);
