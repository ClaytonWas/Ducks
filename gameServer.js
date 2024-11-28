const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jsonWebToken = require('jsonwebtoken')
const { posix } = require('path')
const { emit, resourceUsage, config } = require('process')
const path = require('path')
const fs = require('fs')

// Config
const SHIP = {
    PORT: 3030,
    SECRET_KEY: 'runescapefan',
    PROFILE_SERVER: 'http://localhost:3000',
    TIME_API: 'http://worldtimeapi.org/api/timezone/America/Toronto',
    QUOTE_API: 'https://api.api-ninjas.com/v1/quotes?category=happiness'
}

// Globals
const world = require('./scenes/gameroomScene.json')
const playersInServer = new Map()

// Tic Tac Toe Game globals
const boardStatuses = new Map() // Map's a board to it's current description
const boards = new Map() // Map's a board to a maximum of 2 players
const playerToBoard = new Map() // Map's a player to board

// Default Time
let worldDateTime = new Date(1999, 1, 1, 9, 10, 0, 0)

// Server
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: SHIP.PROFILE_SERVER,
        methods: ["GET", "POST"],
        credentials: true
    }
})

// Middleware for CORS
app.use(cors({
    origin: SHIP.PROFILE_SERVER,
    methods: ["GET", "POST"],
    credentials: true
}))
app.use(express.static(path.join(__dirname, 'public')))

// Loading textures to port 3030
app.get('/textures', (req, res) => {
    const texturesPath = path.join(__dirname, 'public', 'textures')

    fs.readdir(texturesPath, (error, files) => {
        if (error) {
            console.error('Error reading textures directory:', error)
            return res.status(500).json({ error: 'Unable to load textures.' })
        }

        const textures = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
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

// API Communications
async function getTimeFromAPI() {
    try {
        const response = await fetch(SHIP.TIME_API)
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
        console.error('Error With Fetching dateTimeAPI:', error)
        console.log(`Server Time: ${worldDateTime}`)
    }
    return worldDateTime
} 

// Functions for Tic-Tac-Toe minigame interactivity
const serverTTT = {

    // Initialize map based representation of Tic-tac-toe boards and
    // board statuses on the server
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

    // Send a newly joined player information on the current statuses of all
    // Tic-tac-toe boards
    sendPlayerBoardInfo: (socket) => {

        boardStatuses.forEach((boardStatus, boardId) => {

            socket.emit('updateBoard', {boardId: boardId, boardMessage: boardStatus.message})

            if (boardStatus.locked) {
                socket.emit('lockBoard', boardId)
            }

        })

    },

    // When two player's have joined a board, emit a message the player's sockets
    // to allow them to start the game
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

        // Update the board's status for all players
        io.emit('updateBoard', {boardId: boardId, boardMessage: lockBoardMessage})

        // Lock the board for all players on the server
        io.emit('lockBoard', boardId)
    },

    // If an end game condition has been reached, informs each player that the game has ended
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

                // Tell's the winning player to color the markers in their winning cell streak green,
                // and tell's their opponent to color them red
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

    // Add client socket to the map representaion of the game boards
    joinBoard: (socket, boardId) => {
        
        // Only allow's the requesting to join the board if it contains less than 2 players
        if (boards.get(boardId).length < 2) {
            boards.get(boardId).push(socket)
            playerToBoard.set(socket, boardId)

            // The first player in the board is assinged the X marker
            if (boards.get(boardId).length < 2) {
                response = {
                    isSpace: true,
                    marker: 'X'
                }
            }
            else { // The second player in the board is assigned the O marker
                response = {
                    isSpace: true,
                    marker: 'O'
                }
            }

            socket.emit('joinBoardResponse', response)

            console.log(`${socket.user.username} joined board ${boardId} with assigned marker ${response.marker}`)
            
            // Trigger the start of the game if there are two players at the board
            if (boards.get(boardId).length == 2) {
                console.log('Enough players on', boardId, 'to start game')
                serverTTT.startGame(boards.get(boardId), socket)
            } else { // If there is only one player at the board, update status message of the board to reflect that
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

    // Removes client socket from it's associated Tic-tac-toe maps 
    leaveBoard: (socket, inGame) => {
        const boardId = playerToBoard.get(socket)

        if (boardId) {

            const board = boards.get(boardId)

            boards.set(boardId, board.filter(s => s !== socket))

            playerToBoard.delete(socket)

            console.log(`${socket.user.username} left board ${boardId}`)

            // If the client socket left a game in progress, inform their opponent that they have won by forfeit
            if (inGame) {
                board.forEach(playerSocket => {
                    if (playerSocket != socket) {
                        leaveMessage = `${socket.user.username} forfeited. You win!`
                        playerSocket.emit('opponentLeft', leaveMessage)
                    }
                })
            }

            // If a board is empty, emit message to unlock it for all sockets on the server
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

    // Transmit a move a client socket has made to their opponent
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

            const quoteAPIURI = "https://api.quotable.io/random" + params

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
        io.emit('sendPlayerData', playersInServer.get(socket.user.id))
    },
    removeFromPlayerMap: (socket) => {
        playersInServer.delete(socket.user.id)
    },
    emitPlayerMap: (socket) => {
        playersInServer.forEach((values) => {
            socket.emit('sendPlayerData', values)
        })
    },
    updatePlayerPosition: (socket, point) => {
        const player = playersInServer.get(socket.user.id)
        if (player) {
            player.position = point
            io.emit('broadcastPlayerPosition', player)
        }
    }
}

// Set up Socket.IO connection
io.on('connection', (socket) => {
    const username = socket.user.username
    console.log(`${username} connected`)

    socket.emit('welcome', `Connection established.`)
    socket.emit('recieveWorldData', world)
    socket.emit('sendWorldTime', worldDateTime)

    playerMonitor.emitPlayerMap(socket)
    playerMonitor.addToPlayerMap(socket)
    playerMonitor.emitNewPlayer(socket)

    serverTTT.sendPlayerBoardInfo(socket)

    socket.on('disconnect', () => {
        console.log(`${username} disconnected`)
        serverTTT.leaveBoard(socket)
        playerMonitor.removeFromPlayerMap(socket)
        io.emit('userDisconnected', socket.user.id)
    })

    socket.on('sendGlobalUserMessage', (message) => {
        io.emit('recieveGlobalUserMessage', message, socket.user.id, socket.user.username)
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
        server.listen(SHIP.PORT, () => {
            console.log(`Server running on http://localhost:${SHIP.PORT}.`)
        })
        setInterval(playerMonitor.emitWorldDateTime, 60000)
        serverTTT.initializeBoards()
    } catch (error) {
        console.error('Server failed to start.')
        process.exit(1)
    }
}

initializeServer()