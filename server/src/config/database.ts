import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma

export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('🗄️ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('🗄️ Database disconnected')
  } catch (error) {
    console.error('❌ Database disconnection error:', error)
  }
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}