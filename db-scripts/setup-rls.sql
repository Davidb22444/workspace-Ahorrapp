-- =============================================
-- Row Level Security (RLS) Policies for AhorrApp
-- =============================================
-- Ejecutar en el SQL Editor de Supabase

-- Habilitar RLS en todas las tablas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE unexpecteds ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Políticas para accounts
-- =============================================
-- Usuarios solo pueden leer su propia cuenta
CREATE POLICY "users_read_own_account" ON accounts
  FOR SELECT USING (auth.uid()::text = id);

-- Usuarios solo pueden actualizar su propia cuenta
CREATE POLICY "users_update_own_account" ON accounts
  FOR UPDATE USING (auth.uid()::text = id);

-- =============================================
-- Políticas para tablas de datos financieros
-- =============================================
-- Función helper para crear políticas por account_id
CREATE OR REPLACE FUNCTION create_user_data_policies()
RETURNS void AS $$
DECLARE
  tables TEXT[] := ARRAY['categories', 'expenses', 'incomes', 'movements', 'debts', 'debt_payments', 'savings_goals', 'savings_contributions', 'budgets', 'budget_periods', 'dependents', 'unexpecteds', 'notifications'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "users_select_own_%1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "users_insert_own_%1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "users_update_own_%1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "users_delete_own_%1$s" ON %1$s', t);

    EXECUTE format('CREATE POLICY "users_select_own_%1$s" ON %1$s FOR SELECT USING (account_id = auth.uid()::text)', t);
    EXECUTE format('CREATE POLICY "users_insert_own_%1$s" ON %1$s FOR INSERT WITH CHECK (account_id = auth.uid()::text)', t);
    EXECUTE format('CREATE POLICY "users_update_own_%1$s" ON %1$s FOR UPDATE USING (account_id = auth.uid()::text)', t);
    EXECUTE format('CREATE POLICY "users_delete_own_%1$s" ON %1$s FOR DELETE USING (account_id = auth.uid()::text)', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT create_user_data_policies();

-- =============================================
-- Políticas para audit_logs (solo lectura propia)
-- =============================================
CREATE POLICY "users_select_own_audit_logs" ON audit_logs
  FOR SELECT USING (account_id = auth.uid()::text);

-- Admin puede ver todos los audit_logs
CREATE POLICY "admin_select_all_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid()::text AND role = 'admin')
  );

-- =============================================
-- Política especial: Admin puede ver todos los usuarios
-- =============================================
CREATE POLICY "admin_select_all_accounts" ON accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM accounts WHERE id = auth.uid()::text AND role = 'admin')
  );

-- =============================================
-- Índices de rendimiento para RLS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- =============================================
-- Nota: La app usa autenticación JWT custom,
-- no Supabase Auth. Para usar estas políticas
-- con JWT custom, necesitas configurar:
-- 1. Un webhook de autenticación en Supabase
-- 2. O ejecutar: SELECT set_config('request.jwt.claim.sub', 'user-id', true)
--    en cada sesión
-- =============================================
