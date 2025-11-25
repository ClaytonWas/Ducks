const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jsonWebToken = require('jsonwebtoken')
const path = require('path')
const fs = require('fs')

// Config
const SHIP = {
    PORT: process.env.PORT || process.env.GAME_SERVER_PORT || 3030,
    SECRET_KEY: process.env.SECRET_KEY || process.env.JWT_SECRET || 'runescapefan',
    PROFILE_SERVER: process.env.PROFILE_SERVER_URL || 'http://localhost:3000',
    TIME_API: 'http://worldtimeapi.org/api/timezone/America/Toronto',
    QUOTE_API: 'https://api.quotable.io/random'
}

// Globals
const gameRoomScene = require('./scenes/gameRoomScene.json')
const testScene1 = require('./scenes/testScene1.json')
const testScene2 = require('./scenes/testScene2.json')
const testScene3 = require('./scenes/testScene3.json')

const playersInServer = new Map()

// Scene Map globals
const scenesMap = new Map()
const sceneTransCords = new Map()
const playerToScene = new Map()

// Tic Tac Toe Game globals
const boardStatuses = new Map()
const boards = new Map()
const playerToBoard = new Map()

// Default Time
let worldDateTime = new Date(1999, 1, 1, 9, 10, 0, 0)

// Server
const app = express()
const server = http.createServer(app)

// CORS configuration - allow profile server and custom domains
const normalizeUrl = (url) => {
    if (!url) return null
    return url.replace(/\/$/, '') // Remove trailing slash
}

// Build allowed origins list
const allowedOrigins = []

// Add PROFILE_SERVER_URL (your custom domain or Railway URL)
if (SHIP.PROFILE_SERVER) {
    const normalized = normalizeUrl(SHIP.PROFILE_SERVER)
    if (normalized) {
        allowedOrigins.push(normalized)
    }
}

// Add additional allowed origins from environment variable (comma-separated)
// Example: ALLOWED_ORIGINS=https://aduckgame.com,https://www.aduckgame.com
if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(origin => {
        const normalized = normalizeUrl(origin.trim())
        if (normalized && !allowedOrigins.includes(normalized)) {
            allowedOrigins.push(normalized)
        }
    })
}

// Add localhost for development
allowedOrigins.push('http://localhost:3000')
allowedOrigins.push('http://127.0.0.1:3000')

console.log('Allowed CORS origins:', allowedOrigins)

// CORS check function
const checkOrigin = (origin) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return true
    
    const normalized = normalizeUrl(origin)
    return allowedOrigins.includes(normalized) || allowedOrigins.includes(origin)
}

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (checkOrigin(origin)) {
                callback(null, true)
            } else {
                console.warn(`CORS blocked: ${origin}`)
                callback(new Error('Not allowed by CORS'))
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
})

// Middleware for CORS
app.use(cors({
    origin: (origin, callback) => {
        if (checkOrigin(origin)) {
            callback(null, true)
        } else {
            console.warn(`CORS blocked: ${origin}`)
            callback(new Error('Not allowed by CORS'))
        }
    },
    methods: ["GET", "POST"],
    credentials: true
}))


app.use(express.static(path.join(__dirname)))

// Loading textures to port 3030
app.get('/textures', (req, res) => {
    const texturesPath = path.join(__dirname, './textures')

    fs.readdir(texturesPath, (error, files) => {
        if (error) {
            console.error('Error reading textures directory:', error)
            return res.status(500).json({ error: 'Unable to load textures.' })
        }

        const textures = files.filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))
        res.json(textures)
    })
})

// Also handle trailing slash for consistency
app.get('/textures/', (req, res) => {
    const texturesPath = path.join(__dirname, './textures')

    fs.readdir(texturesPath, (error, files) => {
        if (error) {
            console.error('Error reading textures directory:', error)
            return res.status(500).json({ error: 'Unable to load textures.' })
        }

        const textures = files.filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))
        res.json(textures)
    })
})

