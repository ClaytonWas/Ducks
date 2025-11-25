# Deployment Guide

This guide will help you deploy Ducks to various platforms.

## Quick Deploy Options

### Option 1: Railway (Recommended for Quick Deploy)

1. **Install Railway CLI** (optional but recommended):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy from GitHub**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the docker-compose.yaml

3. **Set Environment Variables**:
   In Railway dashboard, add these environment variables:
   - `SECRET_KEY` - Generate a strong random string
   - `JWT_SECRET` - Generate a strong random string (can be same as SECRET_KEY)
   - `PROFILE_SERVER_URL` - Your Railway client service URL (e.g., `https://your-app.railway.app`)
   - `GAME_SERVER_URL` - Your Railway server service URL (e.g., `https://your-game-server.railway.app`)

4. **Deploy Both Services**:
   - Railway will detect both services from docker-compose.yaml
   - Make sure both services are deployed
   - Update the URLs in environment variables after deployment

### Option 2: Render

1. **Create Two Web Services**:
   - Go to [render.com](https://render.com)
   - Create a new "Web Service" for the client
   - Create another "Web Service" for the server

2. **Client Service Configuration**:
   - **Build Command**: (leave empty, uses Dockerfile)
   - **Start Command**: `node profileServer.js`
   - **Dockerfile Path**: `client/Dockerfile`
   - **Docker Context**: `client/`
   - **Environment Variables**:
     - `PORT=3000`
     - `GAME_SERVER_URL` - Set after server is deployed
     - `SECRET_KEY` - Generate a random string
     - `JWT_SECRET` - Generate a random string

3. **Server Service Configuration**:
   - **Build Command**: (leave empty, uses Dockerfile)
   - **Start Command**: `node gameServer.js`
   - **Dockerfile Path**: `server/Dockerfile`
   - **Docker Context**: `server/`
   - **Environment Variables**:
     - `PORT=3030`
     - `PROFILE_SERVER_URL` - Your client service URL
     - `SECRET_KEY` - Same as client
     - `JWT_SECRET` - Same as client

4. **Update URLs**:
   - After both services are deployed, update `GAME_SERVER_URL` in client and `PROFILE_SERVER_URL` in server

### Option 3: Fly.io

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Initialize Fly App**:
   ```bash
   fly launch
   ```

3. **Create Two Apps**:
   ```bash
   # For client
   fly apps create ducks-client
   fly apps create ducks-server
   ```

4. **Deploy Client**:
   ```bash
   cd client
   fly deploy --app ducks-client
   ```

5. **Deploy Server**:
   ```bash
   cd server
   fly deploy --app ducks-server
   ```

6. **Set Secrets**:
   ```bash
   fly secrets set SECRET_KEY=your-secret --app ducks-client
   fly secrets set SECRET_KEY=your-secret --app ducks-server
   fly secrets set GAME_SERVER_URL=https://ducks-server.fly.dev --app ducks-client
   fly secrets set PROFILE_SERVER_URL=https://ducks-client.fly.dev --app ducks-server
   ```

### Option 4: Docker Compose on VPS

1. **Clone Repository**:
   ```bash
   git clone https://github.com/ClaytonWas/Ducks.git
   cd Ducks
   ```

2. **Create .env file**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Build and Run**:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Set up Reverse Proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Port for client server | No | 3000 |
| `CLIENT_PORT` | Alternative port for client | No | 3000 |
| `GAME_SERVER_PORT` | Port for game server | No | 3030 |
| `SECRET_KEY` | Secret for session/JWT signing | **Yes** (production) | runescapefan |
| `JWT_SECRET` | JWT signing secret | No | Uses SECRET_KEY |
| `PROFILE_SERVER_URL` | Client server URL | **Yes** (production) | http://localhost:3000 |
| `GAME_SERVER_URL` | Game server URL | **Yes** (production) | http://localhost:3030 |

## Important Security Notes

1. **Change Default Secrets**: Never use the default `runescapefan` secret in production
2. **Use HTTPS**: Always use HTTPS in production (most platforms provide this automatically)
3. **CORS Configuration**: The game server CORS is configured to allow the profile server URL
4. **Database**: The SQLite database is initialized automatically on first run

## Troubleshooting

### Connection Issues
- Make sure both services are running
- Verify environment variables are set correctly
- Check that URLs don't have trailing slashes
- Ensure CORS settings match your deployment URLs

### Database Issues
- The database initializes automatically on first client container start
- If issues occur, the database will be recreated on next startup
- For persistent storage, mount the `./client/db` directory as a volume

### Port Issues
- Most platforms assign ports automatically via `PORT` environment variable
- Make sure your platform exposes the correct ports (3000 for client, 3030 for server)

## Post-Deployment Checklist

- [ ] Both services are running
- [ ] Environment variables are set correctly
- [ ] URLs are updated and accessible
- [ ] Database is initialized
- [ ] Can access login page
- [ ] Can create account
- [ ] Can log in and join game
- [ ] Game server connection works
- [ ] Multiplayer features work

## Support

For issues, check:
1. Service logs in your deployment platform
2. Browser console for client-side errors
3. Network tab for connection issues
4. Environment variable configuration

