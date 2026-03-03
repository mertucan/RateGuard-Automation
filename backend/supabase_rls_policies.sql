-- ================================================================
-- RateGuard - Supabase RLS Policies
-- ================================================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de calistirin.
-- Tum tablolara anon key erisimi icin policy ekler.
-- ================================================================

-- COMPANIES
CREATE POLICY "allow_select_companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "allow_insert_companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "allow_delete_companies" ON public.companies FOR DELETE USING (true);

-- CONTRACTS
CREATE POLICY "allow_select_contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "allow_insert_contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_contracts" ON public.contracts FOR UPDATE USING (true);
CREATE POLICY "allow_delete_contracts" ON public.contracts FOR DELETE USING (true);

-- FINANCIAL_LOGS
CREATE POLICY "allow_select_financial_logs" ON public.financial_logs FOR SELECT USING (true);
CREATE POLICY "allow_insert_financial_logs" ON public.financial_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_financial_logs" ON public.financial_logs FOR UPDATE USING (true);
CREATE POLICY "allow_delete_financial_logs" ON public.financial_logs FOR DELETE USING (true);
