# BrillenzChess

A modern, full-featured chess application built with Next.js, Node.js, and Stockfish. Play chess online with friends or challenge AI opponents with customizable difficulty levels.

## Features

- ✅ **Interactive Chess Board** - Custom-built chess UI with piece movement and validation
- ✅ **Real-time Multiplayer** - Play against other players with WebSocket support
- ✅ **AI Opponents** - Integrated Stockfish engine with multiple difficulty levels
- ✅ **User Authentication** - Secure registration and login system
- ✅ **Game Management** - Move history, game state persistence, and spectator mode
- ✅ **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Chess.js** - Chess game logic and validation
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.io** - WebSocket support
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Stockfish** - Chess engine
- **JWT** - Authentication

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stockfish chess engine (install via package manager)

```bash
# Install Stockfish
# On macOS:
brew install stockfish

# On Ubuntu/Debian:
sudo apt-get install stockfish

# On Windows:
# Download from https://stockfishchess.org/download/
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/restlesspilot/brillenzChess.git
cd brillenzChess
```

2. **Install dependencies**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. **Install prerequisites**
```bash
# macOS
brew install postgresql stockfish
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql stockfish

# Windows
# Download PostgreSQL from https://postgresql.org
# Download Stockfish from https://stockfishchess.org
```

4. **Set up environment and database**
```bash
cd server

# Copy environment file
cp .env.local .env

# Create database
createdb brillenz_chess

# Run database setup
npm run db:setup
```

5. **Start the development servers**
```bash
# Terminal 1 (Frontend)
npm run dev

# Terminal 2 (Backend)
cd server && npm run dev
```

6. **Access the application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Database Studio**: `cd server && npm run db:studio`

## Usage

### Local Play
- Click "Reset Game" to start a new local game
- Click on pieces to select and move them
- The sidebar shows game status, move history, and statistics

### Multiplayer
1. Register an account or sign in
2. Click "Play vs Friend" to find a match
3. Wait for another player to join
4. Play in real-time with move synchronization

### AI Opponents
1. Click "Play vs AI"
2. Choose difficulty level (Easy, Medium, Hard, Expert)
3. Play against the Stockfish engine

## Project Structure

```
BrillenzChess/
├── app/                    # Next.js app directory
│   ├── components/         # React components
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript types
├── server/                # Backend server
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── types/         # TypeScript types
│   └── prisma/            # Database schema
├── public/                # Static assets
└── package.json           # Frontend dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/game/history` - Get user's game history
- `GET /api/game/active` - Get active games
- `GET /api/game/:gameId` - Get specific game
- `GET /api/game/stats/:userId` - Get user statistics

## WebSocket Events

### Client to Server
- `join-room` - Join a game room
- `make-move` - Make a chess move
- `offer-draw` - Offer a draw
- `resign` - Resign the game
- `find-match` - Find multiplayer match

### Server to Client
- `game-updated` - Game state changed
- `move-made` - Move was made
- `match-found` - Multiplayer match found
- `game-ended` - Game finished

## Development

### Adding New Features

1. **Frontend Components**: Add to `app/components/`
2. **Backend Routes**: Add to `server/src/routes/`
3. **Database Changes**: Update `server/prisma/schema.prisma`
4. **WebSocket Events**: Extend `server/src/services/socket-service.ts`

### Database Migrations

```bash
cd server

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset
```

### Build for Production

```bash
# Build frontend
npm run build

# Build backend
cd server
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Chess.js](https://github.com/jhlywa/chess.js) for chess game logic
- [Stockfish](https://stockfishchess.org/) for the chess engine
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Socket.io](https://socket.io/) for real-time communication