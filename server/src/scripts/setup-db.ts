#!/usr/bin/env ts-node

import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'
import { connectDatabase, checkDatabaseHealth } from '../config/database'

const execAsync = promisify(exec)

dotenv.config()

async function setupDatabase() {
  console.log('🚀 Setting up BrillenzChess database...\n')

  try {
    // Test database connection
    console.log('1. Testing database connection...')
    const connected = await connectDatabase()

    if (!connected) {
      console.error('❌ Could not connect to database. Please check your DATABASE_URL in .env')
      process.exit(1)
    }

    // Check database health
    console.log('2. Checking database health...')
    const health = await checkDatabaseHealth()
    console.log(`   Database status: ${health.status}`)

    if (health.status === 'unhealthy') {
      console.error(`   Error: ${health.error}`)
      process.exit(1)
    }

    // Run migrations
    console.log('3. Running database migrations...')
    await execAsync('npx prisma migrate deploy')
    console.log('   ✅ Migrations completed')

    // Generate Prisma client
    console.log('4. Generating Prisma client...')
    await execAsync('npx prisma generate')
    console.log('   ✅ Prisma client generated')

    console.log('\n🎉 Database setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Start the server: npm run dev')
    console.log('2. View database: npx prisma studio')
    console.log('3. Reset database: npm run db:reset (if needed)\n')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

async function resetDatabase() {
  console.log('🔄 Resetting database...')

  try {
    await execAsync('npx prisma migrate reset --force')
    console.log('✅ Database reset completed')
  } catch (error) {
    console.error('❌ Database reset failed:', error)
    process.exit(1)
  }
}

// Command line interface
const command = process.argv[2]

if (command === 'reset') {
  resetDatabase()
} else {
  setupDatabase()
}