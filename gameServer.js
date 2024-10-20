const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const cookie = require('cookie')
const jsonWebToken = require('jsonwebtoken')

const app = express()
const port = 3030
const server = http.createServer(app)
const secretKey = 'supersecret'
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true                   // Allow cookies to be sent
    }
})

// Middleware for CORS
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}))

io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie)

    if (!cookies.token) {
        return next();                      // Pass response code here.
    }

    jsonWebToken.verify(cookies.token, secretKey, (error, userData) => {
        if (error) {
            return next()                   // Pass response code here.
        }
        socket.user = userData;             // This currently passes userData.id and userData.username
        next()
    })
})

// Set up Socket.IO connection
io.on('connection', (socket) => {
    console.log(`${socket.user.username} connected`)
    
    socket.emit('welcome', 'Welcome to the Socket.IO server!')

    socket.on('disconnect', () => {
        console.log(`${socket.user.username} disconnected`)
    })

    // Server Recieves Message From A Socket
    socket.on('sendGlobalUserMessage', (message) => {
        message = `[${socket.user.username}]: ${message}`
        console.log(message)
        // Server Broadcasts This Message To All Connected Sockets
        io.emit('recieveGlobalUserMessage', message)
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
