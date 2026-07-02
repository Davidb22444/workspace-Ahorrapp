import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  const users = await prisma.accounts.findMany({ select: { id: true, email: true, role: true, status: true } })
  console.log(JSON.stringify(users, null, 2))
  await prisma.$disconnect()
}

main().catch(console.error)
