-- Migration: fix latent invoice_payments OPERATOR role bug
--
-- Discovered during the 2026-05-15 production schema snapshot for the
-- Path A reconciliation (issue #78). The bug exists in TWO places that
-- BOTH refer to a role 'OPERATOR' which is not a valid value in the
-- profiles.role CHECK constraint:
--
--   1. RLS policy `invoice_payments_insert` on `public.invoice_payments`
--   2. Authorization check inside `public.record_invoice_payment(...)`
--
-- profiles.role CHECK list (production reality):
--   SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE_IMPHAL, WAREHOUSE_DELHI,
--   OPS, INVOICE, SUPPORT, WAREHOUSE_STAFF, OPS_STAFF, FINANCE_STAFF
--
-- Effect of the bug today: the in-set ARRAY['SUPER_ADMIN','OPERATOR']
-- only matches SUPER_ADMIN, so every other role (including INVOICE
-- and FINANCE_STAFF, who logically should be recording payments) is
-- silently rejected by RLS and the function pre-check.
--
-- Fix: replace 'OPERATOR' with the same role set used by
-- `invoices_insert_finance` policy — SUPER_ADMIN, ADMIN, MANAGER,
-- INVOICE, FINANCE_STAFF. These are the roles that already have
-- write access to the invoices table; recording payments against
-- those invoices is the natural co-permission.
--
-- This is the FIRST forward migration after the consolidated baseline
-- (20260515000001). It is idempotent (drop+create policy, replace
-- function) and safe to run on production via `supabase db push`.

-- 1) Replace the RLS policy
drop policy if exists invoice_payments_insert on public.invoice_payments;

create policy invoice_payments_insert
  on public.invoice_payments
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array[
          'SUPER_ADMIN'::text,
          'ADMIN'::text,
          'MANAGER'::text,
          'INVOICE'::text,
          'FINANCE_STAFF'::text
        ])
    )
  );

comment on policy invoice_payments_insert on public.invoice_payments is
  'Roles allowed to record payments. Aligned 2026-05-15 with invoices_insert_finance after the OPERATOR-role bug discovery (issue #78).';

-- 2) Replace the function body — same role-set fix
create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null,
  p_notes text default null,
  p_received_at timestamptz default now(),
  p_attachment_path text default null
)
returns public.invoice_payments
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_invoice     public.invoices%rowtype;
  v_new_balance numeric(12,2);
  v_new_advance numeric(12,2);
  v_payment     public.invoice_payments%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF')
  ) then
    raise exception 'Unauthorized: only finance roles can record payments.' using errcode = '42501';
  end if;
  if p_amount <= 0 then
    raise exception 'Payment amount must be positive (got %).', p_amount using errcode = '22023';
  end if;
  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice % not found.', p_invoice_id using errcode = 'P0002';
  end if;
  if v_invoice.status in ('CANCELLED','PAID') then
    raise exception 'Cannot record payment on a % invoice.', v_invoice.status using errcode = '22023';
  end if;
  insert into public.invoice_payments
    (invoice_id, amount, method, reference, notes, received_at, attachment_path, created_by)
  values
    (p_invoice_id, p_amount, p_method, p_reference, p_notes, p_received_at, p_attachment_path, auth.uid())
  returning * into v_payment;
  v_new_advance := coalesce(v_invoice.advance_paid, 0) + p_amount;
  v_new_balance := greatest(0, v_invoice.total_amount - v_new_advance);
  update public.invoices
  set advance_paid = v_new_advance,
      balance      = v_new_balance,
      status       = case when v_new_balance = 0 then 'PAID' else 'ISSUED' end,
      paid_at      = case when v_new_balance = 0 then coalesce(paid_at, now()) else paid_at end,
      updated_at   = now()
  where id = p_invoice_id;
  return v_payment;
end;
$function$;

comment on function public.record_invoice_payment is
  'Records a payment against an invoice; recomputes advance/balance/status atomically. Authorized roles aligned with invoices RLS (2026-05-15, issue #78).';
