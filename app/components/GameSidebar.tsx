'use client'

import { Chess } from 'chess.js'
import { Clock, RotateCcw, Users, Bot } from 'lucide-react'

interface GameSidebarProps {
  game: Chess
  gameStatus: 'playing' | 'checkmate' | 'draw'
  onReset: () => void
}

export default function GameSidebar({ game, gameStatus, onReset }: GameSidebarProps) {
  const history = game.history({ verbose: true })
  const currentPlayer = game.turn() === 'w' ? 'White' : 'Black'

  const getGameStatusText = () => {
    if (gameStatus === 'checkmate') {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      return `Checkmate! ${winner} wins`
    }
    if (gameStatus === 'draw') {
      return 'Game ended in a draw'
    }
    if (game.isCheck()) {
      return `${currentPlayer} is in check`
    }
    return `${currentPlayer} to move`
  }

  return (
    <div className="space-y-6">
      <div className="game-sidebar">
        <h2 className="text-xl font-bold mb-4">Game Status</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Turn:</span>
            <span className="font-medium">{currentPlayer}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-center font-medium">{getGameStatusText()}</p>
          </div>

          <button
            onClick={onReset}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Game
          </button>
        </div>
      </div>

      <div className="game-sidebar">
        <h2 className="text-xl font-bold mb-4">Game Modes</h2>

        <div className="space-y-2">
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            Play vs Friend
          </button>

          <button className="btn-secondary w-full flex items-center justify-center gap-2">
            <Bot className="w-4 h-4" />
            Play vs AI
          </button>
        </div>
      </div>

      <div className="game-sidebar">
        <h2 className="text-xl font-bold mb-4">Move History</h2>

        <div className="max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No moves yet</p>
          ) : (
            <div className="space-y-1">
              {history.map((move, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm p-2 rounded hover:bg-gray-50"
                >
                  <span className="text-gray-600">{Math.floor(index / 2) + 1}.</span>
                  <span className="font-mono">{move.san}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="game-sidebar">
        <h2 className="text-xl font-bold mb-4">Game Info</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Moves:</span>
            <span>{history.length}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Captures:</span>
            <span>{history.filter(move => move.captured).length}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Checks:</span>
            <span>{history.filter(move => move.san.includes('+')).length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}