
-- ============================================
-- AhorrApp - Supabase Table Setup
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  password   TEXT,
  role       TEXT NOT NULL DEFAULT 'user',
  avatar     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'Circle',
  color       TEXT NOT NULL DEFAULT '#6366f1',
  type        TEXT NOT NULL DEFAULT 'expense',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_account_id ON categories(account_id);

-- 3. DEPENDENTS
CREATE TABLE IF NOT EXISTS dependents (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  relationship     TEXT NOT NULL DEFAULT 'other',
  economic_weight  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  birth_date       TIMESTAMPTZ,
  notes            TEXT,
  account_id       TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dependents_account_id ON dependents(account_id);

-- 4. MOVEMENTS
CREATE TABLE IF NOT EXISTS movements (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        TEXT NOT NULL,
  amount      DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movements_account_id ON movements(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);

-- 5. INCOMES
CREATE TABLE IF NOT EXISTS incomes (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source      TEXT NOT NULL,
  amount      DOUBLE PRECISION NOT NULL,
  description TEXT,
  frequency   TEXT NOT NULL DEFAULT 'monthly',
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incomes_account_id ON incomes(account_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount       DOUBLE PRECISION NOT NULL,
  description  TEXT NOT NULL,
  date         TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  dependent_id TEXT REFERENCES dependents(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  frequency    TEXT,
  account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- 7. UNEXPECTED
CREATE TABLE IF NOT EXISTS unexpecteds (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount       DOUBLE PRECISION NOT NULL,
  description  TEXT NOT NULL,
  date         TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  dependent_id TEXT REFERENCES dependents(id) ON DELETE SET NULL,
  resolved     BOOLEAN NOT NULL DEFAULT false,
  account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unexpecteds_account_id ON unexpecteds(account_id);

-- 8. DEBTS
CREATE TABLE IF NOT EXISTS debts (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  total_amount  DOUBLE PRECISION NOT NULL,
  paid_amount   DOUBLE PRECISION NOT NULL DEFAULT 0,
  interest_rate DOUBLE PRECISION,
  start_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending',
  type          TEXT NOT NULL DEFAULT 'loan',
  installments  INTEGER,
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_debts_account_id ON debts(account_id);

-- 9. DEBT PAYMENTS
CREATE TABLE IF NOT EXISTS debt_payments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount      DOUBLE PRECISION NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  debt_id     TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_account_id ON debt_payments(account_id);

-- 10. SAVINGS GOALS
CREATE TABLE IF NOT EXISTS savings_goals (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  target_amount DOUBLE PRECISION NOT NULL,
  saved_amount  DOUBLE PRECISION NOT NULL DEFAULT 0,
  icon          TEXT NOT NULL DEFAULT 'PiggyBank',
  color         TEXT NOT NULL DEFAULT '#10b981',
  deadline      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active',
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_account_id ON savings_goals(account_id);

-- 11. SAVINGS CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS savings_contributions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount      DOUBLE PRECISION NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  goal_id     TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal_id ON savings_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_account_id ON savings_contributions(account_id);

-- 12. BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  total_amount    DOUBLE PRECISION NOT NULL,
  needs_percent   DOUBLE PRECISION NOT NULL DEFAULT 50,
  wants_percent   DOUBLE PRECISION NOT NULL DEFAULT 30,
  savings_percent DOUBLE PRECISION NOT NULL DEFAULT 20,
  cycle           TEXT NOT NULL DEFAULT 'monthly',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_budgets_account_id ON budgets(account_id);

-- 13. BUDGET PERIODS
CREATE TABLE IF NOT EXISTS budget_periods (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  planned_income   DOUBLE PRECISION NOT NULL,
  planned_needs    DOUBLE PRECISION NOT NULL,
  planned_wants    DOUBLE PRECISION NOT NULL,
  planned_savings  DOUBLE PRECISION NOT NULL,
  actual_income    DOUBLE PRECISION NOT NULL DEFAULT 0,
  actual_needs     DOUBLE PRECISION NOT NULL DEFAULT 0,
  actual_wants     DOUBLE PRECISION NOT NULL DEFAULT 0,
  actual_savings   DOUBLE PRECISION NOT NULL DEFAULT 0,
  budget_id        TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id       TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_budget_periods_budget_id ON budget_periods(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_account_id ON budget_periods(account_id);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  link        TEXT,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  details     TEXT,
  account_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- RLS: Enable + allow all (app-level auth via accountId)
-- ============================================
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts', 'categories', 'dependents', 'movements',
    'incomes', 'expenses', 'unexpecteds', 'debts',
    'debt_payments', 'savings_goals', 'savings_contributions',
    'budgets', 'budget_periods', 'notifications', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all on ' || t || '" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all on ' || t || '" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================
-- Updated_at auto-trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts', 'categories', 'dependents', 'movements',
    'incomes', 'expenses', 'unexpecteds', 'debts',
    'debt_payments', 'savings_goals', 'savings_contributions',
    'budgets', 'budget_periods'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END $$;
