import { Chess, Move } from 'chess.js'
import { v4 as uuidv4 } from 'uuid'

interface GameSettings {
  timeControl?: {
    initial: number
    increment: number
  }
  rated: boolean
  allowTakebacks: boolean
  allowDrawOffers: boolean
}

interface Player {
  id: string
  color: 'white' | 'black'
  connected: boolean
}

interface GameState {
  id: string
  players: {
    white?: Player
    black?: Player
  }
  settings: GameSettings
  chess: Chess
  status: 'waiting' | 'playing' | 'paused' | 'finished'
  result?: {
    winner?: 'white' | 'black'
    reason: 'checkmate' | 'resignation' | 'timeout' | 'draw' | 'stalemate'
    description: string
  }
  pendingDrawOffer?: 'white' | 'black'
  createdAt: Date
  startedAt?: Date
  finishedAt?: Date
  timer?: {
    whiteTime: number
    blackTime: number
    isRunning: boolean
    lastMoveTime?: Date
  }
}

export class GameManager {
  private games = new Map<string, GameState>()
  private playerGames = new Map<string, Set<string>>()

  async createGame(player1Id: string, player2Id: string, settings: GameSettings): Promise<string> {
    const gameId = uuidv4()
    const chess = new Chess()

    const whitePlayerId = Math.random() < 0.5 ? player1Id : player2Id
    const blackPlayerId = whitePlayerId === player1Id ? player2Id : player1Id

    const gameState: GameState = {
      id: gameId,
      players: {
        white: { id: whitePlayerId, color: 'white', connected: true },
        black: { id: blackPlayerId, color: 'black', connected: true }
      },
      settings,
      chess,
      status: 'playing',
      createdAt: new Date(),
      startedAt: new Date(),
      timer: settings.timeControl ? {
        whiteTime: settings.timeControl.initial,
        blackTime: settings.timeControl.initial,
        isRunning: true,
        lastMoveTime: new Date()
      } : undefined
    }

    this.games.set(gameId, gameState)

    if (!this.playerGames.has(player1Id)) {
      this.playerGames.set(player1Id, new Set())
    }
    if (!this.playerGames.has(player2Id)) {
      this.playerGames.set(player2Id, new Set())
    }

    this.playerGames.get(player1Id)!.add(gameId)
    this.playerGames.get(player2Id)!.add(gameId)

    return gameId
  }

  async makeMove(gameId: string, playerId: string, from: string, to: string, promotion?: string): Promise<{
    success: boolean
    move?: Move
    gameState?: any
    error?: string
  }> {
    const game = this.games.get(gameId)

    if (!game) {
      return { success: false, error: 'Game not found' }
    }

    if (game.status !== 'playing') {
      return { success: false, error: 'Game is not in progress' }
    }

    const playerColor = this.getPlayerColor(game, playerId)
    if (!playerColor) {
      return { success: false, error: 'Player not in this game' }
    }

    const currentTurn = game.chess.turn() === 'w' ? 'white' : 'black'
    if (playerColor !== currentTurn) {
      return { success: false, error: 'Not your turn' }
    }

    try {
      const move = game.chess.move({ from, to, promotion: promotion || 'q' })

      if (!move) {
        return { success: false, error: 'Invalid move' }
      }

      this.updateTimer(game, move)
      this.checkGameEnd(game)

      return {
        success: true,
        move,
        gameState: this.getGameStateForClient(game)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Move failed'
      }
    }
  }

  async offerDraw(gameId: string, playerId: string): Promise<boolean> {
    const game = this.games.get(gameId)

    if (!game || game.status !== 'playing' || !game.settings.allowDrawOffers) {
      return false
    }

    const playerColor = this.getPlayerColor(game, playerId)
    if (!playerColor) {
      return false
    }

    game.pendingDrawOffer = playerColor
    return true
  }

  async acceptDraw(gameId: string, playerId: string): Promise<any> {
    const game = this.games.get(gameId)

    if (!game || !game.pendingDrawOffer) {
      return null
    }

    const playerColor = this.getPlayerColor(game, playerId)
    if (!playerColor || playerColor === game.pendingDrawOffer) {
      return null
    }

    game.status = 'finished'
    game.result = {
      reason: 'draw',
      description: 'Draw by agreement'
    }
    game.finishedAt = new Date()
    game.pendingDrawOffer = undefined

    if (game.timer) {
      game.timer.isRunning = false
    }

    return this.getGameStateForClient(game)
  }

