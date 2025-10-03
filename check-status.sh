#!/bin/bash

echo "🎯 BrillenzChess Status Check"
echo "=============================="

# Check if frontend is running
echo -n "Frontend (http://localhost:3000): "
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check if backend is running
echo -n "Backend API (http://localhost:3001): "
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check database health
echo -n "Database: "
cd server 2>/dev/null
if npm run db:health 2>/dev/null | grep -q "healthy"; then
    echo "✅ Healthy"
else
    echo "❌ Not healthy"
fi
cd ..

# Check PostgreSQL service
echo -n "PostgreSQL Service: "
if brew services list | grep postgresql@14 | grep -q started; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Stockfish installation
echo -n "Stockfish Engine: "
if command -v stockfish > /dev/null; then
    echo "✅ Installed"
else
    echo "❌ Not installed"
fi

echo ""
echo "📍 Quick Links:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/api/health"
echo ""
echo "🚀 Ready to play chess!"