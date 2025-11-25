# Quick Deploy Guide - Get Live Today! 🚀

## Fastest Path: Railway (5-10 minutes)

### Step 1: Prepare Your Repo
```bash
# Make sure everything is committed
git add .
git commit -m "Prepare for deployment"
git push
```

### Step 2: Deploy to Railway

1. **Sign up/Login**: Go to [railway.app](https://railway.app) and sign in with GitHub

2. **Create New Project**: 
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Ducks repository

3. **Railway Auto-Detection**:
   - Railway will detect `docker-compose.yaml`
   - It will create two services automatically (client and server)

4. **Configure Environment Variables**:
   
   For the **client** service, add:
   ```
   PORT=3000
   GAME_SERVER_URL=https://your-server-service.railway.app
   SECRET_KEY=<generate-a-random-string>
   JWT_SECRET=<same-as-secret-key>
   ```
   
   For the **server** service, add:
   ```
   PORT=3030
   PROFILE_SERVER_URL=https://your-client-service.railway.app
   SECRET_KEY=<same-as-client>
   JWT_SECRET=<same-as-client>
   ```

5. **Get Your URLs**:
   - After deployment, Railway will give you URLs for both services
   - Update the environment variables with the actual URLs
   - Redeploy if needed

6. **Generate Secrets**:
   ```bash
   # Use this command to generate a secure secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Step 3: Test Your Deployment

1. Visit your client URL (e.g., `https://ducks-client.railway.app`)
2. Create an account
3. Log in
4. Join the game
5. Test multiplayer features

## Alternative: Render (10-15 minutes)

### Create Two Services

1. **Client Service**:
   - New → Web Service
   - Connect GitHub repo
   - Root Directory: `client`
   - Build Command: (leave empty)
   - Start Command: `node profileServer.js`
   - Environment:
     - `PORT=3000`
     - `GAME_SERVER_URL` (set after server deploys)
     - `SECRET_KEY` (generate random string)
     - `JWT_SECRET` (same as SECRET_KEY)

2. **Server Service**:
   - New → Web Service  
   - Connect GitHub repo
   - Root Directory: `server`
   - Build Command: (leave empty)
   - Start Command: `node gameServer.js`
   - Environment:
     - `PORT=3030`
     - `PROFILE_SERVER_URL` (your client URL)
     - `SECRET_KEY` (same as client)
     - `JWT_SECRET` (same as client)

3. **Update URLs** after both deploy

## Troubleshooting

### "Cannot connect to game server"
- Check that `GAME_SERVER_URL` in client matches your server URL
- Verify server is running and accessible
- Check CORS settings

### "Database error"
- Database initializes automatically on first run
- If issues persist, check file permissions

### "CORS error"
- Make sure `PROFILE_SERVER_URL` in server matches your client URL exactly
- No trailing slashes
- Use HTTPS URLs in production

## Post-Deploy Checklist

- [ ] Both services running
- [ ] Can access login page
- [ ] Can create account
- [ ] Can log in
- [ ] Can join game
- [ ] Multiplayer works
- [ ] Minigames work

## Portfolio Tips

1. **Add to README**: Include a "Live Demo" section with your deployed URL
2. **Screenshots**: Update with production screenshots
3. **Documentation**: Link to your deployed version in portfolio
4. **Monitor**: Set up basic monitoring (Railway has built-in logs)

## Need Help?

- Check service logs in your platform's dashboard
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
- Check browser console for client-side errors

---

**You're ready to deploy!** 🎉

