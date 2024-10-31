const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jsonWebToken = require('jsonwebtoken')
const { posix } = require('path')

const app = express()
const port = 3030
const server = http.createServer(app)
const secretKey = 'supersecret'
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
})

const playersInServer = new Map()

// Middleware for CORS
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}))

io.use((socket, next) => {
    let token = socket.handshake.auth.token

    if (!token) {
        return next();                      // Pass response code here.
    }

    jsonWebToken.verify(token, secretKey, (error, userData) => {
        if (error) {
            return next()                   // Pass response code here.
        }
        socket.user = userData;             // This currently passes userData.id and userData.username
        next()
    })
})










// Send connected players map to the new connection.
function emitPlayerMap(socket) {
    playersInServer.forEach((values, key) => {
        socket.emit('sendPlayerData', values)
    })
}

// Add the new user to the players maps.
function addToPlayerMap(socket) {
    playersInServer.set(socket.user.id, {id: socket.user.id, username: socket.user.username, color: '0x00ff00', position: {x: 0, y: 0, z: -10}})
}

// Sends the newly connected player data to all connected sockets.
function emitNewPlayer(socket) {
    io.emit('sendPlayerData', playersInServer.get(socket.user.id))
}

// Called on socket disconnect.
function removeFromPlayerMap(socket) {
    playersInServer.delete(socket.user.id)
}


// Set up Socket.IO connection
io.on('connection', (socket) => {
    socket.emit('welcome', `Welcome to the Socket.IO server ${socket.user.username}!`)
    
    console.log(`${socket.user.username} connected`)

    emitPlayerMap(socket)
    addToPlayerMap(socket)
    emitNewPlayer(socket)

    socket.on('disconnect', () => {
        console.log(`${socket.user.username} disconnected`)

        removeFromPlayerMap(socket)

        io.emit('userDisconnected', socket.user.id)
    })

    // Server Recieves Message From A Socket
    socket.on('sendGlobalUserMessage', (message) => {
        message = `[${socket.user.username}]: ${message}`
        console.log(message)
        // Server Broadcasts This Message To All Connected Sockets
        io.emit('recieveGlobalUserMessage', message)
    })

    // Server receive's updated position from socket
    socket.on('updatePlayerPosition', (point) => {
        playersInServer.get(socket.user.id).position = {x: point.x, y: point.y, z: point.z}

        movementUpdateData = {
            id: socket.user.id,
            position: point
        }

        //Broadcast this change in position to all connected sockets
        io.emit('broadcastPlayerPosition', movementUpdateData)
    })
})

// Server Side Connection Error Messages
io.engine.on("connection_error", (error) => {
    console.log(error.req);      // the request object
    console.log(error.code);     // the error code, for example 1
    console.log(error.message);  // the error message, for example "Session ID unknown"
    console.log(error.context);  // some additional error context
})

// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
