-- Migration: invoice_payments table + record_invoice_payment RPC (TestSprite TC004 unblock)
--
-- Context: payment.service.ts has been calling `db.rpc("record_invoice_payment", ...)`
-- since May 2026. The RPC was never deployed, so every payment-recording attempt
-- returns "Payment recording is unavailable: the invoice_payments table has not
-- been deployed yet" — TC004 fails because operators cannot collect on invoices.
--
-- This migration adds:
--   1. invoice_payments table — one row per payment received
--   2. record_invoice_payment(uuid, numeric, text, text, text, timestamptz, text) RPC
--      — SECURITY DEFINER, row-level lock on the invoice, atomic INSERT + balance
--      update + status flip to PAID when balance reaches 0
--
-- ADDITIVE: existing invoices remain untouched. New payments inserted here will
-- decrement the invoice's `balance` and `advance_paid` columns via the RPC.

create table if not exists public.invoice_payments (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  method          text not null check (method in ('CASH','BANK_TRANSFER','UPI','CHEQUE','CARD','OTHER')),
  reference       text,
  notes           text,
  received_at     timestamptz not null default now(),
  attachment_path text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null
);

create index if not exists idx_invoice_payments_invoice on public.invoice_payments(invoice_id, received_at desc);
create index if not exists idx_invoice_payments_method  on public.invoice_payments(method);

comment on table public.invoice_payments is 'Per-payment ledger linked to invoices. Mutated only via record_invoice_payment RPC.';

-- RLS: authenticated read all (org-scoped if profiles enforce it); operators
-- + super admins can insert; no UPDATE/DELETE policy means no one can mutate
-- a payment row directly (the ledger is immutable; corrections go through
-- a reverse-payment migration in the future).
alter table public.invoice_payments enable row level security;

drop policy if exists invoice_payments_select on public.invoice_payments;
create policy invoice_payments_select on public.invoice_payments
  for select using (auth.role() = 'authenticated');

drop policy if exists invoice_payments_insert on public.invoice_payments;
create policy invoice_payments_insert on public.invoice_payments
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('super_admin','operations')
    )
  );

-- Canonical payment-recording RPC.
-- Atomically: locks the invoice row, inserts the payment, decrements balance
-- and advance_paid, and flips status to PAID once balance reaches 0.
-- SECURITY DEFINER so it can update invoice.status across RLS.
create or replace function public.record_invoice_payment(
  p_invoice_id      uuid,
  p_amount          numeric,
  p_method          text,
  p_reference       text default null,
  p_notes           text default null,
  p_received_at     timestamptz default now(),
  p_attachment_path text default null
) returns public.invoice_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice        public.invoices%rowtype;
  v_new_balance    numeric(12,2);
  v_new_advance    numeric(12,2);
  v_payment        public.invoice_payments%rowtype;
begin
  -- Authentication gate: must be a logged-in operator or super admin.
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('super_admin','operations')
  ) then
    raise exception 'Unauthorized: only operators or super admins can record payments.'
      using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive (got %).', p_amount
      using errcode = '22023';
  end if;

  -- Lock the invoice row for the duration of this transaction so concurrent
  -- payments can't double-spend the balance.
  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice % not found.', p_invoice_id
      using errcode = 'P0002';
  end if;

  if v_invoice.status in ('CANCELLED','PAID') then
    raise exception 'Cannot record payment on a % invoice.', v_invoice.status
      using errcode = '22023';
  end if;

  -- Insert the payment row.
  insert into public.invoice_payments
    (invoice_id, amount, method, reference, notes, received_at, attachment_path, created_by)
  values
    (p_invoice_id, p_amount, p_method, p_reference, p_notes, p_received_at, p_attachment_path, auth.uid())
  returning * into v_payment;

  -- Update invoice running totals.
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
$$;

comment on function public.record_invoice_payment is
  'Atomically record a payment on an invoice: locks invoice row, inserts payment, decrements balance, flips status to PAID when fully settled.';

grant execute on function public.record_invoice_payment(uuid, numeric, text, text, text, timestamptz, text) to authenticated;
