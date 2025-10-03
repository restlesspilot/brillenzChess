import express from 'express'
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth'
import prisma from '../config/database'

const router = express.Router()

router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))
    const skip = (page - 1) * limit

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { whiteId: userId },
          { blackId: userId }
        ],
        status: 'FINISHED'
      },
      include: {
        whitePlayer: {
          select: { id: true, username: true, rating: true }
        },
        blackPlayer: {
          select: { id: true, username: true, rating: true }
        },
        moves: {
          orderBy: { moveNumber: 'asc' },
          select: {
            moveNumber: true,
            san: true,
            timestamp: true
          }
        }
      },
      orderBy: { finishedAt: 'desc' },
      skip,
      take: limit
    })

    const totalGames = await prisma.game.count({
      where: {
        OR: [
          { whiteId: userId },
          { blackId: userId }
        ],
        status: 'FINISHED'
      }
    })

    res.json({
      games,
      pagination: {
        page,
        limit,
        total: totalGames,
        pages: Math.ceil(totalGames / limit)
      }
    })
  } catch (error) {
    console.error('Get game history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/active', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!

    const activeGames = await prisma.game.findMany({
      where: {
        OR: [
          { whiteId: userId },
          { blackId: userId }
        ],
        status: {
          in: ['WAITING', 'PLAYING', 'PAUSED']
        }
      },
      include: {
        whitePlayer: {
          select: { id: true, username: true, rating: true }
        },
        blackPlayer: {
          select: { id: true, username: true, rating: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    res.json({ games: activeGames })
  } catch (error) {
    console.error('Get active games error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:gameId', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { gameId } = req.params

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: {
          select: { id: true, username: true, rating: true }
        },
        blackPlayer: {
          select: { id: true, username: true, rating: true }
        },
        moves: {
          orderBy: { moveNumber: 'asc' }
        }
      }
    })

    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }

    const isPlayer = req.userId && (game.whiteId === req.userId || game.blackId === req.userId)

    const gameData = {
      id: game.id,
      fen: game.fen,
      pgn: game.pgn,
      status: game.status,
      result: game.result,
      timeControl: game.timeControl,
      rated: game.rated,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      players: {
        white: game.whitePlayer,
        black: game.blackPlayer
      },
      moves: game.moves,
      canView: isPlayer || game.status === 'FINISHED'
    }

    if (!gameData.canView && !req.userId) {
      return res.status(401).json({ error: 'Authentication required to view this game' })
    }

    if (!gameData.canView) {
      return res.status(403).json({ error: 'Not authorized to view this game' })
    }

    res.json({ game: gameData })
  } catch (error) {
    console.error('Get game error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, rating: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const [totalGames, wins, losses, draws] = await Promise.all([
      prisma.game.count({
        where: {
          OR: [{ whiteId: userId }, { blackId: userId }],
          status: 'FINISHED'
        }
      }),
      prisma.game.count({
        where: {
          OR: [
            { whiteId: userId, result: 'WHITE_WINS' },
            { blackId: userId, result: 'BLACK_WINS' }
          ]
        }
      }),
      prisma.game.count({
        where: {
          OR: [
            { whiteId: userId, result: 'BLACK_WINS' },
            { blackId: userId, result: 'WHITE_WINS' },
            { whiteId: userId, result: 'BLACK_TIMEOUT' },
            { blackId: userId, result: 'WHITE_TIMEOUT' },
            { whiteId: userId, result: 'BLACK_RESIGNATION' },
            { blackId: userId, result: 'WHITE_RESIGNATION' }
          ]
        }
      }),
      prisma.game.count({
        where: {
          OR: [{ whiteId: userId }, { blackId: userId }],
          result: { in: ['DRAW', 'STALEMATE'] }
        }
      })
    ])

    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0'

    res.json({
      user,
      stats: {
        totalGames,
        wins,
        losses,
        draws,
        winRate: parseFloat(winRate)
      }
    })
  } catch (error) {
    console.error('Get user stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10))

    let orderBy: any = { rating: 'desc' }

    if (type === 'games') {
      orderBy = { createdAt: 'desc' }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        rating: true,
        createdAt: true,
        _count: {
          select: {
            whiteGames: { where: { status: 'FINISHED' } },
            blackGames: { where: { status: 'FINISHED' } }
          }
        }
      },
      orderBy,
      take: limit
    })

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username,
      rating: user.rating,
      totalGames: user._count.whiteGames + user._count.blackGames,
      joinedAt: user.createdAt
    }))

    res.json({ leaderboard })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router