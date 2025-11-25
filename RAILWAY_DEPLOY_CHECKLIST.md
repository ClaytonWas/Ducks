# Railway Deployment Checklist ✅

## Pre-Deployment

- [x] Code committed and pushed to GitHub
- [x] .gitignore excludes node_modules and database files
- [x] Dockerfiles are production-ready
- [x] docker-compose.yaml configured
- [x] Environment variables documented

## Railway Setup Steps

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your Ducks repository

### 2. Railway Auto-Detection
- Railway will detect `docker-compose.yaml`
- It will create TWO services automatically:
  - `client` service (port 3000)
  - `server` service (port 3030)

### 3. Generate Secret Key
Run this command to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value - you'll use it for both services.

### 4. Configure Environment Variables

**For CLIENT Service:**
```
PORT=3000
CLIENT_PORT=3000
GAME_SERVER_URL=https://your-server-service.railway.app
SECRET_KEY=<your-generated-secret>
JWT_SECRET=<same-as-secret-key>
```

**For SERVER Service:**
```
PORT=3030
GAME_SERVER_PORT=3030
PROFILE_SERVER_URL=https://your-client-service.railway.app
SECRET_KEY=<same-as-client>
JWT_SECRET=<same-as-client>
```

### 5. Get Your URLs
1. After initial deployment, Railway will provide URLs for both services
2. They'll look like:
   - Client: `https://ducks-production-client.up.railway.app`
   - Server: `https://ducks-production-server.up.railway.app`

### 6. Update Environment Variables
1. Go to CLIENT service → Variables
2. Update `GAME_SERVER_URL` with your server URL
3. Go to SERVER service → Variables  
4. Update `PROFILE_SERVER_URL` with your client URL
5. Both services will automatically redeploy

### 7. Test Your Deployment
- [ ] Visit your client URL
- [ ] Can see login page
- [ ] Can create account
- [ ] Can log in
- [ ] Can join game
- [ ] Multiplayer works
- [ ] Camera controls work
- [ ] Chat works
- [ ] Minigames work

## Troubleshooting

### Services Won't Start
- Check Railway logs for build errors
- Verify all environment variables are set
- Make sure Dockerfiles are correct

### "Cannot connect to game server"
- Verify `GAME_SERVER_URL` in client matches server URL exactly
- No trailing slashes in URLs
- Check server logs for CORS errors

### Database Issues
- Database initializes automatically on first run
- If issues persist, check file permissions in logs

### CORS Errors
- Make sure `PROFILE_SERVER_URL` in server matches client URL exactly
- Use HTTPS URLs (Railway provides SSL automatically)

## Post-Deployment

- [ ] Add your deployed URL to README.md
- [ ] Test all features
- [ ] Monitor logs for any errors
- [ ] Share your live demo! 🎉

---

**You're ready to deploy!** 🚀

