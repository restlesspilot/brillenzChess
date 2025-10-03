# BrillenzChess Deployment Guide

This guide covers deploying BrillenzChess both locally and on remote servers.

## Local Development Setup ✅ COMPLETED

### Prerequisites
- ✅ Node.js 18+
- ✅ PostgreSQL 14+
- ✅ Stockfish chess engine

### Quick Start (Local)
```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Set up environment
cp server/.env.local server/.env

# 3. Start PostgreSQL service
brew services start postgresql@14

# 4. Set up database
cd server
npm run db:setup

# 5. Start both servers
# Terminal 1 (Frontend)
npm run dev

# Terminal 2 (Backend)
cd server && npm run dev
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database Studio: `npm run db:studio` (in server/)

## Remote Server Deployment

### Option 1: Traditional VPS/Server

#### Prerequisites
- Ubuntu 20.04+ / CentOS 7+ / similar
- Node.js 18+
- PostgreSQL 12+
- PM2 (process manager)
- Nginx (reverse proxy)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install Stockfish
sudo apt install stockfish
```

#### 2. Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE brillenz_chess;
CREATE USER chess_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE brillenz_chess TO chess_user;
\q
```

#### 3. Application Deployment
```bash
# Clone repository
git clone <your-repo-url> /var/www/brillenz-chess
cd /var/www/brillenz-chess

# Install dependencies
npm install
cd server && npm install && cd ..

# Set up environment
cd server
cp .env.production .env

# Edit environment variables
nano .env
# Update:
# DATABASE_URL="postgresql://chess_user:your_secure_password@localhost:5432/brillenz_chess"
# JWT_SECRET="your-super-secure-jwt-secret-here"
# FRONTEND_URL="https://your-domain.com"

# Run database migrations
npm run db:migrate:deploy

# Build application
cd ..
npm run build
cd server && npm run build
```

#### 4. PM2 Configuration
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'brillenz-chess-backend',
      script: './server/dist/index.js',
      cwd: '/var/www/brillenz-chess',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend.log'
    },
    {
      name: 'brillenz-chess-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/brillenz-chess',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend.log'
    }
  ]
}
EOF

# Create logs directory
mkdir -p logs

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Nginx Configuration
```bash
# Create Nginx config
sudo cat > /etc/nginx/sites-available/brillenz-chess << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/brillenz-chess /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL with Let's Encrypt (Optional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Docker Deployment

#### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: brillenz_chess
      POSTGRES_USER: chess_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://chess_user:your_secure_password@postgres:5432/brillenz_chess
      JWT_SECRET: your-super-secure-jwt-secret-here
      NODE_ENV: production
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### Backend Dockerfile
```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Stockfish
RUN apk add --no-cache stockfish

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Option 3: Cloud Platform Deployment

#### Vercel (Frontend Only)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend.herokuapp.com
```

#### Heroku (Backend)
```bash
# Install Heroku CLI
# Create Heroku app
heroku create brillenz-chess-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your-super-secure-jwt-secret-here
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app

# Deploy
git subtree push --prefix=server heroku main

# Run migrations
heroku run npm run db:migrate:deploy
```

#### Railway (Full Stack)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Environment Variables Reference

### Local Development (.env.local)
```bash
DATABASE_URL="postgresql://georgemartell@localhost:5432/brillenz_chess"
JWT_SECRET="super-secret-jwt-key-for-brillenz-chess-app-development"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

### Production (.env.production)
```bash
DATABASE_URL="postgresql://username:password@host:5432/brillenz_chess"
JWT_SECRET="your-super-secure-jwt-secret-here"
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://your-domain.com"
```

## Database Management Commands

```bash
# Health check
npm run db:health

# Setup database (first time)
npm run db:setup

# Reset database (development only)
npm run db:reset

# Run migrations
npm run db:migrate:deploy

# Generate Prisma client
npm run db:generate

# Open database studio
npm run db:studio
```

## Monitoring and Maintenance

### PM2 Management
```bash
# View running processes
pm2 list

# View logs
pm2 logs brillenz-chess-backend
pm2 logs brillenz-chess-frontend

# Restart services
pm2 restart brillenz-chess-backend
pm2 restart brillenz-chess-frontend

# Stop services
pm2 stop all

# Monitor resources
pm2 monit
```

### Database Backups
```bash
# Backup database
pg_dump -h localhost -U chess_user brillenz_chess > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -h localhost -U chess_user brillenz_chess < backup_file.sql
```

### Log Management
```bash
# Rotate logs
sudo logrotate /etc/logrotate.d/brillenz-chess

# View system logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql

   # Check database exists
   psql -h localhost -U chess_user -l

   # Test connection
   npm run db:health
   ```

2. **Stockfish Not Found**
   ```bash
   # Install Stockfish
   sudo apt install stockfish  # Ubuntu
   brew install stockfish       # macOS
   ```

3. **Port Already in Use**
   ```bash
   # Find process using port
   sudo lsof -i :3001

   # Kill process
   sudo kill -9 <PID>
   ```

4. **Prisma Client Issues**
   ```bash
   # Regenerate client
   npx prisma generate

   # Reset and migrate
   npm run db:reset
   ```

## Security Checklist

- [ ] Change default JWT secret
- [ ] Use strong database passwords
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Environment variable protection
- [ ] Rate limiting implementation
- [ ] Input validation
- [ ] CORS configuration

## Performance Optimization

- [ ] Enable Redis for sessions
- [ ] Configure database connection pooling
- [ ] Implement CDN for static assets
- [ ] Enable Gzip compression
- [ ] Database indexing optimization
- [ ] Implement caching strategies
- [ ] Monitor resource usage
- [ ] Load balancing for high traffic