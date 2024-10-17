// Pass the token when connecting to the game server
const socket = io('http://localhost:3030', {
    withCredentials: true
});

// Client Side Connection Error Messages
socket.on("connect_error", (err) => {
    console.log(err.message)
    console.log(err.description)
    console.log(err.context)
});

// Client Recieving Welcome Message

socket.on('welcome', (message) => {
    console.log(message)
});

// Client Sending Text Message
function sendMessage() {
    const message = "Hello world!";
    socket.emit('globalUserMessage', message);
}
sendMessage();