  async declineDraw(gameId: string, playerId: string): Promise<void> {
    const game = this.games.get(gameId)

    if (game) {
      game.pendingDrawOffer = undefined
    }
  }

  async resignGame(gameId: string, playerId: string): Promise<any> {
    const game = this.games.get(gameId)

    if (!game || game.status !== 'playing') {
      return null
    }

    const playerColor = this.getPlayerColor(game, playerId)
    if (!playerColor) {
      return null
    }

    const winner = playerColor === 'white' ? 'black' : 'white'

    game.status = 'finished'
    game.result = {
      winner,
      reason: 'resignation',
      description: `${playerColor} resigned`
    }
    game.finishedAt = new Date()

    if (game.timer) {
      game.timer.isRunning = false
    }

    return this.getGameStateForClient(game)
  }

  async handlePlayerDisconnect(playerId: string): Promise<string[]> {
    const affectedGames: string[] = []
    const playerGameIds = this.playerGames.get(playerId) || new Set()

    for (const gameId of playerGameIds) {
      const game = this.games.get(gameId)
      if (game && game.status === 'playing') {
        const player = game.players.white?.id === playerId ? game.players.white : game.players.black
        if (player) {
          player.connected = false
          affectedGames.push(gameId)
        }
      }
    }

    return affectedGames
  }

  getGame(gameId: string): any {
    const game = this.games.get(gameId)
    return game ? this.getGameStateForClient(game) : null
  }

  private getPlayerColor(game: GameState, playerId: string): 'white' | 'black' | null {
    if (game.players.white?.id === playerId) return 'white'
    if (game.players.black?.id === playerId) return 'black'
    return null
  }

  private updateTimer(game: GameState, move: Move): void {
    if (!game.timer || !game.settings.timeControl) {
      return
    }

    const now = new Date()

    if (game.timer.lastMoveTime) {
      const elapsed = Math.floor((now.getTime() - game.timer.lastMoveTime.getTime()) / 1000)
      const currentColor = move.color === 'w' ? 'white' : 'black'

      if (currentColor === 'white') {
        game.timer.whiteTime = Math.max(0, game.timer.whiteTime - elapsed + game.settings.timeControl.increment)
      } else {
        game.timer.blackTime = Math.max(0, game.timer.blackTime - elapsed + game.settings.timeControl.increment)
      }

      if (game.timer.whiteTime <= 0) {
        this.endGameByTimeout(game, 'black')
      } else if (game.timer.blackTime <= 0) {
        this.endGameByTimeout(game, 'white')
      }
    }

    game.timer.lastMoveTime = now
  }

  private endGameByTimeout(game: GameState, winner: 'white' | 'black'): void {
    game.status = 'finished'
    game.result = {
      winner,
      reason: 'timeout',
      description: `${winner === 'white' ? 'Black' : 'White'} ran out of time`
    }
    game.finishedAt = new Date()

    if (game.timer) {
      game.timer.isRunning = false
    }
  }

  private checkGameEnd(game: GameState): void {
    if (game.chess.isCheckmate()) {
      const winner = game.chess.turn() === 'w' ? 'black' : 'white'
      game.status = 'finished'
      game.result = {
        winner,
        reason: 'checkmate',
        description: `Checkmate! ${winner} wins`
      }
      game.finishedAt = new Date()

      if (game.timer) {
        game.timer.isRunning = false
      }
    } else if (game.chess.isDraw()) {
      game.status = 'finished'

      let reason: 'draw' | 'stalemate' = 'draw'
      let description = 'Draw'

      if (game.chess.isStalemate()) {
        reason = 'stalemate'
        description = 'Stalemate'
      } else if (game.chess.isThreefoldRepetition()) {
        description = 'Draw by threefold repetition'
      } else if (game.chess.isInsufficientMaterial()) {
        description = 'Draw by insufficient material'
      }

      game.result = { reason, description }
      game.finishedAt = new Date()

      if (game.timer) {
        game.timer.isRunning = false
      }
    }
  }

  private getGameStateForClient(game: GameState): any {
    return {
      id: game.id,
      players: game.players,
      settings: game.settings,
      fen: game.chess.fen(),
      moves: game.chess.history({ verbose: true }),
      status: game.status,
      result: game.result,
      pendingDrawOffer: game.pendingDrawOffer,
      timer: game.timer,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      turn: game.chess.turn(),
      isCheck: game.chess.isCheck(),
      isCheckmate: game.chess.isCheckmate(),
      isDraw: game.chess.isDraw()
    }
  }
}