// Authenticating Users
io.use((socket, next) => {
    let token = socket.handshake.auth.token

    if (!token) {
        return next(new Error('Authentication Required'))
    }

    jsonWebToken.verify(token, SHIP.SECRET_KEY, (error, userData) => {
        if (error) {
            return next(new Error('Invalid Token'))
        }
        if(!userData || !userData.id || !userData.username) {
            return next(new Error('Invalid User'))
        }

        socket.user = userData
        next()
    })
})

const serverScenes = {

    // Initialize scene maps
    initSceneMaps: () => {
        scenesMap.set('gameRoomScene', [])
        scenesMap.set('testScene1', [])
        scenesMap.set('testScene2', [])
        scenesMap.set('testScene3', [])

        sceneTransCords.set('gameRoomScene->testScene1', {x: -1.5, y: 0.5, z: -13.8})
        sceneTransCords.set('testScene1->gameRoomScene', {x: 0, y: 0.5, z: 0.2})
        sceneTransCords.set('testScene1->testScene2', {x: 1.5, y: 0.5, z: -13.8})
        sceneTransCords.set('testScene2->testScene1', {x: 1.5, y: 0.5, z: -13.8})
        sceneTransCords.set('testScene2->testScene3', {x: -9, y: 0.5, z: -13.8})
        sceneTransCords.set('testScene3->testScene2', {x: -9, y: 0.5, z: -13.8})
        sceneTransCords.set('testScene3->gameRoomScene', {x: -9, y: 0.5, z: -13.8})
    },

    messagePlayersInScene: (socket, message) => {

        const sceneId = playerToScene.get(socket)

        if (sceneId) {

            const sceneArr = scenesMap.get(sceneId)

            sceneArr.forEach(playerSocket => {
                playerSocket.emit('recieveGlobalUserMessage', message, socket.user.id, socket.user.username)
            })
        }
    },

    removePlayerFromScene: (socket) => {

        const sceneId = playerToScene.get(socket)

        console.log(`${socket.user.username} has left ${sceneId}`)

        if (sceneId) {

            const sceneArr = scenesMap.get(sceneId)

            sceneArr.forEach(playerSocket => {

                playerSocket.emit('userDisconnected', socket.user.id)

                if (playerSocket != socket) {
                    socket.emit('userDisconnected', playerSocket.user.id)
                }
            
            })
        }
    },

    removePlayerFromSceneMaps: (socket) => {

        const sceneId = playerToScene.get(socket)

        if (sceneId) {

            const sceneArr = scenesMap.get(sceneId)
    
            scenesMap.set(sceneId, sceneArr.filter(s => s !== socket))
    
            playerToScene.delete(socket)
        }
    },

    addPlayerToSceneMaps: (socket, sceneId) => {

        playerToScene.set(socket, sceneId)

        scenesMap.get(sceneId).push(socket)

        console.log(`${socket.user.username} has joined ${sceneId}`)

    },

    sceneTransiton: (socket, sceneId, sceneJson) => {

        let newCoordinates = {x: 0, y: 0.5, z: 0}

        const currSceneId = playerToScene.get(socket)

        const transitionKey = currSceneId + "->" + sceneId

        if (sceneTransCords.get(transitionKey)) {

            newCoordinates = sceneTransCords.get(transitionKey)

            playersInServer.get(socket.user.id).position = newCoordinates

        }

        console.log('Should place player at coordinates ', newCoordinates)

        serverScenes.removePlayerFromScene(socket)
        serverScenes.removePlayerFromSceneMaps(socket)
        serverScenes.addPlayerToSceneMaps(socket, sceneId)
        socket.emit('recieveWorldData', sceneJson)
        playerMonitor.emitPlayerMap(socket)
        playerMonitor.emitNewPlayer(socket)

    }

}

