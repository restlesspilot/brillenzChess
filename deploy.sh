#!/bin/bash

echo "🚀 BrillenzChess Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Vercel Login & Deploy Frontend${NC}"
echo "Please make sure you're logged in to Vercel first:"
echo "Run: vercel login"
echo ""

echo -e "${BLUE}Step 2: Deploy to Vercel${NC}"
echo "Deploying frontend to Vercel..."

# Deploy to Vercel with production flag
vercel --prod --yes

echo ""
echo -e "${GREEN}✅ Frontend deployed to Vercel!${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Visit your Vercel dashboard to get the live URL"
echo "2. Set up backend deployment (Railway/Heroku/Docker)"
echo "3. Update environment variables with live backend URL"
echo ""

echo -e "${BLUE}For Backend Deployment Options:${NC}"
echo ""
echo -e "${YELLOW}Option 1: Railway (Recommended)${NC}"
echo "1. Visit https://railway.app and sign up"
echo "2. Connect your GitHub repository"
echo "3. Deploy the backend from the server/ directory"
echo "4. Add PostgreSQL database service"
echo "5. Set environment variables"
echo ""

echo -e "${YELLOW}Option 2: Heroku${NC}"
echo "1. Install Heroku CLI"
echo "2. heroku create brillenz-chess-backend"
echo "3. heroku addons:create heroku-postgresql:hobby-dev"
echo "4. git subtree push --prefix=server heroku main"
echo ""

echo -e "${YELLOW}Option 3: Docker on any cloud provider${NC}"
echo "Use the included Dockerfile to deploy to:"
echo "- Google Cloud Run"
echo "- AWS ECS"
echo "- Azure Container Instances"
echo "- DigitalOcean App Platform"
echo ""

echo -e "${GREEN}🎉 Deployment process initiated!${NC}"