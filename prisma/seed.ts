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
  try { return await model.create({ data }) } catch { return null }
}

function daysAgo(n: number) { return new Date(Date.now() - n * 86400000) }
function monthStart(offset: number) { return startOfMonth(subMonths(new Date(), offset)) }

async function main() {
  console.log('🌱 Seeding database...')

  const hashedPassword = await hash('demo123', 12)
  const user = await prisma.account.upsert({
    where: { email: 'demo@ahorrapp.com' },
    update: {},
    create: { email: 'demo@ahorrapp.com', name: 'Usuario Demo', password: hashedPassword, role: 'user' },
  })

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: `${cat.name.toLowerCase().replace(/\s+/g, '-')}-${user.id}` },
      update: {},
      create: {
        id: `${cat.name.toLowerCase().replace(/\s+/g, '-')}-${user.id}`,
        name: cat.name, icon: cat.icon, color: cat.color, type: cat.type,
        isDefault: true, accountId: user.id,
      },
    })
  }

  const categories = await prisma.category.findMany({ where: { accountId: user.id, type: 'expense' } })
  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]))
  const incomeCats = await prisma.category.findMany({ where: { accountId: user.id, type: 'income' } })
  const incCatMap = Object.fromEntries(incomeCats.map(c => [c.name, c.id]))

  // Income for last 6 months
  for (let m = 5; m >= 0; m--) {
    const ms = monthStart(m)
    await safeCreate(prisma.income, { source: 'salary', amount: 4500, description: 'Salario mensual', frequency: 'monthly', date: ms, categoryId: incCatMap['Salario'], accountId: user.id })
    if (m % 2 === 0) await safeCreate(prisma.income, { source: 'freelance', amount: 600 + Math.round(Math.random() * 400), description: 'Proyecto freelance', frequency: 'once', date: new Date(ms.getTime() + 10 * 86400000), categoryId: incCatMap['Freelance'], accountId: user.id })
    await safeCreate(prisma.income, { source: 'investment', amount: 100 + Math.round(Math.random() * 100), description: 'Dividendos', frequency: 'monthly', date: new Date(ms.getTime() + 15 * 86400000), categoryId: incCatMap['Inversiones'], accountId: user.id })
  }

  // Expenses for last 6 months
  for (let m = 5; m >= 0; m--) {
    const ms = monthStart(m)
    await safeCreate(prisma.expense, { amount: 1200, description: 'Renta del apartamento', date: ms, categoryId: catMap['Vivienda'], isRecurring: true, frequency: 'monthly', accountId: user.id })
    await safeCreate(prisma.expense, { amount: 380 + Math.round(Math.random() * 120), description: 'Supermercado', date: new Date(ms.getTime() + 5 * 86400000), categoryId: catMap['Alimentación'], isRecurring: true, frequency: 'monthly', accountId: user.id })
    await safeCreate(prisma.expense, { amount: 75 + Math.round(Math.random() * 30), description: 'Gasolina', date: new Date(ms.getTime() + 8 * 86400000), categoryId: catMap['Transporte'], isRecurring: true, frequency: 'monthly', accountId: user.id })
    await safeCreate(prisma.expense, { amount: 15.99, description: 'Netflix', date: ms, categoryId: catMap['Suscripciones'], isRecurring: true, frequency: 'monthly', accountId: user.id })
    await safeCreate(prisma.expense, { amount: 110 + Math.round(Math.random() * 30), description: 'Electricidad + Agua', date: new Date(ms.getTime() + 3 * 86400000), categoryId: catMap['Servicios'], isRecurring: true, frequency: 'monthly', accountId: user.id })
    if (m % 3 === 0) await safeCreate(prisma.expense, { amount: 150 + Math.round(Math.random() * 100), description: 'Consulta médica', date: new Date(ms.getTime() + 12 * 86400000), categoryId: catMap['Salud'], accountId: user.id })
    if (m % 2 === 0) await safeCreate(prisma.expense, { amount: 40 + Math.round(Math.random() * 50), description: 'Entretenimiento', date: new Date(ms.getTime() + 18 * 86400000), categoryId: catMap['Entretenimiento'], accountId: user.id })
    if (m === 0) await safeCreate(prisma.expense, { amount: 120, description: 'Curso online', date: daysAgo(5), categoryId: catMap['Educación'], accountId: user.id })
  }

  // Unexpected expenses
  await safeCreate(prisma.unexpected, { amount: 350, description: 'Reparación del auto', date: daysAgo(12), categoryId: catMap['Transporte'], resolved: true, accountId: user.id })
  await safeCreate(prisma.unexpected, { amount: 180, description: 'Visita al dentista', date: daysAgo(3), categoryId: catMap['Salud'], resolved: false, accountId: user.id })
  await safeCreate(prisma.unexpected, { amount: 500, description: 'Lavadora rota', date: daysAgo(20), categoryId: catMap['Servicios'], resolved: false, accountId: user.id })

  // Movements
  await safeCreate(prisma.movement, { type: 'entrada', amount: 5450, description: 'Ingresos del mes', date: daysAgo(1), accountId: user.id })
  await safeCreate(prisma.movement, { type: 'salida', amount: 1200, description: 'Renta', date: daysAgo(2), categoryId: catMap['Vivienda'], accountId: user.id })
  await safeCreate(prisma.movement, { type: 'salida', amount: 450, description: 'Supermercado', date: daysAgo(3), categoryId: catMap['Alimentación'], accountId: user.id })
  await safeCreate(prisma.movement, { type: 'salida', amount: 80, description: 'Gasolina', date: daysAgo(5), categoryId: catMap['Transporte'], accountId: user.id })
  await safeCreate(prisma.movement, { type: 'entrada', amount: 800, description: 'Proyecto freelance', date: daysAgo(7), accountId: user.id })

  // Savings goals
  const goal1 = await safeCreate(prisma.savingsGoal, { name: 'Viaje a Japón', targetAmount: 5000, savedAmount: 2200, icon: 'Plane', color: '#ef4444', deadline: new Date(Date.now() + 180 * 86400000), status: 'active', accountId: user.id })
  const goal2 = await safeCreate(prisma.savingsGoal, { name: 'Fondo de emergencia', targetAmount: 10000, savedAmount: 6500, icon: 'Shield', color: '#10b981', status: 'active', accountId: user.id })
  const goal3 = await safeCreate(prisma.savingsGoal, { name: 'Laptop nueva', targetAmount: 2000, savedAmount: 1800, icon: 'Laptop', color: '#6366f1', deadline: new Date(Date.now() + 30 * 86400000), status: 'active', accountId: user.id })
  const goal4 = await safeCreate(prisma.savingsGoal, { name: 'Enganche casa', targetAmount: 50000, savedAmount: 15000, icon: 'Home', color: '#f59e0b', deadline: new Date(Date.now() + 730 * 86400000), status: 'active', accountId: user.id })

  if (goal1) await safeCreate(prisma.savingsContribution, { amount: 400, goalId: goal1.id, accountId: user.id, date: daysAgo(5), note: 'Ahorro mensual' })
  if (goal2) await safeCreate(prisma.savingsContribution, { amount: 500, goalId: goal2.id, accountId: user.id, date: daysAgo(10), note: 'Depósito' })
  if (goal3) await safeCreate(prisma.savingsContribution, { amount: 200, goalId: goal3.id, accountId: user.id, date: daysAgo(3), note: 'Ahorro quincenal' })

  // Debts
  const debt1 = await safeCreate(prisma.debt, { name: 'Préstamo Personal', totalAmount: 10000, paidAmount: 4500, interestRate: 8.5, startDate: subMonths(new Date(), 12), dueDate: new Date(Date.now() + 365 * 86400000), status: 'pending', type: 'loan', installments: 24, accountId: user.id })
  const debt2 = await safeCreate(prisma.debt, { name: 'Tarjeta de Crédito', totalAmount: 3000, paidAmount: 1800, interestRate: 18.9, startDate: subMonths(new Date(), 8), status: 'pending', type: 'credit_card', accountId: user.id })
  const debt3 = await safeCreate(prisma.debt, { name: 'Préstamo Auto', totalAmount: 25000, paidAmount: 8000, interestRate: 5.9, startDate: subMonths(new Date(), 18), dueDate: new Date(Date.now() + 730 * 86400000), status: 'pending', type: 'loan', installments: 60, accountId: user.id })

  if (debt1) {
    await safeCreate(prisma.debtPayment, { amount: 500, debtId: debt1.id, accountId: user.id, date: daysAgo(5), note: 'Cuota mensual' })
    await safeCreate(prisma.debtPayment, { amount: 500, debtId: debt1.id, accountId: user.id, date: daysAgo(35), note: 'Cuota mensual' })
  }
  if (debt2) await safeCreate(prisma.debtPayment, { amount: 300, debtId: debt2.id, accountId: user.id, date: daysAgo(10), note: 'Pago tarjeta' })
  if (debt3) await safeCreate(prisma.debtPayment, { amount: 450, debtId: debt3.id, accountId: user.id, date: daysAgo(7), note: 'Cuota auto' })

  // Budget
  const budget = await safeCreate(prisma.budget, { name: 'Presupuesto Mensual 50/30/20', totalAmount: 5450, needsPercent: 50, wantsPercent: 30, savingsPercent: 20, cycle: 'monthly', isActive: true, accountId: user.id })
  if (budget) {
    await safeCreate(prisma.budgetPeriod, {
      startDate: monthStart(0), endDate: new Date(),
      plannedIncome: 5450, plannedNeeds: 2725, plannedWants: 1635, plannedSavings: 1090,
      actualIncome: 5250, actualNeeds: 2100, actualWants: 350, actualSavings: 800,
      budgetId: budget.id, accountId: user.id,
    })
  }

  // Dependents
  await safeCreate(prisma.dependent, { name: 'María García', relationship: 'spouse', economicWeight: 1.0, accountId: user.id })
  await safeCreate(prisma.dependent, { name: 'Carlos García', relationship: 'child', economicWeight: 0.5, birthDate: new Date('2015-05-20'), accountId: user.id })
  await safeCreate(prisma.dependent, { name: 'Ana García', relationship: 'child', economicWeight: 0.3, birthDate: new Date('2018-11-10'), accountId: user.id })

  // Notifications
  await safeCreate(prisma.notification, { title: 'Bienvenido a AhorrApp', message: 'Tu asistente financiero personal está listo.', type: 'success', accountId: user.id, createdAt: daysAgo(30) })
  await safeCreate(prisma.notification, { title: 'Presupuesto al límite', message: 'Has alcanzado el 85% de tu presupuesto de entretenimiento.', type: 'warning', accountId: user.id, createdAt: daysAgo(5) })
  await safeCreate(prisma.notification, { title: 'Meta de ahorro cercana', message: '¡Tu laptop nueva está al 90%!', type: 'info', accountId: user.id, createdAt: daysAgo(2) })

  console.log('✅ Seed completed!')
  console.log(`📧 Demo account: demo@ahorrapp.com / demo123`)
}

main().catch(console.error).finally(() => prisma.$disconnect())