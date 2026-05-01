import { PrismaClient } from '@prisma/client'

// Prevent multiple instances in serverless/hot-reload environments
const globalForPrisma = global

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma
