import prisma from '@/lib/prisma'

const defaultCategories = [
  { name: 'Vivienda', icon: 'Home', color: '#10b981', type: 'expense', is_default: true },
  { name: 'Alimentación', icon: 'UtensilsCrossed', color: '#f59e0b', type: 'expense', is_default: true },
  { name: 'Transporte', icon: 'Car', color: '#f43f5e', type: 'expense', is_default: true },
  { name: 'Entretenimiento', icon: 'Gamepad2', color: '#6366f1', type: 'expense', is_default: true },
  { name: 'Servicios', icon: 'Zap', color: '#06b6d4', type: 'expense', is_default: true },
  { name: 'Salud', icon: 'Heart', color: '#ec4899', type: 'expense', is_default: true },
  { name: 'Educación', icon: 'GraduationCap', color: '#8b5cf6', type: 'expense', is_default: true },
  { name: 'Otros', icon: 'Circle', color: '#94a3b8', type: 'expense', is_default: true },
  { name: 'Salario', icon: 'Banknote', color: '#10b981', type: 'income', is_default: true },
  { name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income', is_default: true },
  { name: 'Inversión', icon: 'TrendingUp', color: '#8b5cf6', type: 'income', is_default: true },
]

export async function createDefaultCategories(accountId: string) {
  await prisma.categories.createMany({
    data: defaultCategories.map((category) => ({
      ...category,
      account_id: accountId,
    })),
  })
}

