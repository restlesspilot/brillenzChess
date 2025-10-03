import { spawn, ChildProcess } from 'child_process'
import { Chess } from 'chess.js'

interface EngineSettings {
  depth: number
  time: number // milliseconds
  skill: number // 0-20, 20 being strongest
}

interface EngineAnalysis {
  bestMove: string
  evaluation: number
  depth: number
  pv: string[] // principal variation
  nodes: number
  time: number
}

export class StockfishEngine {
  private process: ChildProcess | null = null
  private isReady = false
  private pendingCommands: string[] = []
  private analysisCallbacks = new Map<string, (analysis: EngineAnalysis) => void>()

  constructor() {
    this.initializeEngine()
  }

  private initializeEngine(): void {
    try {
      // Try different possible Stockfish commands
      const stockfishCommands = ['stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish']
      let engineStarted = false

      for (const command of stockfishCommands) {
        try {
          this.process = spawn(command)
          engineStarted = true
          console.log(`✅ Stockfish started with command: ${command}`)
          break
        } catch (error) {
          console.log(`❌ Failed to start Stockfish with command: ${command}`)
          continue
        }
      }

      if (!engineStarted || !this.process) {
        console.warn('⚠️ Stockfish engine not available - AI features will be disabled')
        this.isReady = false
        return
      }

      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim()
        this.handleEngineOutput(output)
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('Stockfish error:', data.toString())
      })

      this.process.on('close', (code) => {
        console.log(`Stockfish process closed with code ${code}`)
        this.isReady = false
      })

      this.process.on('error', (error) => {
        console.error('Failed to start Stockfish:', error)
        this.isReady = false
        this.process = null
      })

      this.sendCommand('uci')
    } catch (error) {
      console.error('Error initializing Stockfish:', error)
      this.isReady = false
      this.process = null
    }
  }

  private handleEngineOutput(output: string): void {
    const lines = output.split('\n')

    for (const line of lines) {
      if (line === 'uciok') {
        this.isReady = true
        this.processPendingCommands()
      } else if (line.startsWith('bestmove')) {
        this.handleBestMove(line)
      } else if (line.startsWith('info')) {
        this.handleAnalysisInfo(line)
      }
    }
  }

  private handleBestMove(line: string): void {
    const parts = line.split(' ')
    const bestMove = parts[1]

    for (const [sessionId, callback] of this.analysisCallbacks) {
      callback({
        bestMove,
        evaluation: 0,
        depth: 0,
        pv: [bestMove],
        nodes: 0,
        time: 0
      })
    }

    this.analysisCallbacks.clear()
  }

  private handleAnalysisInfo(line: string): void {
    try {
      const parts = line.split(' ')
      let depth = 0
      let evaluation = 0
      let nodes = 0
      let time = 0
      let pv: string[] = []

      for (let i = 0; i < parts.length; i++) {
        switch (parts[i]) {
          case 'depth':
            depth = parseInt(parts[i + 1])
            break
          case 'cp':
            evaluation = parseInt(parts[i + 1]) / 100
            break
          case 'mate':
            const mateIn = parseInt(parts[i + 1])
            evaluation = mateIn > 0 ? 999 : -999
            break
          case 'nodes':
            nodes = parseInt(parts[i + 1])
            break
          case 'time':
            time = parseInt(parts[i + 1])
            break
          case 'pv':
            pv = parts.slice(i + 1)
            i = parts.length
            break
        }
      }

      const analysis: EngineAnalysis = {
        bestMove: pv[0] || '',
        evaluation,
        depth,
        pv,
        nodes,
        time
      }

      for (const callback of this.analysisCallbacks.values()) {
        callback(analysis)
      }
    } catch (error) {
      console.error('Error parsing analysis info:', error)
    }
  }

  private sendCommand(command: string): void {
    if (!this.isReady) {
      this.pendingCommands.push(command)
      return
    }

    if (this.process && this.process.stdin) {
      this.process.stdin.write(command + '\n')
    }
  }

  private processPendingCommands(): void {
    while (this.pendingCommands.length > 0) {
      const command = this.pendingCommands.shift()!
      this.sendCommand(command)
    }
  }

  async getBestMove(fen: string, settings: EngineSettings): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Engine not ready'))
        return
      }

      const sessionId = Date.now().toString()

      this.analysisCallbacks.set(sessionId, (analysis) => {
        this.analysisCallbacks.delete(sessionId)
        resolve(analysis.bestMove)
      })

      this.sendCommand(`setoption name Skill Level value ${settings.skill}`)
      this.sendCommand(`position fen ${fen}`)

      if (settings.time > 0) {
        this.sendCommand(`go movetime ${settings.time}`)
      } else {
        this.sendCommand(`go depth ${settings.depth}`)
      }

      setTimeout(() => {
        if (this.analysisCallbacks.has(sessionId)) {
          this.analysisCallbacks.delete(sessionId)
          reject(new Error('Analysis timeout'))
        }
      }, Math.max(settings.time + 1000, 10000))
    })
  }

  async analyzePosition(fen: string, settings: EngineSettings): Promise<EngineAnalysis> {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Engine not ready'))
        return
      }

      const sessionId = Date.now().toString()

      this.analysisCallbacks.set(sessionId, (analysis) => {
        this.analysisCallbacks.delete(sessionId)
        resolve(analysis)
      })

      this.sendCommand(`setoption name Skill Level value 20`)
      this.sendCommand(`position fen ${fen}`)
      this.sendCommand(`go depth ${settings.depth}`)

      setTimeout(() => {
        if (this.analysisCallbacks.has(sessionId)) {
          this.analysisCallbacks.delete(sessionId)
          reject(new Error('Analysis timeout'))
        }
      }, 10000)
    })
  }

  isEngineReady(): boolean {
    return this.isReady
  }

  quit(): void {
    if (this.process) {
      this.sendCommand('quit')
      this.process.kill()
      this.process = null
      this.isReady = false
    }
  }
}

