import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth'
import prisma from '../config/database'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.username === username ? 'Username already taken' : 'Email already registered'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        createdAt: true
      }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ]
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(' ')[1]

    if (token) {
      await prisma.session.deleteMany({
        where: { token }
      })
    }

    res.json({ message: 'Logout successful' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        avatar: true,
        verified: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, email } = req.body
    const userId = req.userId!

    const updateData: any = {}

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      })

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' })
      }

      updateData.username = username
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      })

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' })
      }

      updateData.email = email
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        avatar: true,
        verified: true
      }
    })

    res.json({
      message: 'Profile updated successfully',
      user
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.userId!

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    })

    await prisma.session.deleteMany({
      where: { userId }
    })

    res.json({ message: 'Password changed successfully. Please log in again.' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router