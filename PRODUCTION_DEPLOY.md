# 🚀 Production Deployment Guide

## Environment Variables Setup

### Frontend (Vercel/Netlify)

Add these environment variables to your Vercel/Netlify dashboard:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Backend Server (Render URL)
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

**How to Add in Vercel:**
1. Go to your project dashboard
2. Settings → Environment Variables
3. Add each variable
4. Redeploy

**How to Add in Netlify:**
1. Site settings → Build & deploy → Environment
2. Add each variable
3. Trigger new deploy

---

### Backend (Render)

Add these environment variables to your Render web service:

```bash
# Supabase (must match frontend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Config
PORT=3001
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

**How to Add in Render:**
1. Go to your web service dashboard
2. Environment tab
3. Add each environment variable
4. Save changes
5. Render will auto-redeploy

---

## Deployment Steps

### 1. Deploy Backend to Render

```bash
# From server directory
cd server
git init
git add .
git commit -m "Initial backend commit"
git push
```

On Render:
1. New → Web Service
2. Connect GitHub repository
3. Name: `chase-game-server`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add environment variables (see above)
7. Create Web Service
8. **Copy the Render URL** (e.g., https://chase-game-server.onrender.com)

### 2. Deploy Frontend to Vercel

```bash
# From project root
vercel
```

Or via Vercel Dashboard:
1. New Project
2. Import from GitHub
3. Framework Preset: Next.js
4. Add environment variables (see above)
   - **Important**: Use the Render URL you copied for `NEXT_PUBLIC_SOCKET_URL`
5. Deploy

### 3. Verify Deployment

**Backend Health Check:**
```bash
curl https://your-backend.onrender.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Frontend:**
- Visit your Vercel URL
- Connect wallet
- Select Multiplayer
- Try creating/joining a room

---

## Production Checklist

### Supabase
- [ ] Production database created
- [ ] Schema SQL executed
- [ ] RLS policies enabled
- [ ] API keys copied to env vars
- [ ] Tested database connection

### Backend (Render)
- [ ] Repository pushed to GitHub
- [ ] Web Service created
- [ ] Build/Start commands configured
- [ ] All environment variables added
- [ ] Health endpoint working
- [ ] Socket.io connections working

### Frontend (Vercel/Netlify)
- [ ] Repository connected
- [ ] All environment variables added
- [ ] `NEXT_PUBLIC_SOCKET_URL` points to Render
- [ ] Build successful
- [ ] App accessible
- [ ] Wallet connection working
- [ ] Multiplayer lobby working

### Testing
- [ ] Create room in production
- [ ] Join room from different device
- [ ] Both players ready up
- [ ] Game starts successfully
- [ ] Gameplay works smoothly
- [ ] Stats saved to database

---

## Environment Variable Reference

### Required for Frontend
| Variable | Example | Where to Get |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xyz.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `a1b2c3...` | WalletConnect Cloud |
| `NEXT_PUBLIC_SOCKET_URL` | `https://app.onrender.com` | Render Dashboard (after deploy) |

### Required for Backend
| Variable | Example | Where to Get |
|----------|---------|--------------|
| `SUPABASE_URL` | `https://xyz.supabase.co` | Same as frontend |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Same as frontend |
| `PORT` | `3001` | Use 3001 (Render sets automatically) |
| `CLIENT_URL` | `https://app.vercel.app` | Vercel/Netlify URL |
| `NODE_ENV` | `production` | Set to `production` |

---

## Security Notes

### DO NOT:
- ❌ Commit `.env.production` or `server/.env.production` to Git
- ❌ Share API keys publicly
- ❌ Use development keys in production
- ❌ Disable RLS policies in Supabase

### DO:
- ✅ Use environment variables in hosting dashboard
- ✅ Rotate keys if exposed
- ✅ Enable HTTPS only
- ✅ Monitor usage quotas
- ✅ Set up error tracking (Sentry)

---

## Troubleshooting Production

### "Socket not connected"
- Check `NEXT_PUBLIC_SOCKET_URL` matches Render URL exactly
- Verify Render service is running (not sleeping)
- Check CORS settings in `server/index.ts`

### "Room not found"
- Verify Supabase credentials are correct
- Check database tables exist
- Test Supabase connection from backend

### Backend keeps sleeping (Free tier Render)
- Free Render services sleep after 15 min inactivity
- Upgrade to Starter plan ($7/mo) for always-on
- Or use a cron job to ping every 10 minutes

### High latency
- Choose Render/Vercel regions close to users
- Consider upgrading Supabase plan
- Add Redis caching (optional)

---

## Scaling Considerations

### Current Free Tier Limits
- **Supabase**: 500MB DB, 2GB bandwidth/month
- **Render**: 750 hours/month, sleeps after inactivity
- **Vercel**: 100GB bandwidth/month

### When to Upgrade
- **More than 100 concurrent players**: Upgrade Render to Starter
- **Large database**: Upgrade Supabase to Pro ($25/mo)
- **High traffic**: Add Redis, CDN

### Optimization Tips
1. Enable gzip compression
2. Use WebSocket compression
3. Implement connection pooling
4. Cache room states in Redis
5. Rate limit socket events

---

## Monitoring

### Recommended Tools
- **Sentry**: Error tracking
- **Vercel Analytics**: Frontend performance
- **Render Metrics**: Backend CPU/Memory
- **Supabase Dashboard**: Database queries

### Key Metrics to Watch
- Active rooms count
- Players online
- Database connections
- Socket.io connections
- API response times
- Error rates

---

## Quick Commands

```bash
# Check backend health
curl https://your-backend.onrender.com/health

# View Render logs
# Go to: Render Dashboard → Logs

# Redeploy frontend
vercel --prod

# View production errors
# Vercel Dashboard → Deployments → Runtime Logs
```

---

**Production deployment ready! 🚀**

Follow this guide step-by-step and you'll have a fully deployed multiplayer game.
