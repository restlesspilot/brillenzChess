import { Move } from 'chess.js'

export type GameMode = 'local' | 'online' | 'ai'
export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished'
export type PlayerColor = 'white' | 'black'

export interface Player {
  id: string
  name: string
  color: PlayerColor
  rating?: number
  avatar?: string
}

export interface GameSettings {
  timeControl?: {
    initial: number // seconds
    increment: number // seconds per move
  }
  rated: boolean
  allowTakebacks: boolean
  allowDrawOffers: boolean
}

export interface GameInfo {
  id: string
  mode: GameMode
  status: GameStatus
  players: {
    white?: Player
    black?: Player
  }
  settings: GameSettings
  createdAt: Date
  startedAt?: Date
  finishedAt?: Date
  result?: {
    winner?: PlayerColor
    reason: 'checkmate' | 'resignation' | 'timeout' | 'draw' | 'stalemate'
    description: string
  }
}

export interface TimerState {
  whiteTime: number
  blackTime: number
  isRunning: boolean
  activeColor: PlayerColor
  lastMoveTime?: Date
}

export interface GameState {
  gameInfo: GameInfo
  fen: string
  moves: Move[]
  currentMove: number
  timer?: TimerState
  pendingDrawOffer?: PlayerColor
  pendingTakeback?: {
    requestedBy: PlayerColor
    moveCount: number
  }
}

export class GameStateManager {
  private gameState: GameState
  private listeners: Set<(state: GameState) => void> = new Set()

  constructor(gameInfo: GameInfo, initialFen?: string) {
    this.gameState = {
      gameInfo,
      fen: initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      currentMove: 0,
      timer: gameInfo.settings.timeControl ? {
        whiteTime: gameInfo.settings.timeControl.initial,
        blackTime: gameInfo.settings.timeControl.initial,
        isRunning: false,
        activeColor: 'white'
      } : undefined
    }
  }

  getState(): GameState {
    return { ...this.gameState }
  }

  updateGameInfo(updates: Partial<GameInfo>): void {
    this.gameState.gameInfo = { ...this.gameState.gameInfo, ...updates }
    this.notifyListeners()
  }

  addMove(move: Move): void {
    if (this.gameState.currentMove < this.gameState.moves.length) {
      this.gameState.moves = this.gameState.moves.slice(0, this.gameState.currentMove)
    }

    this.gameState.moves.push(move)
    this.gameState.currentMove++

    if (this.gameState.timer) {
      this.updateTimer(move)
    }

    this.notifyListeners()
  }

  goToMove(moveIndex: number): boolean {
    if (moveIndex >= 0 && moveIndex <= this.gameState.moves.length) {
      this.gameState.currentMove = moveIndex
      this.notifyListeners()
      return true
    }
    return false
  }

  undoMove(): boolean {
    if (this.gameState.currentMove > 0) {
      this.gameState.currentMove--
      this.notifyListeners()
      return true
    }
    return false
  }

  offerDraw(color: PlayerColor): void {
    this.gameState.pendingDrawOffer = color
    this.notifyListeners()
  }

  acceptDraw(): void {
    this.gameState.gameInfo.status = 'finished'
    this.gameState.gameInfo.result = {
      reason: 'draw',
      description: 'Draw by agreement'
    }
    this.gameState.gameInfo.finishedAt = new Date()
    this.gameState.pendingDrawOffer = undefined
    this.notifyListeners()
  }

  declineDraw(): void {
    this.gameState.pendingDrawOffer = undefined
    this.notifyListeners()
  }

  requestTakeback(color: PlayerColor): void {
    this.gameState.pendingTakeback = {
      requestedBy: color,
      moveCount: this.gameState.currentMove
    }
    this.notifyListeners()
  }

  acceptTakeback(): void {
    if (this.gameState.pendingTakeback) {
      const targetMove = Math.max(0, this.gameState.pendingTakeback.moveCount - 2)
      this.goToMove(targetMove)
      this.gameState.moves = this.gameState.moves.slice(0, targetMove)
      this.gameState.pendingTakeback = undefined
    }
    this.notifyListeners()
  }

  declineTakeback(): void {
    this.gameState.pendingTakeback = undefined
    this.notifyListeners()
  }

  startGame(): void {
    this.gameState.gameInfo.status = 'playing'
    this.gameState.gameInfo.startedAt = new Date()

    if (this.gameState.timer) {
      this.gameState.timer.isRunning = true
    }

    this.notifyListeners()
  }

  endGame(result: GameInfo['result']): void {
    this.gameState.gameInfo.status = 'finished'
    this.gameState.gameInfo.result = result
    this.gameState.gameInfo.finishedAt = new Date()

    if (this.gameState.timer) {
      this.gameState.timer.isRunning = false
    }

    this.notifyListeners()
  }

  private updateTimer(move: Move): void {
    if (!this.gameState.timer || !this.gameState.gameInfo.settings.timeControl) {
      return
    }

    const now = new Date()
    const { increment } = this.gameState.gameInfo.settings.timeControl

    if (this.gameState.timer.lastMoveTime) {
      const elapsed = Math.floor((now.getTime() - this.gameState.timer.lastMoveTime.getTime()) / 1000)

      if (this.gameState.timer.activeColor === 'white') {
        this.gameState.timer.whiteTime = Math.max(0, this.gameState.timer.whiteTime - elapsed + increment)
      } else {
        this.gameState.timer.blackTime = Math.max(0, this.gameState.timer.blackTime - elapsed + increment)
      }
    }

    this.gameState.timer.activeColor = this.gameState.timer.activeColor === 'white' ? 'black' : 'white'
    this.gameState.timer.lastMoveTime = now

    if (this.gameState.timer.whiteTime <= 0) {
      this.endGame({
        winner: 'black',
        reason: 'timeout',
        description: 'White ran out of time'
      })
    } else if (this.gameState.timer.blackTime <= 0) {
      this.endGame({
        winner: 'white',
        reason: 'timeout',
        description: 'Black ran out of time'
      })
    }
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.gameState))
  }
}