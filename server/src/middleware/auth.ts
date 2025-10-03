import { Request, Response, NextFunction } from 'express'
import { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from '../config/database'

export interface AuthenticatedRequest extends Request {
  userId?: string
  user?: {
    id: string
    username: string
    email: string
    rating: number
  }
}

export interface AuthenticatedSocket extends Socket {
  userId?: string
  userInfo?: {
    id: string
    username: string
    rating: number
  }
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.userId = user.id
    req.user = user
    next()
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(403).json({ error: 'Invalid token' })
  }
}

export const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        rating: true
      }
    })

    if (!user) {
      return next(new Error('Authentication error: Invalid token'))
    }

    socket.userId = user.id
    socket.userInfo = user
    next()
  } catch (error) {
    console.error('Socket auth error:', error)
    next(new Error('Authentication error: Invalid token'))
  }
}

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          rating: true
        }
      })

      if (user) {
        req.userId = user.id
        req.user = user
      }
    }

    next()
  } catch (error) {
    next()
  }
}