// API Communications
async function getTimeFromAPI() {
    try {
        // Add timeout and better error handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const response = await fetch(SHIP.TIME_API, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        })
        
        clearTimeout(timeoutId)
        
        if(!response.ok) {
            if(response.status === 404) {
                throw new Error ('dateTimeAPI Not Found, Setting Default dateTime.')
            } else if (response.status === 500) {
                throw new Error ('dateTimeAPI Down, Setting Default dateTime.')
            } else {
                throw new Error ('Something Went Wrong Fetching dateTimeAPI.')
            }
        }
        const data = await response.json()
        worldDateTime = new Date(data.datetime)
        console.log(`Server Time: ${worldDateTime}`)
    } catch (error) {
        // Only log if it's not a network error (which is expected in some deployments)
        if (error.name !== 'AbortError' && error.code !== 'ECONNRESET') {
            console.error('Error With Fetching dateTimeAPI:', error.message)
        }
        // Silently fall back to default time
        console.log(`Server Time: ${worldDateTime} (using default)`)
    }
    return worldDateTime
} 

// Functions for Tic-Tac-Toe minigame interactivity
const serverTTT = {

    initializeBoards: () => {
        boards.set('Board 1', [])
        boards.set('Board 2', [])
        boards.set('Board 3', [])
        boards.set('Board 4', [])

        boardStatuses.set('Board 1', {message: 'Join Board', locked: false})
        boardStatuses.set('Board 2', {message: 'Join Board', locked: false})
        boardStatuses.set('Board 3', {message: 'Join Board', locked: false})
        boardStatuses.set('Board 4', {message: 'Join Board', locked: false})
    },

    sendPlayerBoardInfo: (socket) => {

        boardStatuses.forEach((boardStatus, boardId) => {

            socket.emit('updateBoard', {boardId: boardId, boardMessage: boardStatus.message})

            if (boardStatus.locked) {
                socket.emit('lockBoard', boardId)
            }

        })

    },

    startGame: (board, socket) => {

        let opponentName = ""

        let playerNames = []

        board.forEach(playerSocket => {

            if (playerSocket != socket) {
                playerSocket.emit('startGame', socket.user.username)
                console.log('Told socket with username', playerSocket.user.username, 'that they can start playing')
                playerNames.push(playerSocket.user.username)
                opponentName = playerSocket.user.username
            } else {
                playerSocket.emit('startGame', opponentName)
                console.log('Told socket with username', playerSocket.user.username, 'that they can start playing')
                playerNames.push(playerSocket.user.username)
            }
            
        })

        const boardId = playerToBoard.get(socket)

        const lockBoardMessage = `${playerNames[0]} and ${playerNames[1]} are playing on this board`

        const boardStatus = boardStatuses.get(boardId)

        boardStatus.message = lockBoardMessage

        boardStatus.locked = true

        io.emit('updateBoard', {boardId: boardId, boardMessage: lockBoardMessage})

        io.emit('lockBoard', boardId)
    },

    endGameCondition: (socket, endData) => {
        const boardId = playerToBoard.get(socket)

        if (boardId) {

            const board = boards.get(boardId)

            if (endData.message == 'socketWon') {
                endMessage = `${socket.user.username} has won`
                console.log('A winning position has been reached on ', boardId, ' with combo ', endData.winCombo)
            } else if (endData.message == 'tieGame') {
                console.log('Game has reached a tied position')
                endMessage = 'Tie Game'
            }

            board.forEach(playerSocket => {

                if (endData.message == 'socketWon') {
                    if (playerSocket == socket) {
                        playerSocket.emit('endGame', {tieGame: false, message: endMessage, winCombo: endData.winCombo, comboColor: 'green'})
                    } else {
                        playerSocket.emit('endGame', {tieGame: false, message: endMessage, winCombo: endData.winCombo, comboColor: 'red'})
                    }
                } else {
                    playerSocket.emit('endGame', {tieGame: true, message: endMessage})
                }

            })
        }

    },

    joinBoard: (socket, boardId) => {
        
        if (boards.get(boardId).length < 2) {
            boards.get(boardId).push(socket)
            playerToBoard.set(socket, boardId)

            if (boards.get(boardId).length < 2) {
                response = {
                    isSpace: true,
                    marker: 'X'
                }
            }
            else {
                response = {
                    isSpace: true,
                    marker: 'O'
                }
            }

            socket.emit('joinBoardResponse', response)

            console.log(`${socket.user.username} joined board ${boardId} with assigned marker ${response.marker}`)

            if (boards.get(boardId).length == 2) {
                console.log('Enough players on', boardId, 'to start game')
                serverTTT.startGame(boards.get(boardId), socket)
            } else {
                const boardMessage = `${socket.user.username} is waiting for an opponent`

                const boardStatus = boardStatuses.get(boardId)

                boardStatus.message = boardMessage

                io.emit('updateBoard', {boardId: boardId, boardMessage: boardMessage})
            }

        }
        else {

            response = {
                isSpace: false
            }
            socket.emit('joinBoardResponse', response)
        }
    },

    leaveBoard: (socket, inGame) => {
        const boardId = playerToBoard.get(socket)

        if (boardId) {

            const board = boards.get(boardId)

            boards.set(boardId, board.filter(s => s !== socket))

            playerToBoard.delete(socket)

            console.log(`${socket.user.username} left board ${boardId}`)

            if (inGame) {
                board.forEach(playerSocket => {
                    if (playerSocket != socket) {
                        leaveMessage = `${socket.user.username} forfeited. You win!`
                        playerSocket.emit('opponentLeft', leaveMessage)
                    }
                })
            }

            if (boards.get(boardId).length == 0) {

                console.log('Board is now empty')

                io.emit('updateBoard', {boardId: boardId, boardMessage: 'Join Board'})

                const boardStatus = boardStatuses.get(boardId)

                boardStatus.message = 'Join Board'

                boardStatus.locked = false

                io.emit('unlockBoard', boardId)
            }
        } 

    },

    transmitMove: (socket, moveData) => {

        const boardId = playerToBoard.get(socket)

        if (boardId) {

            const board = boards.get(boardId)

            board.forEach(playerSocket => {
                if (playerSocket != socket) {
                    playerSocket.emit('opponentMove', moveData)
                }
            })

        }

    }
}

