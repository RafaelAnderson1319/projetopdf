-- Integration checks against the real schema; all fixtures are rolled back.
begin;
insert into auth.users(id,email,raw_user_meta_data)
values ('f0000000-0000-4000-8000-000000000001','library-check-1@example.invalid','{"full_name":"Library check"}'),
       ('f0000000-0000-4000-8000-000000000002','library-check-2@example.invalid','{"full_name":"Other customer"}');
insert into public.products(id,titulo,preco_centavos,pdf_path)
values ('f0000000-0000-4000-8000-000000000011','Test PDF 1',1000,'test-1.pdf'),
       ('f0000000-0000-4000-8000-000000000012','Test PDF 2',2000,'test-2.pdf');
insert into public.store_orders(id,user_id,email,items,total)
values ('f0000000-0000-4000-8000-000000000021','f0000000-0000-4000-8000-000000000001','library-check-1@example.invalid',
  '[{"id":"f0000000-0000-4000-8000-000000000011","title":"Test PDF 1","price":1000},{"id":"f0000000-0000-4000-8000-000000000012","title":"Test PDF 2","price":2000}]',3000);
do $$
begin
  if public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_library_check','f0000000-0000-4000-8000-000000000001',100,'brl') then raise exception 'Wrong amount accepted'; end if;
  if public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_library_check','f0000000-0000-4000-8000-000000000002',3000,'brl') then raise exception 'Wrong customer accepted'; end if;
  if public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_library_check','f0000000-0000-4000-8000-000000000001',null,'brl') then raise exception 'Null amount accepted'; end if;
  if public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_library_check','f0000000-0000-4000-8000-000000000001',3000,'usd') then raise exception 'Wrong currency accepted'; end if;
  if (select count(*) from public.purchases where stripe_session_id='cs_library_check') <> 0 then raise exception 'Unpaid entitlement created'; end if;
  if not public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_library_check','f0000000-0000-4000-8000-000000000001',3000,'brl') then raise exception 'Valid payment rejected'; end if;
  if not public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_library_check','f0000000-0000-4000-8000-000000000001',3000,'brl') then raise exception 'Replay not idempotent'; end if;
  if (select count(*) from public.purchases where stripe_session_id='cs_library_check') <> 2 then raise exception 'Cart entitlement count incorrect'; end if;
  if public.complete_store_order('f0000000-0000-4000-8000-000000000021','cs_other','f0000000-0000-4000-8000-000000000001',3000,'brl') then raise exception 'Different session accepted'; end if;
  if has_function_privilege('authenticated','public.complete_store_order(uuid,text,uuid,integer,text,text)','EXECUTE') then raise exception 'Customer can finalize payment'; end if;
  if has_table_privilege('authenticated','public.store_sessions','SELECT') then raise exception 'Sessions exposed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select from public.store_orders) then raise exception 'Other customer can read order'; end if;
  if exists(select from public.purchases) then raise exception 'Other customer can read library'; end if;
end $$;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.store_orders) <> 1 then raise exception 'Owner cannot read order'; end if;
  if (select count(*) from public.purchases) <> 2 then raise exception 'Owner cannot read library'; end if;
end $$;
reset role;
select 'Payment validation, multi-PDF cart, replay handling and customer RLS verified' as result;
rollback;
