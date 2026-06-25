'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  CheckCircle2,
  Copy,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const SETUP_SQL = `-- ============================================
-- AhorrApp - Supabase Table Setup
-- Ejecuta esto en: Supabase Dashboard → SQL Editor
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

-- RLS: Enable + allow all (auth is handled at app level via accountId)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts','categories','dependents','movements','incomes',
    'expenses','unexpecteds','debts','debt_payments','savings_goals',
    'savings_contributions','budgets','budget_periods','notifications','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all on ' || t || '" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all on ' || t || '" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts','categories','dependents','movements','incomes',
    'expenses','unexpecteds','debts','debt_payments','savings_goals',
    'savings_contributions','budgets','budget_periods'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t);
  END LOOP;
END $$;`

type DbStatus = 'checking' | 'needs_setup' | 'needs_seed' | 'ready' | 'error'

export default function SupabaseSetupScreen({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<DbStatus>('checking')
  const [seeding, setSeeding] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setStatus('checking')
    try {
      const res = await fetch('/api/setup-db')
      const data = await res.json()
      if (data.status === 'ready') {
        setStatus('ready')
        onReady()
      } else if (data.status === 'needs_seed') {
        setStatus('needs_seed')
      } else {
        setStatus('needs_setup')
      }
    } catch {
      setStatus('error')
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/setup-db', { method: 'POST' })
      const data = await res.json()
      if (data.seeded || data.message) {
        toast.success('¡Datos de demo cargados exitosamente!')
        setStatus('ready')
        onReady()
      } else {
        toast.error('Error al cargar datos: ' + (data.error || 'Error desconocido'))
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSeeding(false)
    }
  }

  const copySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL)
    setCopied(true)
    toast.success('SQL copiado al portapapeles')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 mb-4"
          >
            <Database className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configurar Base de Datos
          </h1>
          <p className="text-gray-500">
            Conectando AhorrApp con Supabase
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Checking status */}
          {status === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="py-12 flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-gray-500">Verificando conexión con Supabase...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Needs setup - tables don't exist */}
          {status === 'needs_setup' && (
            <motion.div
              key="needs_setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-amber-900">Tablas no encontradas</CardTitle>
                      <CardDescription className="text-amber-700">
                        Necesitas crear las tablas en tu proyecto de Supabase
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-sm">Paso 1</span>
                    Ejecutar SQL en Supabase
                  </CardTitle>
                  <CardDescription>
                    Copia el SQL y ejecútalo en el Editor SQL de tu proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">1</span>
                      Abre tu{' '}
                      <a
                        href="https://supabase.com/dashboard/project/sechjiufeqfipqcouvcg/sql"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium underline"
                      >
                        Editor SQL de Supabase <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">2</span>
                      Pega el SQL de abajo y haz clic en <strong>&quot;Run&quot;</strong>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">3</span>
                      Vuelve aquí y haz clic en <strong>&quot;Verificar conexión&quot;</strong>
                    </li>
                  </ol>

                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={copySQL}
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copiado' : 'Copiar SQL'}
                    </Button>
                    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs leading-relaxed overflow-auto max-h-64 font-mono">
                      {SETUP_SQL}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={checkStatus}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Verificar conexión
                </Button>
              </div>
            </motion.div>
          )}

          {/* Needs seed - tables exist but no data */}
          {status === 'needs_seed' && (
            <motion.div
              key="needs_seed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-emerald-600" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Tablas listas</CardTitle>
                  <CardDescription>
                    Las tablas están creadas. ¿Quieres cargar los datos de demo?
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center gap-3">
                  <Button onClick={handleSeed} disabled={seeding} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {seeding ? 'Cargando...' : 'Cargar datos de demo'}
                  </Button>
                  <Button variant="outline" onClick={onReady}>
                    Saltar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Error */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-red-200">
                <CardContent className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900">Error de conexión</h3>
                    <p className="text-sm text-red-600 mt-1">
                      No se pudo conectar con Supabase. Verifica las variables de entorno.
                    </p>
                  </div>
                  <Button variant="outline" onClick={checkStatus} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          AhorrApp usa Supabase (PostgreSQL) como base de datos en la nube
        </p>
      </motion.div>
    </div>
  )
}