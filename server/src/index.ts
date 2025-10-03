import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth'
import gameRoutes from './routes/game'
import { setupSocketHandlers } from './services/socket-service'
import { setupStockfish } from './services/stockfish-service'
import { connectDatabase, checkDatabaseHealth } from './config/database'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/game', gameRoutes)

app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth()
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    environment: process.env.NODE_ENV || 'development'
  })
})

async function startServer() {
  // Connect to database
  const dbConnected = await connectDatabase()
  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Exiting...')
    process.exit(1)
  }

  // Setup services
  setupSocketHandlers(io)
  setupStockfish()

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📡 WebSocket server ready`)
    console.log(`🗄️ Database connected`)
    console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...')

  const { disconnectDatabase } = await import('./config/database')
  await disconnectDatabase()

  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

startServer().catch((error) => {
  console.error('❌ Server startup failed:', error)
  process.exit(1)
})