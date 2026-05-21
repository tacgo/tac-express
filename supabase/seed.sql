-- ============================================================================
-- TAC Express — Seed data (idempotent)
-- ============================================================================
--
-- Mirrors production's hubs + a representative slice of production's rate
-- cards. Updated 2026-05-15 to match the production-aligned baseline
-- (20260515000001_baseline_from_production.sql) — the prior seed was
-- written against the archived repo migrations and referenced columns
-- that no longer exist (hubs.pincode/address, rate_cards.name/customer_id/
-- transport_mode/base_rate/etc.).

insert into public.hubs (code, name, city, state, country, is_active)
values
  ('IMPHAL',    'Imphal Hub',    'Imphal',    'Manipur',     'IN', true),
  ('NEW_DELHI', 'New Delhi Hub', 'New Delhi', 'Delhi',       'IN', true),
  ('BLR',       'Bangalore Hub', 'Bangalore', 'Karnataka',   'IN', true),
  ('BOM',       'Mumbai Hub',    'Mumbai',    'Maharashtra', 'IN', true),
  ('CCU',       'Kolkata Hub',   'Kolkata',   'West Bengal', 'IN', true),
  ('MAA',       'Chennai Hub',   'Chennai',   'Tamil Nadu',  'IN', true),
  ('HYD',       'Hyderabad Hub', 'Hyderabad', 'Telangana',   'IN', true),
  ('PNQ',       'Pune Hub',      'Pune',      'Maharashtra', 'IN', true)
on conflict (code) do nothing;

-- Default rate cards for the IMPHAL ↔ NEW_DELHI primary route (matches
-- the shipments table defaults). Production has 28 rate cards; this seed
-- ships a representative slice covering both directions and both service
-- levels so local dev can complete the full create-shipment flow.
insert into public.rate_cards (
  origin_hub, dest_hub, service_level,
  weight_slab_min, weight_slab_max,
  rate_per_kg, docket_charge, fuel_surcharge_pct, handling_fee, is_active
)
values
  ('IMPHAL',    'NEW_DELHI', 'STANDARD', 0,   5,     180,  60, 8,  30, true),
  ('IMPHAL',    'NEW_DELHI', 'STANDARD', 5,   99999, 150,  60, 8,  30, true),
  ('IMPHAL',    'NEW_DELHI', 'PRIORITY', 0,   5,     240,  75, 10, 50, true),
  ('IMPHAL',    'NEW_DELHI', 'PRIORITY', 5,   99999, 200,  75, 10, 50, true),
  ('NEW_DELHI', 'IMPHAL',    'STANDARD', 0,   5,     180,  60, 8,  30, true),
  ('NEW_DELHI', 'IMPHAL',    'STANDARD', 5,   99999, 150,  60, 8,  30, true),
  ('NEW_DELHI', 'IMPHAL',    'PRIORITY', 0,   5,     240,  75, 10, 50, true),
  ('NEW_DELHI', 'IMPHAL',    'PRIORITY', 5,   99999, 200,  75, 10, 50, true)
on conflict do nothing;
