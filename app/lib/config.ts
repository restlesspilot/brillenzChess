const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  // API Configuration
  API_BASE: process.env.NEXT_PUBLIC_API_URL ||
    (isDevelopment ? 'http://localhost:3001/api' : '/api'),

  // WebSocket Configuration
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ||
    (isDevelopment ? 'http://localhost:3001' : window?.location?.origin || ''),

  // Environment
  isDevelopment,
  isProduction,

  // App Configuration
  APP_NAME: 'BrillenzChess',
  APP_VERSION: '1.0.0',

  // Game Configuration
  DEFAULT_TIME_CONTROL: {
    initial: 600, // 10 minutes
    increment: 5  // 5 seconds per move
  }
}

// Development logging
if (isDevelopment) {
  console.log('🔧 App Configuration:', {
    API_BASE: config.API_BASE,
    SOCKET_URL: config.SOCKET_URL,
    environment: process.env.NODE_ENV
  })
}