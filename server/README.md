# Chase Game Backend

WebSocket server for real-time multiplayer gameplay.

## Quick Start

### Development
```bash
npm install
npm run dev
```

Server runs on http://localhost:3001

### Production
```bash
npm install
npm run build
npm start
```

## Environment Variables
Create `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

## Deploy to Render
1. Push to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Set environment variables
5. Deploy!

See `/BACKEND_SETUP.md` for detailed instructions.
