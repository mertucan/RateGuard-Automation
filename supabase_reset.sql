-- ============================================================
-- RateGuard - Full Database Reset & Seed Script
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop dependent tables first (child → parent order)
TRUNCATE TABLE
  public.audit_logs,
  public.communications,
  public.notifications,
  public.contracts,
  public.users,
  public.companies,
  public.financial_logs
RESTART IDENTITY CASCADE;

-- ============================================================
-- 2. Create password_reset_codes table (if not exists)
--    Used for "Forgot Password" 6-digit numeric codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code char(6) NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_prc_email ON public.password_reset_codes USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_prc_code  ON public.password_reset_codes USING btree (code)  TABLESPACE pg_default;

-- ============================================================
-- 3. & 4. Seed: Companies
-- ============================================================
INSERT INTO public.companies (id, company_name, authorized_email, risk_score, communication_language, is_tenant) VALUES
  ('10000000-0000-0000-0000-000000000001', 'RateGuard Demo A.Ş.', 'mertucan12@gmail.com', 10, 'profesyonel', true),
  ('10000000-0000-0000-0000-000000000002', 'Emre Tech Ltd.', 'emredemirkaya8951@gmail.com', 10, 'profesyonel', true),
  ('10000000-0000-0000-0000-000000000003', 'Yıldız Holding A.Ş.', 'yildiz@yildizhd.com', 35, 'profesyonel', true),
  ('10000000-0000-0000-0000-000000000004', 'Kaya İnşaat A.Ş.', 'info@kayainsaat.com', 55, 'profesyonel', true),
  ('10000000-0000-0000-0000-000000000005', 'Deniz Enerji A.Ş.', 'contact@denizenerji.com', 20, 'profesyonel', true),
  ('20000000-0000-0000-0000-000000000001', 'Alfa Lojistik A.Ş.', 'cfo@alfalojistik.com', 45, 'profesyonel', false),
  ('20000000-0000-0000-0000-000000000002', 'Beta Gıda Sanayi A.Ş.', 'muhasebe@betagida.com', 65, 'resmi', false),
  ('20000000-0000-0000-0000-000000000003', 'Gamma Tekstil Ltd. Şti.', 'finans@gammatekstil.com', 30, 'profesyonel', false),
  ('20000000-0000-0000-0000-000000000004', 'Delta Yazılım A.Ş.', 'info@deltayazilim.com', 20, 'samimi', false),
  ('20000000-0000-0000-0000-000000000005', 'Epsilon Medikal A.Ş.', 'cfo@epsilonmedikal.com', 50, 'resmi', false),
  ('20000000-0000-0000-0000-000000000006', 'Zeta Otomotiv Sanayi A.Ş.', 'info@zetaoto.com', 75, 'profesyonel', false),
  ('20000000-0000-0000-0000-000000000007', 'Eta İlaç A.Ş.', 'finans@etailac.com', 25, 'profesyonel', false),
  ('20000000-0000-0000-0000-000000000008', 'Teta Tarım A.Ş.', 'muhasebe@tetatarim.com', 40, 'resmi', false),
  ('20000000-0000-0000-0000-000000000009', 'İota Perakende A.Ş.', 'cfo@iotaperakende.com', 60, 'profesyonel', false),
  ('20000000-0000-0000-0000-000000000010', 'Kappa Turizm A.Ş.', 'info@kappaturizm.com', 35, 'resmi', false);

