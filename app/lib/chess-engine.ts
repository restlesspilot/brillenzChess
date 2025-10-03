import { Chess, Move, Square } from 'chess.js'

export interface ChessGameState {
  fen: string
  turn: 'w' | 'b'
  isCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  isStalemate: boolean
  isThreefoldRepetition: boolean
  isInsufficientMaterial: boolean
  moveCount: number
  history: Move[]
}

export interface MoveResult {
  success: boolean
  move?: Move
  gameState?: ChessGameState
  error?: string
}

export class ChessEngine {
  private game: Chess

  constructor(fen?: string) {
    this.game = new Chess(fen)
  }

  getGameState(): ChessGameState {
    const history = this.game.history({ verbose: true })

    return {
      fen: this.game.fen(),
      turn: this.game.turn(),
      isCheck: this.game.isCheck(),
      isCheckmate: this.game.isCheckmate(),
      isDraw: this.game.isDraw(),
      isStalemate: this.game.isStalemate(),
      isThreefoldRepetition: this.game.isThreefoldRepetition(),
      isInsufficientMaterial: this.game.isInsufficientMaterial(),
      moveCount: history.length,
      history
    }
  }

  makeMove(from: Square, to: Square, promotion?: string): MoveResult {
    try {
      const move = this.game.move({
        from,
        to,
        promotion: promotion || 'q'
      })

      if (move) {
        return {
          success: true,
          move,
          gameState: this.getGameState()
        }
      }

      return {
        success: false,
        error: 'Invalid move'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Move failed'
      }
    }
  }

  getPossibleMoves(square?: Square): string[] {
    const moves = this.game.moves({
      square,
      verbose: true
    })

    return moves.map(move => move.to)
  }

  isMovePossible(from: Square, to: Square): boolean {
    const possibleMoves = this.getPossibleMoves(from)
    return possibleMoves.includes(to)
  }

  undoMove(): boolean {
    return this.game.undo() !== null
  }

  reset(): void {
    this.game.reset()
  }

  loadPosition(fen: string): boolean {
    try {
      this.game.load(fen)
      return true
    } catch {
      return false
    }
  }

  getBoard() {
    return this.game.board()
  }

  getPiece(square: Square) {
    return this.game.get(square)
  }

  isSquareAttacked(square: Square, color: 'w' | 'b'): boolean {
    return this.game.isSquareAttacked(square, color)
  }

  getAttackedSquares(color: 'w' | 'b'): Square[] {
    const squares: Square[] = []
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8]

    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}` as Square
        if (this.isSquareAttacked(square, color)) {
          squares.push(square)
        }
      }
    }

    return squares
  }

  evaluatePosition(): number {
    const pieceValues: { [key: string]: number } = {
      p: 1, r: 5, n: 3, b: 3, q: 9, k: 0
    }

    let evaluation = 0
    const board = this.game.board()

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file]
        if (piece) {
          const value = pieceValues[piece.type] || 0
          evaluation += piece.color === 'w' ? value : -value
        }
      }
    }

    if (this.game.isCheckmate()) {
      evaluation += this.game.turn() === 'w' ? -1000 : 1000
    }

    return evaluation
  }

  clone(): ChessEngine {
    return new ChessEngine(this.game.fen())
  }
}