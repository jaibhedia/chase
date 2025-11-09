#!/bin/bash

echo "🎮 Chase Game - Backend Setup Script"
echo "===================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the chase project root directory"
    exit 1
fi

echo "📦 Step 1: Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed"
echo ""

echo "📦 Step 2: Installing backend dependencies..."
cd server
npm install
cd ..
echo "✅ Backend dependencies installed"
echo ""

echo "📝 Step 3: Setting up environment files..."

# Frontend .env.local
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
EOF
    echo "✅ Created .env.local - Please update with your Supabase credentials"
else
    echo "⚠️  .env.local already exists - skipping"
fi

# Backend .env
if [ ! -f "server/.env" ]; then
    echo "Creating server/.env..."
    cat > server/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=3001
CLIENT_URL=http://localhost:3000

# Environment
NODE_ENV=development
EOF
    echo "✅ Created server/.env - Please update with your Supabase credentials"
else
    echo "⚠️  server/.env already exists - skipping"
fi

echo ""
echo "============================================"
echo "🎉 Setup Complete!"
echo "============================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up Supabase (see BACKEND_SETUP.md):"
echo "   - Create project at https://supabase.com"
echo "   - Run the SQL schema from /supabase/schema.sql"
echo "   - Get your Project URL and anon key"
echo ""
echo "2. Update environment variables:"
echo "   - Edit .env.local (frontend)"
echo "   - Edit server/.env (backend)"
echo ""
echo "3. Start the servers:"
echo "   Terminal 1: npm run dev          (frontend)"
echo "   Terminal 2: cd server && npm run dev  (backend)"
echo ""
echo "4. Test multiplayer:"
echo "   - Open http://localhost:3000 in 2 browser windows"
echo "   - Both windows: Connect wallet → Multiplayer"
echo "   - Window 1: Create room"
echo "   - Window 2: Join with room code"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - BACKEND_SETUP.md (full setup guide)"
echo "   - server/README.md (backend quickstart)"
echo ""
