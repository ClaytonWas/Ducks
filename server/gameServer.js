const express = require('express')
const http = require('http')
const https = require('https')
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
    QUOTE_API: 'https://api.quotable.io/random',
    USE_QUOTE_API: process.env.USE_QUOTE_API !== 'false' // Set to 'false' to disable external API and use fallbacks only
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

            // Notify all other players in the scene that this player disconnected
            sceneArr.forEach(playerSocket => {
                if (playerSocket !== socket) {
                    playerSocket.emit('userDisconnected', socket.user.id)
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
        // Re-send player ID on scene change so client knows which player they are
        socket.emit('yourPlayerId', socket.user.id)
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

    // Fallback quotes when API fails
    getFallbackQuote(params) {
        const shortQuotes = [
            { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { content: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
            { content: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
            { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { content: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" }
        ]
        
        const mediumQuotes = [
            { content: "The greatest glory in living lies not in never falling, but in rising every time we fall. The way to get started is to quit talking and begin doing.", author: "Nelson Mandela" },
            { content: "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma which is living with the results of other people's thinking.", author: "Steve Jobs" },
            { content: "If life were predictable it would cease to be life, and be without flavor. The way to get started is to quit talking and begin doing.", author: "Eleanor Roosevelt" },
            { content: "If you look at what you have in life, you'll always have more. If you look at what you don't have in life, you'll never have enough.", author: "Oprah Winfrey" },
            { content: "Life is what happens to you while you're busy making other plans. The future belongs to those who believe in the beauty of their dreams.", author: "John Lennon" }
        ]
        
        const longQuotes = [
            { content: "The greatest glory in living lies not in never falling, but in rising every time we fall. The way to get started is to quit talking and begin doing. Don't let yesterday take up too much of today. You learn more from failure than from success. Don't let it stop you. Failure builds character. If you are working on something exciting that you really care about, you don't have to be pushed. The vision pulls you.", author: "Nelson Mandela" },
            { content: "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma which is living with the results of other people's thinking. Don't let the noise of others' opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition. They somehow already know what you truly want to become.", author: "Steve Jobs" },
            { content: "If life were predictable it would cease to be life, and be without flavor. The way to get started is to quit talking and begin doing. Don't let yesterday take up too much of today. You learn more from failure than from success. Don't let it stop you. Failure builds character. Life is what happens to you while you're busy making other plans.", author: "Eleanor Roosevelt" },
            { content: "The future belongs to those who believe in the beauty of their dreams. Tell me and I forget. Teach me and I remember. Involve me and I learn. The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart. It is during our darkest moments that we must focus to see the light.", author: "Helen Keller" },
            { content: "If you look at what you have in life, you'll always have more. If you look at what you don't have in life, you'll never have enough. The way to get started is to quit talking and begin doing. Don't let yesterday take up too much of today. You learn more from failure than from success. Don't let it stop you. Failure builds character.", author: "Oprah Winfrey" }
        ]
        
        let quotes
        if (params.includes('maxLength=149')) {
            quotes = shortQuotes
        } else if (params.includes('minLength=300')) {
            quotes = longQuotes
        } else {
            quotes = mediumQuotes
        }
        
        // Return random quote from appropriate array
        return quotes[Math.floor(Math.random() * quotes.length)]
    },

    async getRandomQuote(socket, params, retryCount = 0) {
        const maxRetries = 2
        const quoteAPIURI = SHIP.QUOTE_API + params
        const serverTyping = this // Store reference for recursive calls

        // Wrapper to ensure we ALWAYS emit something, even if there's an unexpected error
        const emitFallbackSafely = () => {
            try {
                console.log(`Emitting fallback quote (safety net)`)
                const fallbackQuote = serverTyping.getFallbackQuote(params)
                if (socket && socket.connected) {
                    socket.emit('sendQuote', fallbackQuote)
                    console.log(`✓ Fallback quote emitted via safety net`)
                } else {
                    console.error(`Socket not connected, cannot emit fallback`)
                }
            } catch (e) {
                console.error(`CRITICAL: Safety net also failed:`, e)
            }
        }

        // Check if external API is disabled via environment variable
        if (!SHIP.USE_QUOTE_API) {
            console.log('External quote API disabled (USE_QUOTE_API=false), using fallback quote')
            emitFallbackSafely()
            return
        }

        // Handle certificate validation bypass if needed (for CERT_HAS_EXPIRED issues)
        // This is a workaround - updating CA certificates in Dockerfile is the proper fix
        const originalTLSReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED
        if (process.env.ALLOW_INSECURE_TLS === 'true') {
            console.warn('⚠️  WARNING: TLS certificate validation bypassed (ALLOW_INSECURE_TLS=true)')
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        }

        try {
            console.log(`Attempting to fetch quote from API: ${quoteAPIURI} (attempt ${retryCount + 1})`)
            
            // Show loading indicator on first attempt
            if (retryCount === 0) {
                socket.emit('quoteLoading', { message: 'Fetching quote from API...' })
            }
            
            // Use https module directly if ALLOW_INSECURE_TLS is set (fetch doesn't support custom agents)
            let response
            if (process.env.ALLOW_INSECURE_TLS === 'true') {
                // Use https module with custom agent that bypasses certificate validation
                const httpsAgent = new https.Agent({ rejectUnauthorized: false })
                response = await new Promise((resolve, reject) => {
                    const url = new URL(quoteAPIURI)
                    const options = {
                        hostname: url.hostname,
                        port: url.port || 443,
                        path: url.pathname + url.search,
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Ducks-Game-Server/1.0'
                        },
                        agent: httpsAgent
                    }
                    
                    const timeout = setTimeout(() => {
                        req.destroy()
                        reject(new Error('Request timeout'))
                    }, 10000)
                    
                    const req = https.request(options, (res) => {
                        clearTimeout(timeout)
                        let data = ''
                        res.on('data', chunk => data += chunk)
                        res.on('end', () => {
                            resolve({
                                ok: res.statusCode >= 200 && res.statusCode < 300,
                                status: res.statusCode,
                                statusText: res.statusMessage,
                                json: async () => JSON.parse(data)
                            })
                        })
                    })
                    
                    req.on('error', (error) => {
                        clearTimeout(timeout)
                        reject(error)
                    })
                    
                    req.end()
                })
            } else {
                // Use standard fetch
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
                
                response = await fetch(quoteAPIURI, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Ducks-Game-Server/1.0'
                    }
                })
                
                clearTimeout(timeoutId)
            }
            
            // Restore original TLS setting
            if (originalTLSReject !== undefined) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTLSReject
            } else if (process.env.ALLOW_INSECURE_TLS === 'true') {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
            }
            
            if (!response.ok) {
                // Log the error for debugging
                console.error(`Quote API returned ${response.status} ${response.statusText} for ${quoteAPIURI}`)
                
                // Retry on server errors (5xx) or rate limiting (429)
                if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
                    console.log(`Retrying quote API request (attempt ${retryCount + 1}/${maxRetries})...`)
                    // Emit retry status to client for visual feedback
                    socket.emit('quoteRetrying', { 
                        attempt: retryCount + 1, 
                        maxRetries: maxRetries,
                        error: `HTTP ${response.status}`
                    })
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
                    return serverTyping.getRandomQuote(socket, params, retryCount + 1)
                }
                
                // Use fallback quote after retries exhausted
                console.log(`Using fallback quote after ${response.status} error`)
                const fallbackQuote = serverTyping.getFallbackQuote(params)
                console.log(`Emitting fallback quote: ${fallbackQuote.content.substring(0, 50)}...`)
                socket.emit('sendQuote', fallbackQuote)
                return
            }
            
            const quoteData = await response.json()
            
            // Validate quote data structure
            if (!quoteData || !quoteData.content) {
                console.error('Invalid quote data received:', JSON.stringify(quoteData).substring(0, 100))
                
                // Retry if we got invalid data
                if (retryCount < maxRetries) {
                    console.log(`Retrying quote API request due to invalid data (attempt ${retryCount + 1}/${maxRetries})...`)
                    // Emit retry status to client for visual feedback
                    socket.emit('quoteRetrying', { 
                        attempt: retryCount + 1, 
                        maxRetries: maxRetries,
                        error: 'Invalid data received'
                    })
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
                    return serverTyping.getRandomQuote(socket, params, retryCount + 1)
                }
                
                // Use fallback quote after retries exhausted
                console.log('Using fallback quote after invalid data')
                const fallbackQuote = serverTyping.getFallbackQuote(params)
                console.log(`Emitting fallback quote: ${fallbackQuote.content.substring(0, 50)}...`)
                socket.emit('sendQuote', fallbackQuote)
                return
            }
            
            // Success! Send the quote
            console.log(`✓ Quote retrieved successfully from API for ${socket.user?.username || 'unknown'}`)
            console.log(`Emitting quote to socket: ${quoteData.content.substring(0, 50)}...`)
            socket.emit('sendQuote', quoteData)
        } catch (error) {
            // Log detailed error information
            const errorName = error.name || 'Unknown'
            const errorMessage = error.message || String(error)
            // Check error.code, error.cause.code, and error.errno for the error code
            const errorCode = error.code || error.cause?.code || error.errno || 'N/A'
            
            // Enhanced error logging for diagnostics
            console.error(`Quote API error: ${errorName} - ${errorMessage}`)
            console.error(`Error code: ${errorCode}`)
            console.error(`API URL attempted: ${quoteAPIURI}`)
            console.error(`Retry count: ${retryCount}/${maxRetries}`)
            
            // Log specific error types for debugging (check certificate errors first)
            if (errorCode === 'CERT_HAS_EXPIRED' || errorMessage.includes('certificate has expired') || error.cause?.code === 'CERT_HAS_EXPIRED') {
                console.error(`DIAGNOSIS: SSL Certificate expired - Docker container may have outdated CA certificates`)
                console.error(`SOLUTION 1: Rebuild Docker image (CA certificates updated in Dockerfile)`)
                console.error(`SOLUTION 2: Set USE_QUOTE_API=false in Railway to use fallback quotes`)
                console.error(`SOLUTION 3: Set ALLOW_INSECURE_TLS=true in Railway (INSECURE - only for testing)`)
            } else if (errorMessage.includes('fetch failed') && errorCode !== 'CERT_HAS_EXPIRED' && error.cause?.code !== 'CERT_HAS_EXPIRED') {
                console.error(`DIAGNOSIS: Network failure - Railway may be blocking external API requests`)
                console.error(`SOLUTION: Set USE_QUOTE_API=false in Railway environment variables to use fallback quotes`)
            }
            if (errorCode === 'ENOTFOUND') {
                console.error(`DIAGNOSIS: DNS resolution failed - cannot resolve api.quotable.io`)
            }
            if (errorCode === 'ECONNREFUSED') {
                console.error(`DIAGNOSIS: Connection refused - API server may be down or blocking Railway IPs`)
            }
            if (errorName === 'AbortError') {
                console.error(`DIAGNOSIS: Request timed out after 10 seconds`)
            }
            
            if (error.cause) {
                console.error(`Error cause:`, error.cause)
            }
            if (error.stack) {
                console.error(`Error stack:`, error.stack.substring(0, 200))
            }
            
            // Restore TLS setting in case of error
            if (originalTLSReject !== undefined) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTLSReject
            } else if (process.env.ALLOW_INSECURE_TLS === 'true') {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
            }
            
            // Check if this is a retryable error
            const isRetryable = errorName === 'AbortError' || 
                               errorCode === 'ECONNREFUSED' || 
                               errorCode === 'ENOTFOUND' || 
                               errorCode === 'ETIMEDOUT' ||
                               errorCode === 'CERT_HAS_EXPIRED' ||
                               errorMessage.includes('fetch failed') ||
                               errorMessage.includes('network') ||
                               errorMessage.includes('timeout') ||
                               errorMessage.includes('certificate')
            
            // Retry on network errors
            if (isRetryable && retryCount < maxRetries) {
                console.log(`Retrying quote API request after ${errorName || errorCode} (attempt ${retryCount + 1}/${maxRetries})...`)
                // Emit retry status to client for visual feedback
                socket.emit('quoteRetrying', { 
                    attempt: retryCount + 1, 
                    maxRetries: maxRetries,
                    error: errorMessage.substring(0, 50)
                })
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
                return serverTyping.getRandomQuote(socket, params, retryCount + 1)
            }
            
            // Always use fallback quote if API fails (after retries or immediately for non-retryable errors)
            console.log(`Using fallback quote after ${errorName || errorCode || 'unknown'} error`)
            emitFallbackSafely()
        }
    } 
}

// Functions for world data.
const playerMonitor = {
    emitWorldDateTime: async () => {
        // Always try to get time from API, but always emit time (even if API fails)
        const newTime = await getTimeFromAPI()
        // If API succeeded, use the new time, otherwise keep the existing worldDateTime
        if (newTime) {
            worldDateTime = newTime
        }
        // Always emit the current world time, even if API failed
        io.emit('sendWorldTime', worldDateTime)
        console.log(`World time updated: ${worldDateTime}`)
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
    // Send the user's own ID so client knows which player they control
    socket.emit('yourPlayerId', socket.user.id)
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
        // Emit disconnect to all players in the same scene
        // This is already handled in removePlayerFromScene, but we ensure it happens
        
        // Note: We don't clear activeSessions here because the user might reconnect
        // Active sessions are cleared on explicit logout from profileServer
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
        console.log(`Quote request received from ${socket.user?.username || 'unknown'} with params: ${params}`)
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