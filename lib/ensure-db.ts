import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export function isMissingTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2010')
  )
}

/** Verifies SQLite schema is present (Hero table). */
export async function assertDbReady(): Promise<void> {
  await prisma.$queryRaw`SELECT 1 FROM "Hero" LIMIT 1`
}
