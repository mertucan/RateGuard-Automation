-- ================================================================
-- RateGuard - Contracts Table: Status & Approval Fields
-- ================================================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de calistirin.
-- Sozlesme onay is akisi icin gerekli kolonlari ekler.
-- ================================================================

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS new_amount numeric,
  ADD COLUMN IF NOT EXISTS applied_adjustment numeric,
  ADD COLUMN IF NOT EXISTS rejection_notes text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- status degerleri: active, draft, approved, rejected
