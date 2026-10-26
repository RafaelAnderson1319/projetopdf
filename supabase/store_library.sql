-- Run after the existing products/profiles/purchases schema.
-- Customer purchases are granted only by the server after Stripe verification.
create table if not exists public.store_sessions (
  token_hash text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('customer','admin')),
  expires_at timestamptz not null,
  check ((kind = 'customer' and user_id is not null) or (kind = 'admin' and user_id is null))
);
create index if not exists store_sessions_user_idx on public.store_sessions(user_id);
alter table public.store_sessions enable row level security;
create policy store_sessions_no_client_access on public.store_sessions as restrictive
  for all to anon,authenticated using (false) with check (false);
revoke all on public.store_sessions from anon, authenticated;
grant all on public.store_sessions to service_role;

create table if not exists public.store_orders (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  email text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  total integer not null check (total >= 0),
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado')),
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists store_orders_user_idx on public.store_orders(user_id, created_at desc);
alter table public.store_orders enable row level security;
revoke all on public.store_orders from anon, authenticated;
grant select on public.store_orders to authenticated;
grant all on public.store_orders to service_role;
create policy store_orders_read_own on public.store_orders for select to authenticated
  using ((select auth.uid()) = user_id);

-- A checkout can contain several PDFs. Keep one entitlement per user/product.
alter table public.purchases drop constraint if exists purchases_stripe_session_id_key;
create index if not exists purchases_stripe_session_idx on public.purchases(stripe_session_id);

create or replace function public.complete_store_order(
  p_order_id uuid, p_session_id text, p_user_id uuid, p_amount integer, p_currency text,
  p_payment_intent text default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare purchase_order public.store_orders%rowtype; item jsonb;
begin
  select * into purchase_order from public.store_orders where id = p_order_id for update;
  if not found or p_user_id is null or p_amount is null or p_currency is null
     or p_session_id is null or p_session_id = '' or purchase_order.user_id <> p_user_id
     or purchase_order.total <> p_amount or p_currency <> 'brl'
     or (purchase_order.stripe_session_id is not null and purchase_order.stripe_session_id <> p_session_id)
     or purchase_order.status = 'cancelado' then return false; end if;
  if purchase_order.status = 'pago' then return true; end if;
  for item in select value from jsonb_array_elements(purchase_order.items) loop
    insert into public.purchases(user_id,product_id,stripe_session_id,stripe_payment_intent,status,valor_centavos)
      values (purchase_order.user_id,(item->>'id')::uuid,p_session_id,p_payment_intent,'paid',(item->>'price')::integer)
      on conflict (user_id,product_id) do update set
        stripe_session_id = excluded.stripe_session_id, stripe_payment_intent = excluded.stripe_payment_intent,
        status = 'paid', valor_centavos = excluded.valor_centavos;
  end loop;
  update public.store_orders set status = 'pago', paid_at = now(), stripe_session_id = p_session_id where id = p_order_id;
  return true;
end;
$$;
revoke all on function public.complete_store_order(uuid,text,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.complete_store_order(uuid,text,uuid,integer,text,text) to service_role;

insert into storage.buckets(id,name,public,allowed_mime_types,file_size_limit)
values ('pdfs','pdfs',false,array['application/pdf'],31457280)
on conflict(id) do update set public = false;
-- The existing restrictive policy blocks browser access to originals.
-- The server checks ownership before streaming a private object.
