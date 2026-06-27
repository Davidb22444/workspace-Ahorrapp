import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { subMonths, subDays, startOfMonth, format } from 'date-fns'

const prisma = new PrismaClient()

const DEFAULT_CATEGORIES = [
  { name: 'Salario', icon: 'Briefcase', color: '#10b981', type: 'income' },
  { name: 'Bonos', icon: 'Gift', color: '#f59e0b', type: 'income' },
  { name: 'Alquiler', icon: 'Home', color: '#6366f1', type: 'income' },
  { name: 'Freelance', icon: 'Laptop', color: '#8b5cf6', type: 'income' },
  { name: 'Inversiones', icon: 'TrendingUp', color: '#06b6d4', type: 'income' },
  { name: 'Otros Ingresos', icon: 'PlusCircle', color: '#64748b', type: 'income' },
  { name: 'Alimentación', icon: 'UtensilsCrossed', color: '#ef4444', type: 'expense' },
  { name: 'Transporte', icon: 'Car', color: '#f97316', type: 'expense' },
  { name: 'Vivienda', icon: 'House', color: '#eab308', type: 'expense' },
  { name: 'Salud', icon: 'Heart', color: '#ec4899', type: 'expense' },
  { name: 'Educación', icon: 'GraduationCap', color: '#8b5cf6', type: 'expense' },
  { name: 'Entretenimiento', icon: 'Gamepad2', color: '#06b6d4', type: 'expense' },
  { name: 'Ropa', icon: 'Shirt', color: '#14b8a6', type: 'expense' },
  { name: 'Servicios', icon: 'Zap', color: '#64748b', type: 'expense' },
  { name: 'Suscripciones', icon: 'CreditCard', color: '#a855f7', type: 'expense' },
  { name: 'Otros Gastos', icon: 'MoreHorizontal', color: '#94a3b8', type: 'expense' },
]

async function safeCreate<T>(model: any, data: any): Promise<T | null> {
  try { return await model.create({ data }) } catch (e) { console.error('Error creating:', e); return null }
}

function daysAgo(n: number) { return new Date(Date.now() - n * 86400000) }
function monthStart(offset: number) { return startOfMonth(subMonths(new Date(), offset)) }

