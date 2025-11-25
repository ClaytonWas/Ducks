# 🦆 Ducks - Multiplayer 3D Social Game

> An open-world multiplayer game where players can chat, explore, and play minigames together in a vibrant 3D environment.

![Multiplayer Screenshot](./readmeImages/MultiplayerScreenshot.png)

## ✨ Features

- **Real-time Multiplayer**: Connect with other players in a shared 3D world
- **Interactive 3D Environment**: Built with Three.js for immersive gameplay
- **Customizable Avatars**: Choose your shape and color to express yourself
- **Smooth Movement System**: A* pathfinding algorithm for intelligent navigation
- **Advanced Camera Controls**: Orbit controls with follow mode and free camera movement
- **In-Game Chat**: Real-time messaging with DOM-based chat bubbles
- **Minigames**: 
  - Tic-Tac-Toe
  - Speed Typing Challenge
- **Multiple Scenes**: Explore different rooms and environments
- **3D Model Support**: Load and display .obj models
- **Club Penguin-Inspired UI**: Nostalgic, colorful design

## 🛠️ Tech Stack

### Frontend
- **Three.js** - 3D graphics and rendering
- **Socket.IO Client** - Real-time communication
- **EJS** - Server-side templating
- **Express.js** - Web server
- **CSS3** - Styling with Club Penguin aesthetic

### Backend
- **Node.js** - Runtime environment
- **Express.js** - REST API server
- **Socket.IO** - WebSocket server for real-time game state
- **SQLite3** - User database
- **bcrypt** - Password hashing
- **JWT** - Authentication tokens

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Railway/Render** - Deployment platforms

## 📐 Architecture

![Architecture Diagram](./readmeImages/DucksDiagram.png)

The application uses a **client-server architecture** with two main services:

1. **Profile Server** (Port 3000)
   - Handles user authentication and registration
   - Manages user profiles and settings
   - Serves the web interface

2. **Game Server** (Port 3030)
   - Manages game state and player positions
   - Handles real-time multiplayer synchronization
   - Serves 3D models and textures

Communication between services uses HTTP for API calls and WebSockets (Socket.IO) for real-time game updates.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ClaytonWas/Ducks.git
   cd Ducks
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```

3. **Initialize the database**
   ```bash
   node ./client/db/dbs.js
   ```
   This creates a SQLite database with template users:
   - Username: `clay` | Password: `foobar`
   - Username: `parsa` | Password: `foobar`

4. **Start the servers**
   
   Terminal 1 (Profile Server):
   ```bash
   node ./client/profileServer.js
   ```
   
   Terminal 2 (Game Server):
   ```bash
   node ./server/gameServer.js
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Docker Setup

1. **Build and start containers**
   ```bash
   docker-compose build
   docker-compose up
   ```

2. **Access the application**
   Navigate to `http://localhost:3000`

   The database initializes automatically on first run.

3. **Stop services**
   ```bash
   docker-compose down
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- API endpoints
- Game server functionality
- Authentication flows

## 📊 Performance

Performance metrics for 4 concurrent players (measured with Google Lighthouse):

![Performance Metrics](./readmeImages/lighthouse_performance.png)

## 🎮 Gameplay

### Controls

- **Left Click + Drag**: Move your character
- **Right Click + Drag**: Rotate camera (OrbitControls)
- **Scroll Wheel**: Zoom in/out
- **Shift + Right Click**: Pan camera
- **Enter**: Send chat message
- **Camera Toggle Button**: Switch between follow and overview modes

### Features

- **Smooth Movement**: Click anywhere on the ground to move. The character uses A* pathfinding to navigate around obstacles.
- **Camera Modes**: 
  - **Follow Mode**: Camera orbits around your player
  - **Overview Mode**: Free camera movement for scene exploration
- **Chat System**: Type messages that appear above your character in chat bubbles
- **Minigames**: Interact with objects in the world to play Tic-Tac-Toe or typing challenges

## 📸 Screenshots

### Spawn Room
![Spawnroom Scene](./readmeImages/SpawnroomScreenshot.png)

### Game Room
![Gameroom Scene](./readmeImages/GameroomScreenshot.png)

### Tic-Tac-Toe Minigame
![TicTacToe Scene](./readmeImages/TicTacToeScreenshot.png)

## 🚢 Deployment

Ducks is production-ready and can be deployed to various platforms.

### Quick Deploy (Railway - Recommended)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Connect your GitHub repository
4. Railway will auto-detect `docker-compose.yaml` and create two services
5. Set environment variables (see below)
6. Deploy!

For detailed instructions, see:
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - Fast deployment guide (5-10 minutes)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Comprehensive deployment options

### Environment Variables

**Client Service:**
```
PORT=3000
GAME_SERVER_URL=https://your-server-service.railway.app
SECRET_KEY=<generate-random-string>
JWT_SECRET=<same-as-secret-key>
```

**Server Service:**
```
PORT=3030
PROFILE_SERVER_URL=https://your-client-service.railway.app
SECRET_KEY=<same-as-client>
JWT_SECRET=<same-as-client>
```

**⚠️ Security Note**: Always generate a strong random string for `SECRET_KEY` in production. Never use the default value.

### Generate Secure Secret Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📁 Project Structure

```
Ducks/
├── client/                 # Profile server and frontend
│   ├── db/                # SQLite database
│   ├── public/            # Static assets
│   │   ├── scripts/       # Client-side JavaScript
│   │   └── styles/        # CSS files
│   └── views/             # EJS templates
├── server/                 # Game server
│   ├── scenes/            # 3D scene definitions (JSON)
│   └── textures/          # Texture assets
├── tests/                  # Test suite
├── docker-compose.yaml     # Docker orchestration
└── README.md              # This file
```

## 🎯 Key Algorithms & Implementations

- **A* Pathfinding**: Intelligent navigation around obstacles
- **Priority Queue**: Efficient pathfinding data structure
- **WebSocket Synchronization**: Real-time multiplayer state management
- **Camera Controls**: Smooth orbit controls with player following
- **3D Rendering**: Three.js scene management and object loading

## 🙏 Credits & Attributions

- **Priority Queue Implementation**: [GeeksforGeeks](https://www.geeksforgeeks.org/implementation-priority-queue-javascript/)
- **A* Algorithm Theory**: [Red Blob Games](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- **Tic-Tac-Toe Template**: [GeeksforGeeks](https://www.geeksforgeeks.org/simple-tic-tac-toe-game-using-javascript/)
- **Typing Game Template**: [WebDevSimplified - JS Speed Typing Game](https://github.com/WebDevSimplified/JS-Speed-Typing-Game)

## 📝 License

ISC License

## 👤 Authors

[@ClaytonWas](https://github.com/ClaytonWas)
[@parsa-zahraei](https://github.com/parsa-zahraei)

---

**Made with ❤️ for multiplayer fun!** 🦆