export class AIPlayer {
  private engine: StockfishEngine
  private difficulty: 'easy' | 'medium' | 'hard' | 'expert'

  constructor(difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium') {
    this.engine = new StockfishEngine()
    this.difficulty = difficulty
  }

  async makeMove(chess: Chess): Promise<string | null> {
    if (!this.engine.isEngineReady()) {
      console.log('🎲 Stockfish not available, using random move')
      return this.getRandomMove(chess)
    }

    const settings = this.getDifficultySettings()

    try {
      const bestMove = await this.engine.getBestMove(chess.fen(), settings)

      const validMove = chess.move(bestMove)
      if (validMove) {
        chess.undo()
        return bestMove
      }

      return null
    } catch (error) {
      console.error('AI move error:', error)
      return this.getRandomMove(chess)
    }
  }

  async getHint(chess: Chess): Promise<{ move: string; evaluation: number } | null> {
    const settings = { depth: 15, time: 2000, skill: 20 }

    try {
      const analysis = await this.engine.analyzePosition(chess.fen(), settings)

      return {
        move: analysis.bestMove,
        evaluation: analysis.evaluation
      }
    } catch (error) {
      console.error('AI hint error:', error)
      return null
    }
  }

  private getDifficultySettings(): EngineSettings {
    switch (this.difficulty) {
      case 'easy':
        return { depth: 5, time: 1000, skill: 5 }
      case 'medium':
        return { depth: 10, time: 2000, skill: 10 }
      case 'hard':
        return { depth: 15, time: 3000, skill: 15 }
      case 'expert':
        return { depth: 20, time: 5000, skill: 20 }
      default:
        return { depth: 10, time: 2000, skill: 10 }
    }
  }

  private getRandomMove(chess: Chess): string | null {
    const moves = chess.moves({ verbose: true })
    if (moves.length === 0) return null

    const randomMove = moves[Math.floor(Math.random() * moves.length)]
    return `${randomMove.from}${randomMove.to}${randomMove.promotion || ''}`
  }

  setDifficulty(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): void {
    this.difficulty = difficulty
  }

  quit(): void {
    this.engine.quit()
  }
}

let globalEngine: StockfishEngine | null = null

export function setupStockfish(): void {
  if (!globalEngine) {
    globalEngine = new StockfishEngine()
    if (globalEngine.isEngineReady()) {
      console.log('🤖 Stockfish engine initialized and ready')
    } else {
      console.log('⚠️ Stockfish engine not available - continuing without AI features')
    }
  }
}

export function getStockfishEngine(): StockfishEngine | null {
  return globalEngine
}

export function createAIPlayer(difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium'): AIPlayer {
  return new AIPlayer(difficulty)
}