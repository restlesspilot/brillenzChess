import { Server as SocketIOServer, Socket } from 'socket.io'
import { Chess, Move } from 'chess.js'
import { GameManager } from './game-manager'
import { authenticateSocket } from '../middleware/auth'

interface ClientToServerEvents {
  'join-room': (roomId: string) => void
  'leave-room': (roomId: string) => void
  'make-move': (data: { gameId: string; from: string; to: string; promotion?: string }) => void
  'offer-draw': (gameId: string) => void
  'accept-draw': (gameId: string) => void
  'decline-draw': (gameId: string) => void
  'resign': (gameId: string) => void
  'request-takeback': (gameId: string) => void
  'accept-takeback': (gameId: string) => void
  'decline-takeback': (gameId: string) => void
  'spectate-game': (gameId: string) => void
  'find-match': (preferences: MatchPreferences) => void
  'cancel-find-match': () => void
}

interface ServerToClientEvents {
  'game-updated': (gameState: any) => void
  'move-made': (data: { move: Move; gameState: any }) => void
  'game-ended': (result: any) => void
  'draw-offered': (data: { by: string }) => void
  'takeback-requested': (data: { by: string; moveCount: number }) => void
  'match-found': (gameId: string) => void
  'error': (message: string) => void
  'opponent-disconnected': () => void
  'opponent-reconnected': () => void
}

interface MatchPreferences {
  timeControl?: {
    initial: number
    increment: number
  }
  rated: boolean
  minRating?: number
  maxRating?: number
}

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string
  userInfo?: {
    id: string
    username: string
    rating: number
  }
}