-- ============================================================
-- 5. Seed: Users
-- ============================================================
INSERT INTO public.users (id, company_id, full_name, email, role, password_hash) VALUES
  ('5216d533-671a-43e5-bcc2-2c51f1520426', NULL, 'Ferdi', 'ferdi@gmail.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('a0000000-0000-0000-0000-000000000001', NULL, 'Mert Uçan', 'mertucan12@gmail.com', 'super_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('a0000000-0000-0000-0000-000000000002', NULL, 'Emre Demirkaya', 'emredemirkaya8951@gmail.com', 'super_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ahmet Yılmaz', 'ahmet@rateguard.io', 'company_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Emre Demirkaya', 'emre@emretech.io', 'company_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Zeynep Kaya', 'zeynep@yildizhd.com', 'company_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('b0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Murat Şahin', 'murat@kayainsaat.com', 'company_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('b0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Selin Arslan', 'selin@denizenerji.com', 'company_admin', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Fatma Çelik', 'fatma.finance@rateguard.io', 'finance', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Burak Güneş', 'burak.finance@rateguard.io', 'finance', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('c0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Nilüfer Öztürk', 'nilufer.finance@yildizhd.com', 'finance', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('c0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Kerem Doğan', 'kerem.finance@kayainsaat.com', 'finance', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('c0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Pınar Yıldız', 'pinar.finance@denizenerji.com', 'finance', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('d0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Caner Demir', 'caner.sales@rateguard.io', 'sales', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('d0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Ayşe Demir', 'ayse.sales@rateguard.io', 'sales', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('d0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Hasan Polat', 'hasan.sales@emretech.io', 'sales', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('d0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Merve Kurt', 'merve.sales@yildizhd.com', 'sales', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('d0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'Tarık Aydın', 'tarik.sales@kayainsaat.com', 'sales', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Osman Kara', 'osman@alfalojistik.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Leyla Öz', 'leyla@betagida.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Sinan Taş', 'sinan@gammatekstil.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Büşra Erdoğan', 'busra@deltayazilim.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Furkan Aslan', 'furkan@epsilonmedikal.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'Gamze Bulut', 'gamze@zetaoto.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'Tolga Şen', 'tolga@etailac.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', 'Ece Yıldırım', 'ece@tetatarim.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'Barış Çınar', 'baris@iotaperakende.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91'),
  ('e0000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', 'Seda Koç', 'seda@kappaturizm.com', 'client', 'scrypt:32768:8:1$Ces4QUVtIl1I5yTi$408cf54f141c6b23a2c030e739fa16fe369958f593e1e481fa0602100eeeb15669bba5f705c674001e4a2da78511f5b7dbc6a57c89d0bdf83651dcd564bc8d91');

-- ============================================================
-- 6. Seed: Contracts
--    tenant_company_id = tenant, company_id = client company
-- ============================================================
INSERT INTO public.contracts (id, company_id, tenant_company_id, sales_rep_id, previous_amount, end_date, inflation_base_rule, max_increase_limit, status, new_amount, applied_adjustment) VALUES
  ('f0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 150000,  '2026-06-30', 'TUFE',     48.5, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 280000,  '2026-05-15', 'UFE',      55.2, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 95000,   '2026-07-31', 'TUFE+UFE', 45.0, 'draft',    NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 420000,  '2026-04-30', 'TUFE',     50.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 75000,   '2026-08-31', 'UFE',      60.0, 'approved', 105000, 40.0),
  ('f0000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 320000,  '2026-05-01', 'TUFE',     48.5, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 180000,  '2026-09-30', 'UFE',      55.0, 'rejected', NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 65000,   '2026-06-15', 'TUFE+UFE', 47.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 550000,  '2026-07-01', 'TUFE',     50.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 210000,  '2026-10-31', 'UFE',      58.0, 'draft',    NULL,   NULL),
  -- Emre Tech contracts
  ('f0000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 90000,   '2026-06-01', 'TUFE',     48.5, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 175000,  '2026-05-20', 'UFE',      55.0, 'active',   NULL,   NULL),
  -- Yıldız Holding contracts
  ('f0000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 300000,  '2026-08-15', 'TUFE+UFE', 46.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 120000,  '2026-04-25', 'TUFE',     50.0, 'draft',    NULL,   NULL),
  -- Kaya İnşaat contracts
  ('f0000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 450000,  '2026-09-01', 'UFE',      57.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 80000,   '2026-05-10', 'TUFE',     48.5, 'active',   NULL,   NULL),
  -- Deniz Enerji contracts
  ('f0000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 230000,  '2026-07-20', 'TUFE+UFE', 47.5, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 115000,  '2026-06-30', 'UFE',      55.0, 'approved', 157850, 37.3),
  -- Extra active contracts
  ('f0000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 670000,  '2026-11-30', 'TUFE',     49.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 390000,  '2026-12-31', 'UFE',      56.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 145000,  '2026-04-20', 'TUFE',     48.5, 'rejected', NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 520000,  '2026-05-05', 'UFE',      55.0, 'draft',    NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 88000,   '2026-08-01', 'TUFE+UFE', 46.5, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 195000,  '2026-09-15', 'TUFE',     50.0, 'active',   NULL,   NULL),
  ('f0000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 340000,  '2026-10-01', 'UFE',      57.5, 'active',   NULL,   NULL);

-- ============================================================
-- 7. Seed: Financial Logs (monthly TUFE/UFE data)
-- ============================================================
INSERT INTO public.financial_logs (record_date, exchange_rate, tufe_data, ufe_data) VALUES
  ('2025-04-01', 32.85, 69.80, 52.10),
  ('2025-05-01', 33.10, 75.45, 56.30),
  ('2025-06-01', 33.45, 71.62, 54.20),
  ('2025-07-01', 33.70, 62.14, 48.90),
  ('2025-08-01', 33.95, 51.97, 45.60),
  ('2025-09-01', 34.20, 49.38, 43.20),
  ('2025-10-01', 34.55, 48.58, 42.80),
  ('2025-11-01', 34.90, 47.09, 41.50),
  ('2025-12-01', 35.25, 44.38, 39.70),
  ('2026-01-01', 35.60, 42.12, 38.40),
  ('2026-02-01', 35.90, 39.05, 36.80),
  ('2026-03-01', 36.15, 38.10, 35.90),
  ('2026-04-01', 36.40, 36.72, 34.50),
  -- Additional historical records
  ('2024-10-01', 34.10, 88.60, 67.40),
  ('2024-11-01', 34.25, 84.20, 64.80),
  ('2024-12-01', 34.40, 79.00, 60.20),
  ('2025-01-01', 32.10, 76.14, 57.80),
  ('2025-02-01', 32.35, 73.91, 55.60),
  ('2025-03-01', 32.62, 72.30, 53.90),
  -- Forecast / planning rows
  ('2026-05-01', 36.60, 35.50, 33.80),
  ('2026-06-01', 36.80, 34.20, 32.90),
  ('2026-07-01', 37.00, 33.10, 31.80),
  ('2026-08-01', 37.20, 32.40, 31.00),
  ('2026-09-01', 37.40, 31.90, 30.50),
  ('2026-10-01', 37.60, 31.20, 29.90);

-- ============================================================
-- 8. Seed: Notifications
-- ============================================================
INSERT INTO public.notifications (contract_id, title, message, type, is_read) VALUES
  ('f0000000-0000-0000-0000-000000000004', 'Contract Expiring Soon',    'Alfa Lojistik contract expires in 20 days.',    'warning', false),
  ('f0000000-0000-0000-0000-000000000006', 'Contract Expiring Soon',    'Zeta Otomotiv contract expires in 21 days.',    'warning', false),
  ('f0000000-0000-0000-0000-000000000014', 'Contract Expiring Soon',    'Delta Yazılım contract expires in 15 days.',    'warning', false),
  ('f0000000-0000-0000-0000-000000000016', 'Contract Expiring Soon',    'Zeta Otomotiv (Kaya) expires in 30 days.',      'warning', false),
  ('f0000000-0000-0000-0000-000000000021', 'Contract Rejected',         'Alfa Lojistik renewal was rejected.',           'error',   false),
  ('f0000000-0000-0000-0000-000000000005', 'Contract Approved',         'Epsilon Medikal contract approved at 105K TRY.','success', true),
  ('f0000000-0000-0000-0000-000000000018', 'Contract Approved',         'Teta Tarım contract approved at 157.8K TRY.',  'success', true),
  ('f0000000-0000-0000-0000-000000000001', 'New Contract Created',      'New contract for Alfa Lojistik created.',       'info',    true),
  ('f0000000-0000-0000-0000-000000000002', 'New Contract Created',      'New contract for Beta Gıda created.',           'info',    true),
  ('f0000000-0000-0000-0000-000000000009', 'High Value Contract',       'İota Perakende contract value is 550K TRY.',    'warning', false),
  ('f0000000-0000-0000-0000-000000000019', 'High Value Contract',       'İota Perakende Q4 contract at 670K TRY.',       'info',    false),
  ('f0000000-0000-0000-0000-000000000020', 'High Value Contract',       'Kappa Turizm contract at 390K TRY.',            'info',    false),
  ('f0000000-0000-0000-0000-000000000003', 'Draft Pending Review',      'Gamma Tekstil draft needs finance review.',     'warning', false),
  ('f0000000-0000-0000-0000-000000000010', 'Draft Pending Review',      'Kappa Turizm draft needs finance review.',      'warning', false),
  ('f0000000-0000-0000-0000-000000000022', 'Draft Pending Review',      'Beta Gıda draft from Kaya İnşaat awaiting.',    'warning', false),
  ('f0000000-0000-0000-0000-000000000007', 'Contract Rejected',         'Eta İlaç renewal was rejected.',                'error',   false),
  ('f0000000-0000-0000-0000-000000000011', 'Contract Review Required',  'Alfa Lojistik - Emre Tech contract review.',    'info',    true),
  ('f0000000-0000-0000-0000-000000000012', 'Contract Review Required',  'Beta Gıda - Emre Tech contract review.',        'info',    true),
  ('f0000000-0000-0000-0000-000000000015', 'Large Contract Alert',      'Epsilon Medikal (Kaya) value is 450K TRY.',     'warning', false),
  ('f0000000-0000-0000-0000-000000000025', 'Contract Review Required',  'Epsilon Medikal - Yıldız Holding review.',      'info',    false),
  -- Extra 5 notifications without specific contracts
  (NULL, 'System Update', 'Market data was refreshed for April 2026.', 'info', true),
  (NULL, 'System Alert',  'TUFE rate dropped below 40% for the first time.', 'success', true),
  (NULL, 'System Alert',  'Quarterly review period has started.', 'info', false),
  (NULL, 'System Update', 'New client company registered: Kappa Turizm.', 'info', true),
  (NULL, 'System Alert',  'Auto-renewal check completed: 3 contracts flagged.', 'warning', false);

-- ============================================================
-- 9. Seed: Communications (contract chat messages)
-- ============================================================
INSERT INTO public.communications (contract_id, sender_user_id, message_text) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Hello, I wanted to discuss the renewal terms for your contract. The current TUFE rate is approximately 36.7%.'),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Thank you for reaching out. We would like to negotiate a lower increase cap if possible.'),
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'We understand. The minimum we can offer based on inflation is 45%. Would that be acceptable?'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Dear Beta Gıda, your contract renewal is due in 35 days. Please review the proposed terms.'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'We have reviewed the terms. The UFE-based increase seems high. Can we use TUFE instead?'),
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'This is urgent - your contract expires in 20 days. Please confirm if you accept the renewal.'),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'We accept the terms. Please proceed with the 50% cap as discussed.'),
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'Congratulations! Your contract renewal has been approved. The new amount is 105,000 TRY.'),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 'Thank you for the smooth process. We look forward to continued cooperation.'),
  ('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 'Zeta Otomotiv, your contract is due in 21 days. TUFE adjustment would bring the new amount to ~476K TRY.'),
  ('f0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'We regret to inform you that the Eta İlaç renewal proposal was rejected due to budget constraints.'),
  ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000007', 'We understand. Can we schedule a meeting to discuss alternative terms?'),
  ('f0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'İota Perakende, we are initiating the renewal process for your 550K TRY contract.'),
  ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000009', 'Acknowledged. We will need 2 weeks to review internally before committing.'),
  ('f0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003', 'Hello Alfa Lojistik, this is regarding your contract managed by Emre Tech. Please review the TUFE adjustment.'),
  ('f0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000004', 'Gamma Tekstil, the TUFE+UFE average for your contract renewal is 46%. Please confirm.'),
  ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000003', 'We would like to discuss this further. 46% seems too high for our sector.'),
  ('f0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000005', 'Epsilon Medikal, your 450K TRY contract renewal requires your attention.'),
  ('f0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000005', 'Teta Tarım contract approved. New value: 157,850 TRY based on UFE adjustment.'),
  ('f0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000008', 'Received confirmation. Thank you for the efficient process.'),
  ('f0000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000002', 'Kappa Turizm, we are pleased to extend your contract. UFE-based increase: 56%.'),
  ('f0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000005', 'Beta Gıda, the draft contract from Kaya İnşaat team is ready for your review.'),
  ('f0000000-0000-0000-0000-000000000022', 'e0000000-0000-0000-0000-000000000002', 'We will review and get back within 5 business days.'),
  ('f0000000-0000-0000-0000-000000000025', 'd0000000-0000-0000-0000-000000000004', 'Epsilon Medikal, Yıldız Holding is managing your Q4 contract renewal. UFE rate: 57.5%.'),
  ('f0000000-0000-0000-0000-000000000025', 'e0000000-0000-0000-0000-000000000005', 'We acknowledge the renewal proposal and will respond after internal review.');

-- ============================================================
-- 10. Seed: Audit Logs
-- ============================================================
INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, details) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Mert Uçan',       'CREATE',  'company',   '20000000-0000-0000-0000-000000000001', '{"company_name": "Alfa Lojistik A.Ş."}'),
  ('a0000000-0000-0000-0000-000000000001', 'Mert Uçan',       'CREATE',  'company',   '20000000-0000-0000-0000-000000000002', '{"company_name": "Beta Gıda Sanayi A.Ş."}'),
  ('b0000000-0000-0000-0000-000000000001', 'Ahmet Yılmaz',    'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000001', '{"amount": 150000, "rule": "TUFE"}'),
  ('b0000000-0000-0000-0000-000000000001', 'Ahmet Yılmaz',    'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000002', '{"amount": 280000, "rule": "UFE"}'),
  ('c0000000-0000-0000-0000-000000000001', 'Fatma Çelik',     'APPROVE', 'contract',  'f0000000-0000-0000-0000-000000000005', '{"new_amount": 105000, "adjustment": 40.0}'),
  ('c0000000-0000-0000-0000-000000000001', 'Fatma Çelik',     'REJECT',  'contract',  'f0000000-0000-0000-0000-000000000007', '{"reason": "Budget constraints"}'),
  ('d0000000-0000-0000-0000-000000000001', 'Caner Demir',     'UPDATE',  'contract',  'f0000000-0000-0000-0000-000000000003', '{"status": "draft"}'),
  ('d0000000-0000-0000-0000-000000000002', 'Ayşe Demir',      'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000006', '{"amount": 320000}'),
  ('c0000000-0000-0000-0000-000000000002', 'Burak Güneş',     'APPROVE', 'contract',  'f0000000-0000-0000-0000-000000000018', '{"new_amount": 157850, "adjustment": 37.3}'),
  ('b0000000-0000-0000-0000-000000000003', 'Zeynep Kaya',     'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000013', '{"amount": 300000}'),
  ('a0000000-0000-0000-0000-000000000002', 'Emre Demirkaya',  'CREATE',  'user',      'b0000000-0000-0000-0000-000000000003', '{"email": "zeynep@yildizhd.com", "role": "company_admin"}'),
  ('a0000000-0000-0000-0000-000000000001', 'Mert Uçan',       'DELETE',  'contract',  'f0000000-0000-0000-0000-000000000021', '{"reason": "Rejected by client"}'),
  ('b0000000-0000-0000-0000-000000000004', 'Murat Şahin',     'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000015', '{"amount": 450000}'),
  ('d0000000-0000-0000-0000-000000000003', 'Hasan Polat',     'UPDATE',  'contract',  'f0000000-0000-0000-0000-000000000011', '{"status": "active"}'),
  ('c0000000-0000-0000-0000-000000000003', 'Nilüfer Öztürk',  'UPDATE',  'contract',  'f0000000-0000-0000-0000-000000000014', '{"status": "draft"}'),
  ('d0000000-0000-0000-0000-000000000004', 'Merve Kurt',      'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000021', '{"amount": 145000}'),
  ('b0000000-0000-0000-0000-000000000005', 'Selin Arslan',    'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000017', '{"amount": 230000}'),
  ('a0000000-0000-0000-0000-000000000001', 'Mert Uçan',       'LOGIN',   'user',      'a0000000-0000-0000-0000-000000000001', '{"ip": "192.168.1.1"}'),
  ('a0000000-0000-0000-0000-000000000002', 'Emre Demirkaya',  'LOGIN',   'user',      'a0000000-0000-0000-0000-000000000002', '{"ip": "10.0.0.5"}'),
  ('b0000000-0000-0000-0000-000000000001', 'Ahmet Yılmaz',    'UPDATE',  'company',   '20000000-0000-0000-0000-000000000001', '{"risk_score": 45}'),
  ('c0000000-0000-0000-0000-000000000004', 'Kerem Doğan',     'UPDATE',  'contract',  'f0000000-0000-0000-0000-000000000022', '{"status": "draft"}'),
  ('d0000000-0000-0000-0000-000000000005', 'Tarık Aydın',     'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000016', '{"amount": 80000}'),
  ('e0000000-0000-0000-0000-000000000001', 'Osman Kara',      'VIEW',    'contract',  'f0000000-0000-0000-0000-000000000001', '{"action": "viewed contract details"}'),
  ('e0000000-0000-0000-0000-000000000005', 'Furkan Aslan',    'VIEW',    'contract',  'f0000000-0000-0000-0000-000000000005', '{"action": "viewed approved contract"}'),
  ('b0000000-0000-0000-0000-000000000002', 'Emre Demirkaya',  'CREATE',  'contract',  'f0000000-0000-0000-0000-000000000012', '{"amount": 175000}');

-- ============================================================
-- Done! Summary:
--   companies:      15 rows (5 tenant + 10 client)
--   users:          27 rows (2 super_admin, 5 company_admin, 5 finance, 5 sales, 10 client)
--   contracts:      25 rows
--   financial_logs: 25 rows
--   notifications:  25 rows
--   communications: 25 rows
--   audit_logs:     25 rows
--
-- All user passwords: 12345678
-- Super Admin emails: mertucan12@gmail.com / emredemirkaya8951@gmail.com
-- ============================================================
