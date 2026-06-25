-- AhorrApp Database Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users/Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT,
  role TEXT DEFAULT 'user',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Circle',
  color TEXT DEFAULT '#6366f1',
  type TEXT DEFAULT 'expense',
  is_default BOOLEAN DEFAULT FALSE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dependents
CREATE TABLE IF NOT EXISTS dependents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  relationship TEXT DEFAULT 'other',
  economic_weight DOUBLE PRECISION DEFAULT 1.0,
  birth_date TIMESTAMPTZ,
  notes TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movements (unified transaction log)
CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income
CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'monthly',
  date TIMESTAMPTZ DEFAULT NOW(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  dependent_id TEXT REFERENCES dependents(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unexpected Expenses
CREATE TABLE IF NOT EXISTS unexpecteds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  dependent_id TEXT REFERENCES dependents(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  paid_amount DOUBLE PRECISION DEFAULT 0,
  interest_rate DOUBLE PRECISION,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  type TEXT DEFAULT 'loan',
  installments INTEGER,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debt Payments
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount DOUBLE PRECISION NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  target_amount DOUBLE PRECISION NOT NULL,
  saved_amount DOUBLE PRECISION DEFAULT 0,
  icon TEXT DEFAULT 'PiggyBank',
  color TEXT DEFAULT '#10b981',
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Contributions
CREATE TABLE IF NOT EXISTS savings_contributions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount DOUBLE PRECISION NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  needs_percent DOUBLE PRECISION DEFAULT 50,
  wants_percent DOUBLE PRECISION DEFAULT 30,
  savings_percent DOUBLE PRECISION DEFAULT 20,
  cycle TEXT DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT TRUE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Periods
CREATE TABLE IF NOT EXISTS budget_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  planned_income DOUBLE PRECISION NOT NULL,
  planned_needs DOUBLE PRECISION NOT NULL,
  planned_wants DOUBLE PRECISION NOT NULL,
  planned_savings DOUBLE PRECISION NOT NULL,
  actual_income DOUBLE PRECISION DEFAULT 0,
  actual_needs DOUBLE PRECISION DEFAULT 0,
  actual_wants DOUBLE PRECISION DEFAULT 0,
  actual_savings DOUBLE PRECISION DEFAULT 0,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_categories_account ON categories(account_id);
CREATE INDEX IF NOT EXISTS idx_dependents_account ON dependents(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_account ON movements(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
CREATE INDEX IF NOT EXISTS idx_incomes_account ON incomes(account_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_unexpecteds_account ON unexpecteds(account_id);
CREATE INDEX IF NOT EXISTS idx_debts_account ON debts(account_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_account ON debt_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_account ON savings_goals(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON savings_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_account ON savings_contributions(account_id);
CREATE INDEX IF NOT EXISTS idx_budgets_account ON budgets(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_budget ON budget_periods(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_periods_account ON budget_periods(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'accounts', 'categories', 'dependents', 'movements', 'incomes', 'expenses',
    'unexpecteds', 'debts', 'debt_payments', 'savings_goals', 'savings_contributions',
    'budgets', 'budget_periods', 'notifications'
  ) LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', tbl);
  END LOOP;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (disable for now, using service_role)
-- ============================================
-- RLS is disabled; we use service_role key in API routes

-- ============================================
-- SEED DATA: Demo Account + 6 months of data
-- ============================================

-- Demo user (password: demo123 - bcrypt hash)
INSERT INTO accounts (id, email, name, password, role) VALUES
('demo-1', 'demo@ahorrapp.com', 'Demo User', '$2b$10$9sGqF2T3k5lM1NqX8vY0.eO0JK1F9H5jG3kL2mN7pQ6rS4tU8vW0', 'user')
ON CONFLICT (email) DO NOTHING;

-- Default categories for demo
INSERT INTO categories (name, icon, color, type, is_default, account_id) VALUES
('Vivienda', 'Home', '#10b981', 'expense', TRUE, 'demo-1'),
('Alimentación', 'UtensilsCrossed', '#f59e0b', 'expense', TRUE, 'demo-1'),
('Transporte', 'Car', '#f43f5e', 'expense', TRUE, 'demo-1'),
('Entretenimiento', 'Gamepad2', '#6366f1', 'expense', TRUE, 'demo-1'),
('Servicios', 'Zap', '#06b6d4', 'expense', TRUE, 'demo-1'),
('Salud', 'Heart', '#ec4899', 'expense', TRUE, 'demo-1'),
('Educación', 'GraduationCap', '#8b5cf6', 'expense', TRUE, 'demo-1'),
('Ropa', 'Shirt', '#14b8a6', 'expense', TRUE, 'demo-1'),
('Otros', 'Circle', '#94a3b8', 'expense', TRUE, 'demo-1'),
('Salario', 'Banknote', '#10b981', 'income', TRUE, 'demo-1'),
('Freelance', 'Laptop', '#06b6d4', 'income', TRUE, 'demo-1'),
('Inversión', 'TrendingUp', '#8b5cf6', 'income', TRUE, 'demo-1'),
('Regalo', 'Gift', '#f59e0b', 'income', TRUE, 'demo-1')
ON CONFLICT DO NOTHING;

-- Sample incomes (6 months)
INSERT INTO incomes (source, amount, description, frequency, date, account_id) VALUES
('Salario', 4800.00, 'Salario Mensual', 'monthly', '2025-01-01', 'demo-1'),
('Salario', 5100.00, 'Salario Mensual', 'monthly', '2025-02-01', 'demo-1'),
('Salario', 4900.00, 'Salario Mensual', 'monthly', '2025-03-01', 'demo-1'),
('Salario', 5300.00, 'Salario Mensual', 'monthly', '2025-04-01', 'demo-1'),
('Salario', 5000.00, 'Salario Mensual', 'monthly', '2025-05-01', 'demo-1'),
('Salario', 5200.00, 'Salario Mensual', 'monthly', '2025-06-01', 'demo-1'),
('Freelance', 600.00, 'Proyecto Web', 'one-time', '2025-01-15', 'demo-1'),
('Freelance', 800.00, 'Diseño Logo', 'one-time', '2025-03-20', 'demo-1'),
('Freelance', 800.00, 'Proyecto Freelance', 'one-time', '2025-06-05', 'demo-1'),
('Inversión', 150.00, 'Retorno de Inversión', 'monthly', '2025-06-09', 'demo-1')
ON CONFLICT DO NOTHING;

-- Sample expenses (6 months)
INSERT INTO expenses (amount, description, date, is_recurring, account_id) VALUES
-- January
(1200.00, 'Pago de Renta', '2025-01-02', TRUE, 'demo-1'),
(580.00, 'Supermercado', '2025-01-05', FALSE, 'demo-1'),
(120.00, 'Recibo de Electricidad', '2025-01-08', TRUE, 'demo-1'),
(65.00, 'Gasolinera', '2025-01-10', FALSE, 'demo-1'),
(15.99, 'Suscripción Netflix', '2025-01-07', TRUE, 'demo-1'),
(50.00, 'Consulta Médica', '2025-01-15', FALSE, 'demo-1'),
-- February
(1200.00, 'Pago de Renta', '2025-02-02', TRUE, 'demo-1'),
(550.00, 'Supermercado', '2025-02-04', FALSE, 'demo-1'),
(115.00, 'Recibo de Electricidad', '2025-02-07', TRUE, 'demo-1'),
(60.00, 'Gasolinera', '2025-02-12', FALSE, 'demo-1'),
(15.99, 'Suscripción Netflix', '2025-02-07', TRUE, 'demo-1'),
(80.00, 'Cena en Restaurante', '2025-02-14', FALSE, 'demo-1'),
-- March
(1200.00, 'Pago de Renta', '2025-03-02', TRUE, 'demo-1'),
(620.00, 'Supermercado', '2025-03-05', FALSE, 'demo-1'),
(130.00, 'Recibo de Electricidad', '2025-03-08', TRUE, 'demo-1'),
(70.00, 'Gasolinera', '2025-03-10', FALSE, 'demo-1'),
(15.99, 'Suscripción Netflix', '2025-03-07', TRUE, 'demo-1'),
(200.00, 'Curso Online', '2025-03-18', FALSE, 'demo-1'),
-- April
(1200.00, 'Pago de Renta', '2025-04-02', TRUE, 'demo-1'),
(590.00, 'Supermercado', '2025-04-04', FALSE, 'demo-1'),
(125.00, 'Recibo de Electricidad', '2025-04-07', TRUE, 'demo-1'),
(55.00, 'Gasolinera', '2025-04-09', FALSE, 'demo-1'),
(15.99, 'Suscripción Netflix', '2025-04-07', TRUE, 'demo-1'),
-- May
(1200.00, 'Pago de Renta', '2025-05-02', TRUE, 'demo-1'),
(610.00, 'Supermercado', '2025-05-05', FALSE, 'demo-1'),
(118.00, 'Recibo de Electricidad', '2025-05-08', TRUE, 'demo-1'),
(72.00, 'Gasolinera', '2025-05-10', FALSE, 'demo-1'),
(15.99, 'Suscripción Netflix', '2025-05-07', TRUE, 'demo-1'),
-- June
(1200.00, 'Pago de Renta', '2025-06-02', TRUE, 'demo-1'),
(156.80, 'Supermercado', '2025-06-03', FALSE, 'demo-1'),
(120.00, 'Recibo de Electricidad', '2025-06-04', TRUE, 'demo-1'),
(65.00, 'Gasolinera', '2025-06-06', FALSE, 'demo-1'),
(15.99, 'Suscripción Netflix', '2025-06-07', TRUE, 'demo-1'),
(85.50, 'Cena en Restaurante', '2025-06-08', FALSE, 'demo-1'),
(55.00, 'Recibo de Teléfono', '2025-06-10', TRUE, 'demo-1')
ON CONFLICT DO NOTHING;

-- Sample savings goals
INSERT INTO savings_goals (id, name, target_amount, saved_amount, icon, color, deadline, account_id) VALUES
('sg-1', 'Fondo de Emergencia', 10000.00, 4500.00, '🛡️', '#10b981', '2025-12-31', 'demo-1'),
('sg-2', 'Vacaciones a Europa', 3000.00, 1200.00, '✈️', '#06b6d4', '2025-08-15', 'demo-1'),
('sg-3', 'Laptop Nueva', 2000.00, 800.00, '💻', '#8b5cf6', NULL, 'demo-1'),
('sg-4', 'Enganche de Casa', 50000.00, 15000.00, '🏠', '#f59e0b', '2027-06-01', 'demo-1')
ON CONFLICT DO NOTHING;

-- Savings contributions
INSERT INTO savings_contributions (amount, date, note, goal_id, account_id) VALUES
(500.00, '2025-06-01', 'Contribución mensual', 'sg-1', 'demo-1'),
(500.00, '2025-05-01', 'Contribución mensual', 'sg-1', 'demo-1'),
(300.00, '2025-04-15', 'Ahorros extra', 'sg-1', 'demo-1'),
(200.00, '2025-06-01', 'Ahorro para vuelos', 'sg-2', 'demo-1'),
(150.00, '2025-05-15', 'Ingreso extra', 'sg-2', 'demo-1'),
(200.00, '2025-06-05', 'Ahorros mensuales', 'sg-3', 'demo-1'),
(2000.00, '2025-06-01', 'Contribución mensual', 'sg-4', 'demo-1'),
(2000.00, '2025-05-01', 'Contribución mensual', 'sg-4', 'demo-1')
ON CONFLICT DO NOTHING;

-- Sample debts
INSERT INTO debts (id, name, total_amount, paid_amount, interest_rate, start_date, due_date, status, type, account_id) VALUES
('d-1', 'Tarjeta de Crédito Visa', 3500.00, 1200.00, 18.5, '2025-01-15', '2026-01-15', 'active', 'credit_card', 'demo-1'),
('d-2', 'Préstamo Personal', 10000.00, 4000.00, 12.0, '2024-06-01', '2027-06-01', 'active', 'loan', 'demo-1'),
('d-3', 'Préstamo de Auto', 25000.00, 15000.00, 8.5, '2023-01-01', '2026-01-01', 'active', 'loan', 'demo-1')
ON CONFLICT DO NOTHING;

-- Debt payments
INSERT INTO debt_payments (amount, date, note, debt_id, account_id) VALUES
(300.00, '2025-06-01', 'Pago mensual', 'd-1', 'demo-1'),
(300.00, '2025-05-01', 'Pago mensual', 'd-1', 'demo-1'),
(300.00, '2025-04-01', 'Pago mensual', 'd-1', 'demo-1'),
(500.00, '2025-06-05', 'Pago mensual', 'd-2', 'demo-1'),
(500.00, '2025-05-05', 'Pago mensual', 'd-2', 'demo-1'),
(700.00, '2025-06-10', 'Pago mensual', 'd-3', 'demo-1'),
(700.00, '2025-05-10', 'Pago mensual', 'd-3', 'demo-1')
ON CONFLICT DO NOTHING;

-- Sample budget
INSERT INTO budgets (id, name, total_amount, needs_percent, wants_percent, savings_percent, is_active, account_id) VALUES
('b-1', 'Presupuesto Mensual', 5200.00, 50, 30, 20, TRUE, 'demo-1')
ON CONFLICT DO NOTHING;

-- Budget periods (6 months)
INSERT INTO budget_periods (start_date, end_date, planned_income, planned_needs, planned_wants, planned_savings, actual_income, actual_needs, actual_wants, actual_savings, budget_id, account_id) VALUES
('2025-01-01', '2025-01-31', 4800.00, 2400.00, 1440.00, 960.00, 4800.00, 2380.00, 1200.00, 720.00, 'b-1', 'demo-1'),
('2025-02-01', '2025-02-28', 5100.00, 2550.00, 1530.00, 1020.00, 5100.00, 2480.00, 1350.00, 870.00, 'b-1', 'demo-1'),
('2025-03-01', '2025-03-31', 4900.00, 2450.00, 1470.00, 980.00, 4900.00, 2520.00, 1480.00, 620.00, 'b-1', 'demo-1'),
('2025-04-01', '2025-04-30', 5300.00, 2650.00, 1590.00, 1060.00, 5300.00, 2560.00, 1400.00, 950.00, 'b-1', 'demo-1'),
('2025-05-01', '2025-05-31', 5000.00, 2500.00, 1500.00, 1000.00, 5000.00, 2510.00, 1380.00, 820.00, 'b-1', 'demo-1'),
('2025-06-01', '2025-06-30', 5200.00, 2600.00, 1560.00, 1040.00, 5200.00, 2510.00, 1480.00, 770.00, 'b-1', 'demo-1')
ON CONFLICT DO NOTHING;

-- Sample notifications
INSERT INTO notifications (title, message, type, account_id, created_at) VALUES
('¡Bienvenido a AhorrApp!', 'Tu cuenta ha sido creada exitosamente. Comienza a gestionar tus finanzas.', 'success', 'demo-1', '2025-01-01T08:00:00Z'),
('Presupuesto excedido', 'Tus gastos en Entretenimiento superaron el presupuesto este mes.', 'warning', 'demo-1', '2025-05-28T10:00:00Z'),
('Meta de ahorro cercana', 'Vacaciones a Europa está al 40%. ¡Sigue así!', 'info', 'demo-1', '2025-06-10T09:00:00Z'),
('Pago de deuda próximo', 'El pago de tu Tarjeta de Crédito Visa vence en 5 días.', 'alert', 'demo-1', '2025-06-25T08:00:00Z')
ON CONFLICT DO NOTHING;

-- Sample dependents
INSERT INTO dependents (name, relationship, economic_weight, account_id) VALUES
('María García', 'spouse', 0.5, 'demo-1'),
('Carlos García', 'child', 0.3, 'demo-1')
ON CONFLICT DO NOTHING;