export function setupSocketHandlers(io: SocketIOServer) {
  const gameManager = new GameManager()
  const waitingPlayers = new Map<string, { socket: AuthenticatedSocket; preferences: MatchPreferences }>()

  io.use(authenticateSocket)

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userInfo?.username || 'Anonymous'} connected: ${socket.id}`)

    socket.on('join-room', (roomId: string) => {
      socket.join(roomId)
      console.log(`User ${socket.userInfo?.username} joined room: ${roomId}`)
    })

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId)
      console.log(`User ${socket.userInfo?.username} left room: ${roomId}`)
    })

    socket.on('make-move', async (data) => {
      try {
        const { gameId, from, to, promotion } = data

        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        const result = await gameManager.makeMove(gameId, socket.userId, from, to, promotion)

        if (result.success && result.gameState) {
          io.to(gameId).emit('move-made', {
            move: result.move!,
            gameState: result.gameState
          })

          if (result.gameState.gameInfo.status === 'finished') {
            io.to(gameId).emit('game-ended', result.gameState.gameInfo.result)
          }
        } else {
          socket.emit('error', result.error || 'Invalid move')
        }
      } catch (error) {
        socket.emit('error', 'Failed to make move')
        console.error('Move error:', error)
      }
    })

    socket.on('offer-draw', async (gameId: string) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        const success = await gameManager.offerDraw(gameId, socket.userId)

        if (success) {
          socket.to(gameId).emit('draw-offered', { by: socket.userInfo?.username || 'Unknown' })
        } else {
          socket.emit('error', 'Cannot offer draw')
        }
      } catch (error) {
        socket.emit('error', 'Failed to offer draw')
        console.error('Draw offer error:', error)
      }
    })

    socket.on('accept-draw', async (gameId: string) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        const gameState = await gameManager.acceptDraw(gameId, socket.userId)

        if (gameState) {
          io.to(gameId).emit('game-ended', gameState.gameInfo.result)
        } else {
          socket.emit('error', 'Cannot accept draw')
        }
      } catch (error) {
        socket.emit('error', 'Failed to accept draw')
        console.error('Accept draw error:', error)
      }
    })

    socket.on('decline-draw', async (gameId: string) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        await gameManager.declineDraw(gameId, socket.userId)
      } catch (error) {
        console.error('Decline draw error:', error)
      }
    })

    socket.on('resign', async (gameId: string) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'Not authenticated')
          return
        }

        const gameState = await gameManager.resignGame(gameId, socket.userId)

        if (gameState) {
          io.to(gameId).emit('game-ended', gameState.gameInfo.result)
        } else {
          socket.emit('error', 'Cannot resign')
        }
      } catch (error) {
        socket.emit('error', 'Failed to resign')
        console.error('Resign error:', error)
      }
    })

    socket.on('find-match', (preferences: MatchPreferences) => {
      if (!socket.userId || !socket.userInfo) {
        socket.emit('error', 'Not authenticated')
        return
      }

      const matchedPlayer = findMatchingPlayer(socket, preferences, waitingPlayers)

      if (matchedPlayer) {
        waitingPlayers.delete(matchedPlayer.socket.userId!)

        createMatch(socket, matchedPlayer.socket, gameManager, io)
      } else {
        waitingPlayers.set(socket.userId, { socket, preferences })
        console.log(`User ${socket.userInfo.username} added to waiting queue`)
      }
    })

    socket.on('cancel-find-match', () => {
      if (socket.userId) {
        waitingPlayers.delete(socket.userId)
        console.log(`User ${socket.userInfo?.username} cancelled match search`)
      }
    })

    socket.on('spectate-game', (gameId: string) => {
      socket.join(gameId)
      console.log(`User ${socket.userInfo?.username || 'Anonymous'} spectating game: ${gameId}`)
    })

    socket.on('disconnect', () => {
      console.log(`User ${socket.userInfo?.username || 'Anonymous'} disconnected: ${socket.id}`)

      if (socket.userId) {
        waitingPlayers.delete(socket.userId)

        gameManager.handlePlayerDisconnect(socket.userId)
          .then((affectedGames) => {
            affectedGames.forEach(gameId => {
              socket.to(gameId).emit('opponent-disconnected')
            })
          })
          .catch(console.error)
      }
    })
  })
}

function findMatchingPlayer(
  socket: AuthenticatedSocket,
  preferences: MatchPreferences,
  waitingPlayers: Map<string, { socket: AuthenticatedSocket; preferences: MatchPreferences }>
): { socket: AuthenticatedSocket; preferences: MatchPreferences } | null {
  for (const [userId, player] of waitingPlayers) {
    if (userId === socket.userId) continue

    if (isMatchCompatible(socket, preferences, player.socket, player.preferences)) {
      return player
    }
  }

  return null
}

function isMatchCompatible(
  socket1: AuthenticatedSocket,
  prefs1: MatchPreferences,
  socket2: AuthenticatedSocket,
  prefs2: MatchPreferences
): boolean {
  if (prefs1.rated !== prefs2.rated) return false

  const rating1 = socket1.userInfo?.rating || 1200
  const rating2 = socket2.userInfo?.rating || 1200

  if (prefs1.minRating && rating2 < prefs1.minRating) return false
  if (prefs1.maxRating && rating2 > prefs1.maxRating) return false
  if (prefs2.minRating && rating1 < prefs2.minRating) return false
  if (prefs2.maxRating && rating1 > prefs2.maxRating) return false

  const ratingDifference = Math.abs(rating1 - rating2)
  return ratingDifference <= 200

}

async function createMatch(
  player1: AuthenticatedSocket,
  player2: AuthenticatedSocket,
  gameManager: GameManager,
  io: SocketIOServer
) {
  try {
    const gameId = await gameManager.createGame(
      player1.userId!,
      player2.userId!,
      {
        timeControl: { initial: 600, increment: 5 },
        rated: true,
        allowTakebacks: false,
        allowDrawOffers: true
      }
    )

    player1.join(gameId)
    player2.join(gameId)

    player1.emit('match-found', gameId)
    player2.emit('match-found', gameId)

    console.log(`Match created: ${gameId} between ${player1.userInfo?.username} and ${player2.userInfo?.username}`)
  } catch (error) {
    console.error('Error creating match:', error)
    player1.emit('error', 'Failed to create match')
    player2.emit('error', 'Failed to create match')
  }
}