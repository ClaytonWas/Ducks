const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const jsonWebToken = require('jsonwebtoken')

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

//Function to transmit user data to client
function sendUserData(socket) {

    playersInServer.set(socket.user.id, {username: socket.user.username, position: {x: 0, y: 0, z: -10}})

    userData = {
        id: socket.user.id, 
        username: playersInServer.get(socket.user.id).username, 
        position: playersInServer.get(socket.user.id).position
    }

    socket.emit('userData', userData)

    console.log(`User data sent to ${socket.user.username}`)
}

//Function to transmit user data to all other users on server
function transmitNewUserData(userId) {

    newUserData = {
        id: userId, 
        username: playersInServer.get(userId).username,
        position: playersInServer.get(userId).position
    }

    io.emit('new_user_data', newUserData)
}

//Function to transmit the data of users already on the server to users who have joined
function transmitJoinedUsersData(socket) {

    playersInServer.forEach((userAttributes, userId) => {
        
        if (userId != socket.user.id){

            const joinedUserData = {
                id: userId,
                userame: userAttributes.username,
                position: userAttributes.position
            }
    
            io.emit('joined_user_data', joinedUserData)
        }
        
    })

}

// Set up Socket.IO connection
io.on('connection', (socket) => {
    console.log(`${socket.user.username} connected`)

    sendUserData(socket)

    transmitNewUserData(socket.user.id)

    transmitJoinedUsersData(socket)

    socket.emit('welcome', `Welcome to the Socket.IO server ${socket.user.username}!`)

    socket.on('disconnect', () => {
        console.log(`${socket.user.username} disconnected`)
        io.emit('userDisconnected', socket.user.id)
        playersInServer.delete(socket.user.id)
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

        playerMoveData = {
            playerId: socket.user.id,
            playerPoint: point
        }

        //Broadcast this change in position to all connected sockets
        io.emit('broadcastPlayerPosition', playerMoveData)
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
