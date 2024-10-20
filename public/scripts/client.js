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

document.addEventListener('DOMContentLoaded', () => {
    // Client-Side Message Sent To Game Server
    sendMessageButton = document.getElementById('sendUserMessage')
    sendMessageButton.addEventListener('click', async () => {  
        userInput = document.getElementById('userMessage')
        userMessage = String(userInput.value)
        userInput.value = ''
        if(userMessage) {
            socket.emit('sendGlobalUserMessage', userMessage);
        } else {
            console.log('Message could not be sent!')
        }
    })

    // Client-Side Message Recieved From The Game Server
    chatlog = document.getElementById('messagesLog')
    socket.on('recieveGlobalUserMessage', (message) => {
        chatlog.value += message + '\n'
    })
})