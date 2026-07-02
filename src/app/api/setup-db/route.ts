import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function GET() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ status: 'disabled', message: 'Solo disponible en desarrollo' })
    }

    const count = await prisma.accounts.count()
    const demo = await prisma.accounts.findFirst({ where: { email: 'demo@ahorrapp.com' } })

    return NextResponse.json({
      status: count > 0 ? 'ready' : 'needs_setup',
      demoExists: !!demo,
      connected: true,
    })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Solo disponible en desarrollo' }, { status: 403 })
    }

    const existing = await prisma.accounts.findFirst({ where: { email: 'demo@ahorrapp.com' } })
    if (existing) {
      return NextResponse.json({ message: 'Datos de demo ya existen.', seeded: true })
    }

    const hashedPassword = await hash('demo123', 12)

    await prisma.accounts.create({
      data: { id: 'demo-1', email: 'demo@ahorrapp.com', name: 'Demo User', password: hashedPassword, role: 'user' },
    })

    await prisma.categories.createMany({
      data: [
        { name: 'Vivienda', icon: 'Home', color: '#10b981', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Alimentación', icon: 'UtensilsCrossed', color: '#f59e0b', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Transporte', icon: 'Car', color: '#f43f5e', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Entretenimiento', icon: 'Gamepad2', color: '#6366f1', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Servicios', icon: 'Zap', color: '#06b6d4', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Salud', icon: 'Heart', color: '#ec4899', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Educación', icon: 'GraduationCap', color: '#8b5cf6', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Otros', icon: 'Circle', color: '#94a3b8', type: 'expense', is_default: true, account_id: 'demo-1' },
        { name: 'Salario', icon: 'Banknote', color: '#10b981', type: 'income', is_default: true, account_id: 'demo-1' },
        { name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income', is_default: true, account_id: 'demo-1' },
        { name: 'Inversión', icon: 'TrendingUp', color: '#8b5cf6', type: 'income', is_default: true, account_id: 'demo-1' },
      ],
    })

    await prisma.savings_goals.createMany({
      data: [
        { id: 'sg-1', name: 'Fondo de Emergencia', target_amount: 10000, saved_amount: 4500, icon: '🛡️', color: '#10b981', deadline: new Date('2025-12-31'), account_id: 'demo-1' },
        { id: 'sg-2', name: 'Vacaciones a Europa', target_amount: 3000, saved_amount: 1200, icon: '✈️', color: '#06b6d4', deadline: new Date('2025-08-15'), account_id: 'demo-1' },
        { id: 'sg-3', name: 'Laptop Nueva', target_amount: 2000, saved_amount: 800, icon: '💻', color: '#8b5cf6', account_id: 'demo-1' },
        { id: 'sg-4', name: 'Enganche de Casa', target_amount: 50000, saved_amount: 15000, icon: '🏠', color: '#f59e0b', deadline: new Date('2027-06-01'), account_id: 'demo-1' },
      ],
    })

    await prisma.savings_contributions.createMany({
      data: [
        { amount: 500, date: new Date('2025-06-01'), note: 'Contribución mensual', goal_id: 'sg-1', account_id: 'demo-1' },
        { amount: 500, date: new Date('2025-05-01'), note: 'Contribución mensual', goal_id: 'sg-1', account_id: 'demo-1' },
        { amount: 200, date: new Date('2025-06-01'), note: 'Ahorro para vuelos', goal_id: 'sg-2', account_id: 'demo-1' },
        { amount: 200, date: new Date('2025-06-05'), note: 'Ahorros mensuales', goal_id: 'sg-3', account_id: 'demo-1' },
        { amount: 2000, date: new Date('2025-06-01'), note: 'Contribución mensual', goal_id: 'sg-4', account_id: 'demo-1' },
      ],
    })

    await prisma.debts.createMany({
      data: [
        { id: 'd-1', name: 'Tarjeta de Crédito Visa', total_amount: 3500, paid_amount: 1200, interest_rate: 18.5, status: 'active', type: 'credit_card', account_id: 'demo-1' },
        { id: 'd-2', name: 'Préstamo Personal', total_amount: 10000, paid_amount: 4000, interest_rate: 12.0, status: 'active', type: 'loan', account_id: 'demo-1' },
        { id: 'd-3', name: 'Préstamo de Auto', total_amount: 25000, paid_amount: 15000, interest_rate: 8.5, status: 'active', type: 'loan', account_id: 'demo-1' },
      ],
    })

    await prisma.debt_payments.createMany({
      data: [
        { amount: 300, date: new Date('2025-06-01'), note: 'Pago mensual', debt_id: 'd-1', account_id: 'demo-1' },
        { amount: 500, date: new Date('2025-06-05'), note: 'Pago mensual', debt_id: 'd-2', account_id: 'demo-1' },
        { amount: 700, date: new Date('2025-06-10'), note: 'Pago mensual', debt_id: 'd-3', account_id: 'demo-1' },
      ],
    })

    const salaries = [4800, 5100, 4900, 5300, 5000, 5200]
    await prisma.incomes.createMany({
      data: [
        ...['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'].map((m, i) => ({
          source: 'Salario', amount: salaries[i], description: 'Salario Mensual', frequency: 'monthly', date: new Date(`${m}-01`), account_id: 'demo-1',
        })),
        { source: 'Freelance', amount: 800, description: 'Proyecto Freelance', frequency: 'one-time', date: new Date('2025-06-05'), account_id: 'demo-1' },
        { source: 'Inversión', amount: 150, description: 'Retorno de Inversión', frequency: 'monthly', date: new Date('2025-06-09'), account_id: 'demo-1' },
      ],
    })

    await prisma.expenses.createMany({
      data: [
        ...['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'].map(m => ({
          amount: 1200, description: 'Pago de Renta', date: new Date(`${m}-02`), is_recurring: true, account_id: 'demo-1',
        })),
        { amount: 156.80, description: 'Supermercado', date: new Date('2025-06-03'), account_id: 'demo-1' },
        { amount: 120, description: 'Recibo de Electricidad', date: new Date('2025-06-04'), is_recurring: true, account_id: 'demo-1' },
        { amount: 65, description: 'Gasolinera', date: new Date('2025-06-06'), account_id: 'demo-1' },
        { amount: 15.99, description: 'Suscripción Netflix', date: new Date('2025-06-07'), is_recurring: true, account_id: 'demo-1' },
        { amount: 85.50, description: 'Cena en Restaurante', date: new Date('2025-06-08'), account_id: 'demo-1' },
        { amount: 55, description: 'Recibo de Teléfono', date: new Date('2025-06-10'), is_recurring: true, account_id: 'demo-1' },
      ],
    })

    await prisma.budgets.create({
      data: { id: 'b-1', name: 'Presupuesto Mensual', total_amount: 5200, needs_percent: 50, wants_percent: 30, savings_percent: 20, is_active: true, account_id: 'demo-1' },
    })

    await prisma.notifications.createMany({
      data: [
        { title: '¡Bienvenido a AhorrApp!', message: 'Tu cuenta ha sido creada exitosamente.', type: 'success', account_id: 'demo-1' },
        { title: 'Meta de ahorro cercana', message: 'Vacaciones a Europa está al 40%. ¡Sigue así!', type: 'info', account_id: 'demo-1' },
      ],
    })

    return NextResponse.json({ message: 'Base de datos inicializada con datos de demo.', seeded: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
