'use client'

import { useState } from 'react'
import { Chess, Square } from 'chess.js'

interface ChessBoardProps {
  game: Chess
  onMove: (from: string, to: string) => boolean
  orientation: 'white' | 'black'
}

const pieceSymbols: { [key: string]: string } = {
  wP: '♙', wR: '♖', wN: '♘', wB: '♗', wQ: '♕', wK: '♔',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚'
}

export default function ChessBoard({ game, onMove, orientation }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<string[]>([])

  const board = game.board()
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]

  const handleSquareClick = (square: Square) => {
    if (selectedSquare === square) {
      setSelectedSquare(null)
      setPossibleMoves([])
      return
    }

    if (selectedSquare) {
      const moveSuccessful = onMove(selectedSquare, square)

      if (moveSuccessful) {
        setSelectedSquare(null)
        setPossibleMoves([])
      } else if (game.get(square)) {
        setSelectedSquare(square)
        const moves = game.moves({ square, verbose: true })
        setPossibleMoves(moves.map(move => move.to))
      } else {
        setSelectedSquare(null)
        setPossibleMoves([])
      }
    } else {
      const piece = game.get(square)
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square)
        const moves = game.moves({ square, verbose: true })
        setPossibleMoves(moves.map(move => move.to))
      }
    }
  }

  const isLightSquare = (rank: number, file: string) => {
    const fileIndex = files.indexOf(file)
    return (rank + fileIndex) % 2 === 0
  }

  const getSquareColor = (rank: number, file: string, square: Square) => {
    const isLight = isLightSquare(rank, file)

    if (selectedSquare === square) {
      return 'bg-yellow-400'
    }

    if (possibleMoves.includes(square)) {
      return isLight ? 'bg-green-300' : 'bg-green-400'
    }

    return isLight ? 'bg-chess-light' : 'bg-chess-dark'
  }

  return (
    <div className="chess-board">
      <div className="grid grid-cols-8 border-4 border-gray-800">
        {ranks.map(rank =>
          files.map(file => {
            const square = `${file}${rank}` as Square
            const piece = board[rank - 1][files.indexOf(file)]
            const pieceKey = piece ? `${piece.color}${piece.type.toUpperCase()}` : null

            return (
              <div
                key={square}
                className={`chess-square ${getSquareColor(rank, file, square)} cursor-pointer hover:brightness-110`}
                onClick={() => handleSquareClick(square)}
              >
                {pieceKey && (
                  <span className="chess-piece text-5xl">
                    {pieceSymbols[pieceKey]}
                  </span>
                )}

                {possibleMoves.includes(square) && !piece && (
                  <div className="w-4 h-4 bg-gray-600 rounded-full opacity-60" />
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="flex justify-between text-sm text-gray-600 mt-2 px-2">
        {files.map(file => (
          <span key={file} className="w-16 text-center font-medium">
            {file}
          </span>
        ))}
      </div>
    </div>
  )
}