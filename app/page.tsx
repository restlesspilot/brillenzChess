'use client'

import { useState } from 'react'
import ChessBoard from './components/ChessBoard'
import GameSidebar from './components/GameSidebar'
import { Chess } from 'chess.js'

export default function Home() {
  const [game, setGame] = useState(new Chess())
  const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'draw'>('playing')

  const handleMove = (from: string, to: string) => {
    const gameCopy = new Chess(game.fen())

    try {
      const move = gameCopy.move({ from, to, promotion: 'q' })

      if (move) {
        setGame(gameCopy)

        if (gameCopy.isCheckmate()) {
          setGameStatus('checkmate')
        } else if (gameCopy.isDraw()) {
          setGameStatus('draw')
        }

        return true
      }
    } catch (error) {
      return false
    }

    return false
  }

  const resetGame = () => {
    setGame(new Chess())
    setGameStatus('playing')
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">BrillenzChess</h1>
        <p className="text-gray-600">Play chess online with friends or against AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="lg:col-span-2 flex justify-center">
          <ChessBoard
            game={game}
            onMove={handleMove}
            orientation="white"
          />
        </div>

        <div className="lg:col-span-1">
          <GameSidebar
            game={game}
            gameStatus={gameStatus}
            onReset={resetGame}
          />
        </div>
      </div>
    </main>
  )
}