async function main() {
  console.log('🌱 Seeding database...')

  const hashedPassword = await hash('demo123', 12)
  const user = await prisma.accounts.upsert({
    where: { email: 'demo@ahorrapp.com' },
    update: {},
    create: { email: 'demo@ahorrapp.com', name: 'Usuario Demo', password: hashedPassword, role: 'user' },
  })

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.categories.upsert({
      where: { id: `${cat.name.toLowerCase().replace(/\s+/g, '-')}-${user.id}` },
      update: {},
      create: {
        id: `${cat.name.toLowerCase().replace(/\s+/g, '-')}-${user.id}`,
        name: cat.name, icon: cat.icon, color: cat.color, type: cat.type,
        is_default: true, account_id: user.id,
      },
    })
  }

  const categories = await prisma.categories.findMany({ where: { account_id: user.id, type: 'expense' } })
  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]))
  const incomeCats = await prisma.categories.findMany({ where: { account_id: user.id, type: 'income' } })
  const incCatMap = Object.fromEntries(incomeCats.map(c => [c.name, c.id]))

  // Income for last 6 months
  for (let m = 5; m >= 0; m--) {
    const ms = monthStart(m)
    await safeCreate(prisma.incomes, { source: 'salary', amount: 4500, description: 'Salario mensual', frequency: 'monthly', date: ms, category_id: incCatMap['Salario'], account_id: user.id })
    if (m % 2 === 0) await safeCreate(prisma.incomes, { source: 'freelance', amount: 600 + Math.round(Math.random() * 400), description: 'Proyecto freelance', frequency: 'once', date: new Date(ms.getTime() + 10 * 86400000), category_id: incCatMap['Freelance'], account_id: user.id })
    await safeCreate(prisma.incomes, { source: 'investment', amount: 100 + Math.round(Math.random() * 100), description: 'Dividendos', frequency: 'monthly', date: new Date(ms.getTime() + 15 * 86400000), category_id: incCatMap['Inversiones'], account_id: user.id })
  }

  // Expenses for last 6 months
  for (let m = 5; m >= 0; m--) {
    const ms = monthStart(m)
    await safeCreate(prisma.expenses, { amount: 1200, description: 'Renta del apartamento', date: ms, category_id: catMap['Vivienda'], is_recurring: true, frequency: 'monthly', account_id: user.id })
    await safeCreate(prisma.expenses, { amount: 380 + Math.round(Math.random() * 120), description: 'Supermercado', date: new Date(ms.getTime() + 5 * 86400000), category_id: catMap['Alimentación'], is_recurring: true, frequency: 'monthly', account_id: user.id })
    await safeCreate(prisma.expenses, { amount: 75 + Math.round(Math.random() * 30), description: 'Gasolina', date: new Date(ms.getTime() + 8 * 86400000), category_id: catMap['Transporte'], is_recurring: true, frequency: 'monthly', account_id: user.id })
    await safeCreate(prisma.expenses, { amount: 15.99, description: 'Netflix', date: ms, category_id: catMap['Suscripciones'], is_recurring: true, frequency: 'monthly', account_id: user.id })
    await safeCreate(prisma.expenses, { amount: 110 + Math.round(Math.random() * 30), description: 'Electricidad + Agua', date: new Date(ms.getTime() + 3 * 86400000), category_id: catMap['Servicios'], is_recurring: true, frequency: 'monthly', account_id: user.id })
    if (m % 3 === 0) await safeCreate(prisma.expenses, { amount: 150 + Math.round(Math.random() * 100), description: 'Consulta médica', date: new Date(ms.getTime() + 12 * 86400000), category_id: catMap['Salud'], account_id: user.id })
    if (m % 2 === 0) await safeCreate(prisma.expenses, { amount: 40 + Math.round(Math.random() * 50), description: 'Entretenimiento', date: new Date(ms.getTime() + 18 * 86400000), category_id: catMap['Entretenimiento'], account_id: user.id })
    if (m === 0) await safeCreate(prisma.expenses, { amount: 120, description: 'Curso online', date: daysAgo(5), category_id: catMap['Educación'], account_id: user.id })
  }

  // Unexpected expenses
  await safeCreate(prisma.unexpecteds, { amount: 350, description: 'Reparación del auto', date: daysAgo(12), category_id: catMap['Transporte'], resolved: true, account_id: user.id })
  await safeCreate(prisma.unexpecteds, { amount: 180, description: 'Visita al dentista', date: daysAgo(3), category_id: catMap['Salud'], resolved: false, account_id: user.id })
  await safeCreate(prisma.unexpecteds, { amount: 500, description: 'Lavadora rota', date: daysAgo(20), category_id: catMap['Servicios'], resolved: false, account_id: user.id })

  // Movements
  await safeCreate(prisma.movements, { type: 'entrada', amount: 5450, description: 'Ingresos del mes', date: daysAgo(1), account_id: user.id })
  await safeCreate(prisma.movements, { type: 'salida', amount: 1200, description: 'Renta', date: daysAgo(2), category_id: catMap['Vivienda'], account_id: user.id })
  await safeCreate(prisma.movements, { type: 'salida', amount: 450, description: 'Supermercado', date: daysAgo(3), category_id: catMap['Alimentación'], account_id: user.id })
  await safeCreate(prisma.movements, { type: 'salida', amount: 80, description: 'Gasolina', date: daysAgo(5), category_id: catMap['Transporte'], account_id: user.id })
  await safeCreate(prisma.movements, { type: 'entrada', amount: 800, description: 'Proyecto freelance', date: daysAgo(7), account_id: user.id })

  // Savings goals
  const goal1 = await safeCreate<{ id: string }>(prisma.savings_goals, { name: 'Viaje a Japón', target_amount: 5000, saved_amount: 2200, icon: 'Plane', color: '#ef4444', deadline: new Date(Date.now() + 180 * 86400000), status: 'active', account_id: user.id })
  const goal2 = await safeCreate<{ id: string }>(prisma.savings_goals, { name: 'Fondo de emergencia', target_amount: 10000, saved_amount: 6500, icon: 'Shield', color: '#10b981', status: 'active', account_id: user.id })
  const goal3 = await safeCreate<{ id: string }>(prisma.savings_goals, { name: 'Laptop nueva', target_amount: 2000, saved_amount: 1800, icon: 'Laptop', color: '#6366f1', deadline: new Date(Date.now() + 30 * 86400000), status: 'active', account_id: user.id })
  const goal4 = await safeCreate<{ id: string }>(prisma.savings_goals, { name: 'Enganche casa', target_amount: 50000, saved_amount: 15000, icon: 'Home', color: '#f59e0b', deadline: new Date(Date.now() + 730 * 86400000), status: 'active', account_id: user.id })

  if (goal1) await safeCreate(prisma.savings_contributions, { amount: 400, goal_id: goal1.id, account_id: user.id, date: daysAgo(5), note: 'Ahorro mensual' })
  if (goal2) await safeCreate(prisma.savings_contributions, { amount: 500, goal_id: goal2.id, account_id: user.id, date: daysAgo(10), note: 'Depósito' })
  if (goal3) await safeCreate(prisma.savings_contributions, { amount: 200, goal_id: goal3.id, account_id: user.id, date: daysAgo(3), note: 'Ahorro quincenal' })

  // Debts
  const debt1 = await safeCreate<{ id: string }>(prisma.debts, { name: 'Préstamo Personal', total_amount: 10000, paid_amount: 4500, interest_rate: 8.5, start_date: subMonths(new Date(), 12), due_date: new Date(Date.now() + 365 * 86400000), status: 'pending', type: 'loan', installments: 24, account_id: user.id })
  const debt2 = await safeCreate<{ id: string }>(prisma.debts, { name: 'Tarjeta de Crédito', total_amount: 3000, paid_amount: 1800, interest_rate: 18.9, start_date: subMonths(new Date(), 8), status: 'pending', type: 'credit_card', account_id: user.id })
  const debt3 = await safeCreate<{ id: string }>(prisma.debts, { name: 'Préstamo Auto', total_amount: 25000, paid_amount: 8000, interest_rate: 5.9, start_date: subMonths(new Date(), 18), due_date: new Date(Date.now() + 730 * 86400000), status: 'pending', type: 'loan', installments: 60, account_id: user.id })

  if (debt1) {
    await safeCreate(prisma.debt_payments, { amount: 500, debt_id: debt1.id, account_id: user.id, date: daysAgo(5), note: 'Cuota mensual' })
    await safeCreate(prisma.debt_payments, { amount: 500, debt_id: debt1.id, account_id: user.id, date: daysAgo(35), note: 'Cuota mensual' })
  }
  if (debt2) await safeCreate(prisma.debt_payments, { amount: 300, debt_id: debt2.id, account_id: user.id, date: daysAgo(10), note: 'Pago tarjeta' })
  if (debt3) await safeCreate(prisma.debt_payments, { amount: 450, debt_id: debt3.id, account_id: user.id, date: daysAgo(7), note: 'Cuota auto' })

  // Budget
  const budget = await safeCreate<{ id: string }>(prisma.budgets, { name: 'Presupuesto Mensual 50/30/20', total_amount: 5450, needs_percent: 50, wants_percent: 30, savings_percent: 20, cycle: 'monthly', is_active: true, account_id: user.id })
  if (budget) {
    await safeCreate(prisma.budget_periods, {
      start_date: monthStart(0), endDate: new Date(),
      planned_income: 5450, planned_needs: 2725, planned_wants: 1635, planned_savings: 1090,
      actual_income: 5250, actual_needs: 2100, actual_wants: 350, actual_savings: 800,
      budget_id: budget.id, account_id: user.id,
    })
  }

  // Dependents
  await safeCreate(prisma.dependents, { name: 'María García', relationship: 'spouse', economic_weight: 1.0, account_id: user.id })
  await safeCreate(prisma.dependents, { name: 'Carlos García', relationship: 'child', economic_weight: 0.5, birth_date: new Date('2015-05-20'), account_id: user.id })
  await safeCreate(prisma.dependents, { name: 'Ana García', relationship: 'child', economic_weight: 0.3, birth_date: new Date('2018-11-10'), account_id: user.id })

  // Notifications
  await safeCreate(prisma.notifications, { title: 'Bienvenido a AhorrApp', message: 'Tu asistente financiero personal está listo.', type: 'success', account_id: user.id, created_at: daysAgo(30) })
  await safeCreate(prisma.notifications, { title: 'Presupuesto al límite', message: 'Has alcanzado el 85% de tu presupuesto de entretenimiento.', type: 'warning', account_id: user.id, created_at: daysAgo(5) })
  await safeCreate(prisma.notifications, { title: 'Meta de ahorro cercana', message: '¡Tu laptop nueva está al 90%!', type: 'info', account_id: user.id, created_at: daysAgo(2) })

  console.log('✅ Seed completed!')
  console.log(`📧 Demo account: demo@ahorrapp.com / demo123`)
}

main().catch(console.error).finally(() => prisma.$disconnect())