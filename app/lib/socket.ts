'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3001'

export interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

export function useSocket(token: string | null) {
  const socket = useRef<Socket | null>(null)
  const connected = useRef(false)

  useEffect(() => {
    if (token && !socket.current) {
      socket.current = io(SOCKET_URL, {
        auth: {
          token
        }
      })

      socket.current.on('connect', () => {
        connected.current = true
        console.log('Connected to server')
      })

      socket.current.on('disconnect', () => {
        connected.current = false
        console.log('Disconnected from server')
      })

      socket.current.on('error', (error) => {
        console.error('Socket error:', error)
      })
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect()
        socket.current = null
        connected.current = false
      }
    }
  }, [token])

  return {
    socket: socket.current,
    connected: connected.current
  }
}

export function createSocketConnection(token: string): Socket {
  return io(SOCKET_URL, {
    auth: {
      token
    }
  })
}