//Functions for typing minigame
const serverTyping = {

    async getRandomQuote(socket, params) {

        const originalTLSValue = process.env['NODE_TLS_REJECT_UNAUTHORIZED']

        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

        try {

            const quoteAPIURI = SHIP.QUOTE_API + params

            const response = await fetch(quoteAPIURI)
            
            if (!response.ok) {
                console.log('Error fetching quote')
            } else {
                const quoteData = await response.json()
                //console.log('Quote retrieved for socket ', socket.user.username)
                socket.emit('sendQuote', quoteData)
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = originalTLSValue
        }
    } 
}

// Functions for world data.
const playerMonitor = {
    emitWorldDateTime: async () => {
        worldDateTime = await getTimeFromAPI()
        io.emit('sendWorldTime', worldDateTime)    
    },
    addToPlayerMap: (socket) => {
        playersInServer.set(
            socket.user.id,
            {
                id: socket.user.id,
                username: socket.user.username,
                shape: socket.user.shape,
                color: socket.user.color,
                position: {x: 0, y: 0, z: -10}
            }
        )
    },
    emitNewPlayer: (socket) => {

        const sceneId = playerToScene.get(socket)

        const sceneArr = scenesMap.get(sceneId)

        sceneArr.forEach(playerSocket => {

            if (playerSocket != socket) {
                playerSocket.emit('sendPlayerData', playersInServer.get(socket.user.id))
            }
               
        })

        //io.emit('sendPlayerData', playersInServer.get(socket.user.id))
    },
    removeFromPlayerMap: (socket) => {
        playersInServer.delete(socket.user.id)
    },
    emitPlayerMap: (socket) => {

        const sceneId = playerToScene.get(socket)

        const sceneArr = scenesMap.get(sceneId)

        sceneArr.forEach(playerSocket => {

            const playerValues = playersInServer.get(playerSocket.user.id)

            socket.emit('sendPlayerData', playerValues)
            
        })

       // playersInServer.forEach((values) => {
       //     socket.emit('sendPlayerData', values)
       // })
    },
    updatePlayerPosition: (socket, point) => {

        const sceneId = playerToScene.get(socket)

        const sceneArr = scenesMap.get(sceneId)

        if (sceneArr) {

            const player = playersInServer.get(socket.user.id)

            player.position = point

            sceneArr.forEach(playerSocket => {

                playerSocket.emit('broadcastPlayerPosition', player)

            })

        }

        // if (player) {
        //    player.position = point
        //    io.emit('broadcastPlayerPosition', player)
        // }
    }
}

// Set up Socket.IO connection
io.on('connection', (socket) => {
    const username = socket.user.username
    console.log(`${username} connected`)

    socket.emit('welcome', `Connection established.`)
    socket.emit('recieveWorldData', testScene1)
    socket.emit('sendWorldTime', worldDateTime)

    playerToScene.set(socket, 'testScene1')
    scenesMap.get('testScene1').push(socket)

    playerMonitor.addToPlayerMap(socket)
    playerMonitor.emitPlayerMap(socket)
    
    playerMonitor.emitNewPlayer(socket)

    console.log(`${socket.user.username} is in scene 1`)

    serverTTT.sendPlayerBoardInfo(socket)

    socket.on('disconnect', () => {
        console.log(`${username} disconnected`)
        serverTTT.leaveBoard(socket)
        serverScenes.removePlayerFromScene(socket)
        playerMonitor.removeFromPlayerMap(socket)
        serverScenes.removePlayerFromSceneMaps(socket)
        //io.emit('userDisconnected', socket.user.id)
    })

    socket.on('sendGlobalUserMessage', (message) => {
        serverScenes.messagePlayersInScene(socket, message)
        //io.emit('recieveGlobalUserMessage', message, socket.user.id, socket.user.username)
    })

    // Server receive's updated position from socket
    socket.on('updatePlayerPosition', (point) => {
        playerMonitor.updatePlayerPosition(socket, point)
    })

    //Tic-Tac-Toe minigame client requests
    socket.on('joinBoard', (boardId) => {
        serverTTT.joinBoard(socket, boardId)
    })

    socket.on('leaveBoard', (inGame) => {
        serverTTT.leaveBoard(socket, inGame)
    })

    socket.on('playerCheckCell', (moveData) => {
        serverTTT.transmitMove(socket, moveData)
    })

    socket.on('endGame', (endData) => {
        serverTTT.endGameCondition(socket, endData)
    })

    //Typing minigame client requests
    socket.on('requestQuote', (params) => {
        serverTyping.getRandomQuote(socket, params)
    })

    // Scene Transitions Requests
    socket.on('testScene1', () => {
        serverScenes.sceneTransiton(socket, 'testScene1', testScene1)
    })

    socket.on('testScene2', () => {
        serverScenes.sceneTransiton(socket, 'testScene2', testScene2)
    })

    socket.on('testScene3', () => {
        serverScenes.sceneTransiton(socket, 'testScene3', testScene3)
    })

    socket.on('gameRoomScene', () => {
        serverScenes.sceneTransiton(socket, 'gameRoomScene', gameRoomScene)
    })

})

// Handle crashouts
io.engine.on("connection_error", (error) => {
    console.log(error.req)
    console.log(error.code)
    console.log(error.message)
    console.log(error.context)
})

async function initializeServer() {
    try { 
        await getTimeFromAPI()
        server.listen(SHIP.PORT, '0.0.0.0', () => {
            console.log(`Server running on http://0.0.0.0:${SHIP.PORT}.`)
        })
        setInterval(playerMonitor.emitWorldDateTime, 60000)
        serverTTT.initializeBoards()
        serverScenes.initSceneMaps()
    } catch (error) {
        console.error('Server failed to start.')
        console.log(error)
        process.exit(1)
    }
}

// Only start server if running directly (not when required by tests)
// Jest automatically sets NODE_ENV=test, and we also check if module is being required
if (require.main === module && process.env.NODE_ENV !== 'test') {
    initializeServer()
}

// Export app for testing
module.exports = app