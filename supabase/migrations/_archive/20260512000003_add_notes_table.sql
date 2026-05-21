-- Migration: notes table (customer / shipment / manifest / invoice / exception notes thread)
--
-- Context: customer-detail-client.tsx uses `useNotes("CUSTOMER", id)` to load
-- a notes thread. Without `public.notes`, the query errors out and the Notes
-- tab on customer detail is empty. The same pattern is used by shipment notes,
-- exception notes, etc.
--
-- This migration adds the polymorphic notes table referenced by:
--   - packages/services/src/hooks/use-notes.ts
--   - packages/ui/src/components/composed/notes/notes-panel.tsx
--   - apps/dashboard/app/(dashboard)/customers/[id]/customer-detail-client.tsx
--
-- ADDITIVE: no existing data is touched.

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('CUSTOMER','SHIPMENT','MANIFEST','INVOICE','EXCEPTION')),
  entity_id   uuid not null,
  body        jsonb not null,              -- TipTap document JSON
  text_body   text,                        -- denormalized plain text for search
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists idx_notes_entity on public.notes(entity_type, entity_id, created_at desc);
create index if not exists idx_notes_author on public.notes(created_by);

comment on table public.notes is 'Polymorphic notes thread attached to customers, shipments, manifests, invoices, exceptions.';

alter table public.notes enable row level security;

drop policy if exists notes_select_authenticated on public.notes;
create policy notes_select_authenticated on public.notes
  for select using (auth.role() = 'authenticated');

drop policy if exists notes_insert_authenticated on public.notes;
create policy notes_insert_authenticated on public.notes
  for insert with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

-- Authors can delete their own notes; SUPER_ADMIN can delete any.
drop policy if exists notes_delete_own_or_admin on public.notes;
create policy notes_delete_own_or_admin on public.notes
  for delete using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );
