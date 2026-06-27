import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hash } from 'bcryptjs'

// GET /api/setup-db - Check database status
export async function GET() {
  try {
    const { error } = await supabase.from('accounts').select('id').limit(1)
    if (error && (error.code === '42P01' || error.code === 'PGRST116')) {
      return NextResponse.json({ status: 'needs_setup', message: 'Tablas no encontradas. Ejecuta el SQL en el editor de Supabase.' })
    }
    const { data: demo } = await supabase.from('accounts').select('id').eq('email', 'demo@ahorrapp.com').single()
    return NextResponse.json({ status: demo ? 'ready' : 'needs_seed', connected: true })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}

// POST /api/setup-db - Seed demo data
export async function POST() {
  try {
    const { data: existing } = await supabase.from('accounts').select('id').eq('email', 'demo@ahorrapp.com').single()
    if (existing) return NextResponse.json({ message: 'Datos de demo ya existen.', seeded: true })

    const hashedPassword = await hash('demo123', 12)
    await supabase.from('accounts').insert({ id: 'demo-1', email: 'demo@ahorrapp.com', name: 'Demo User', password: hashedPassword, role: 'user' })

    await supabase.from('categories').insert([
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
    ])

    await supabase.from('savings_goals').insert([
      { id: 'sg-1', name: 'Fondo de Emergencia', target_amount: 10000, saved_amount: 4500, icon: '🛡️', color: '#10b981', deadline: '2025-12-31', account_id: 'demo-1' },
      { id: 'sg-2', name: 'Vacaciones a Europa', target_amount: 3000, saved_amount: 1200, icon: '✈️', color: '#06b6d4', deadline: '2025-08-15', account_id: 'demo-1' },
      { id: 'sg-3', name: 'Laptop Nueva', target_amount: 2000, saved_amount: 800, icon: '💻', color: '#8b5cf6', account_id: 'demo-1' },
      { id: 'sg-4', name: 'Enganche de Casa', target_amount: 50000, saved_amount: 15000, icon: '🏠', color: '#f59e0b', deadline: '2027-06-01', account_id: 'demo-1' },
    ])

    await supabase.from('savings_contributions').insert([
      { amount: 500, date: '2025-06-01', note: 'Contribución mensual', goal_id: 'sg-1', account_id: 'demo-1' },
      { amount: 500, date: '2025-05-01', note: 'Contribución mensual', goal_id: 'sg-1', account_id: 'demo-1' },
      { amount: 200, date: '2025-06-01', note: 'Ahorro para vuelos', goal_id: 'sg-2', account_id: 'demo-1' },
      { amount: 200, date: '2025-06-05', note: 'Ahorros mensuales', goal_id: 'sg-3', account_id: 'demo-1' },
      { amount: 2000, date: '2025-06-01', note: 'Contribución mensual', goal_id: 'sg-4', account_id: 'demo-1' },
    ])

    await supabase.from('debts').insert([
      { id: 'd-1', name: 'Tarjeta de Crédito Visa', total_amount: 3500, paid_amount: 1200, interest_rate: 18.5, status: 'active', type: 'credit_card', account_id: 'demo-1' },
      { id: 'd-2', name: 'Préstamo Personal', total_amount: 10000, paid_amount: 4000, interest_rate: 12.0, status: 'active', type: 'loan', account_id: 'demo-1' },
      { id: 'd-3', name: 'Préstamo de Auto', total_amount: 25000, paid_amount: 15000, interest_rate: 8.5, status: 'active', type: 'loan', account_id: 'demo-1' },
    ])

    await supabase.from('debt_payments').insert([
      { amount: 300, date: '2025-06-01', note: 'Pago mensual', debt_id: 'd-1', account_id: 'demo-1' },
      { amount: 500, date: '2025-06-05', note: 'Pago mensual', debt_id: 'd-2', account_id: 'demo-1' },
      { amount: 700, date: '2025-06-10', note: 'Pago mensual', debt_id: 'd-3', account_id: 'demo-1' },
    ])

    const salaries = [4800, 5100, 4900, 5300, 5000, 5200]
    await supabase.from('incomes').insert([
      ...['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06'].map((m, i) => ({
        source: 'Salario', amount: salaries[i], description: 'Salario Mensual', frequency: 'monthly', date: `${m}-01`, account_id: 'demo-1'
      })),
      { source: 'Freelance', amount: 800, description: 'Proyecto Freelance', frequency: 'one-time', date: '2025-06-05', account_id: 'demo-1' },
      { source: 'Inversión', amount: 150, description: 'Retorno de Inversión', frequency: 'monthly', date: '2025-06-09', account_id: 'demo-1' },
    ])

    await supabase.from('expenses').insert([
      ...['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06'].map(m => ({
        amount: 1200, description: 'Pago de Renta', date: `${m}-02`, is_recurring: true, account_id: 'demo-1'
      })),
      { amount: 156.80, description: 'Supermercado', date: '2025-06-03', account_id: 'demo-1' },
      { amount: 120, description: 'Recibo de Electricidad', date: '2025-06-04', is_recurring: true, account_id: 'demo-1' },
      { amount: 65, description: 'Gasolinera', date: '2025-06-06', account_id: 'demo-1' },
      { amount: 15.99, description: 'Suscripción Netflix', date: '2025-06-07', is_recurring: true, account_id: 'demo-1' },
      { amount: 85.50, description: 'Cena en Restaurante', date: '2025-06-08', account_id: 'demo-1' },
      { amount: 55, description: 'Recibo de Teléfono', date: '2025-06-10', is_recurring: true, account_id: 'demo-1' },
    ])

    await supabase.from('budgets').insert({
      id: 'b-1', name: 'Presupuesto Mensual', total_amount: 5200, needs_percent: 50, wants_percent: 30, savings_percent: 20, is_active: true, account_id: 'demo-1',
    })

    await supabase.from('notifications').insert([
      { title: '¡Bienvenido a AhorrApp!', message: 'Tu cuenta ha sido creada exitosamente.', type: 'success', account_id: 'demo-1' },
      { title: 'Meta de ahorro cercana', message: 'Vacaciones a Europa está al 40%. ¡Sigue así!', type: 'info', account_id: 'demo-1' },
    ])

    return NextResponse.json({ message: 'Base de datos inicializada con datos de demo.', seeded: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}