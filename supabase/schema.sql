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
  created_at timestamptz default now()
);

-- Cria perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email));
  return new;
end;
$$ language plpgsql security definer;

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
