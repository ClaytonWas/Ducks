// Three.js Neccesities For Creating Game Worlds
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()
camera.position.x = 0
camera.position.y = 15
camera.position.z = 5
camera.rotation.x = -0.6
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Adding A Mesh To The Three.js Scene
gameWindow = document.getElementById('gameWindow')
renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight)
gameWindow.appendChild(renderer.domElement)
const floor1 = new THREE.PlaneGeometry(20, 10)
const floor1Material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide })
const floor1Mesh = new THREE.Mesh(floor1, floor1Material)
floor1Mesh.position.set(0, 0, -10)
floor1Mesh.rotation.set(-Math.PI/2, 0, 0)

// Three.js Mesh Array For A Worlds Floorplan
const meshes = new THREE.Group()
meshes.add(floor1Mesh)
scene.add(meshes)

//User attributes
let userId;
let userName;

// Player dictionary
var playersInScene = {}


// Functions for Game Server Communication
// Function That Casts A Ray To Intersect With The Closest Object At That Point From The Camera
function onMouseClick(event) {
    mouse.x = ((event.clientX - gameWindow.getBoundingClientRect().left) / gameWindow.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - gameWindow.getBoundingClientRect().top) / gameWindow.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(meshes.children)          // Checks The Global Meshes Object To See If It Intersects With Any Meshes In The Scene

    if (intersects.length > 0) {
        const point = intersects[0].point           // Grabs the first point of intersection.
        console.log(point)

        if (point) {
            movePlayer(userId, point)
            socket.emit('updatePlayerPosition', point)
        }
    }

    
}

function movePlayer(playerId, point) { 

    // Check if the player exists in the scene before attempting to move
    if (playersInScene[playerId]) {
        playersInScene[playerId].mesh.position.set(point.x, point.y, point.z);
        console.log(`${playersInScene[playerId].name} moved to (x:${playersInScene[playerId].mesh.position.x}, y:${playersInScene[playerId].mesh.position.y}, z:${playersInScene[playerId].mesh.position.z})`);
    } else {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
    }
   
}

function instantiatePlayer(id, name, position){
    const clientPlayer = new Player({id, name, x: position.x, y: position.y, z: position.z})
    playersInScene[id] = clientPlayer
    scene.add(clientPlayer.mesh)
}

// Pass the token when connecting to the game server
const token = localStorage.getItem('token')
if (!token) {
    window.location.href = '/login'
}
const socket = io('http://localhost:3030', {
    auth: {
        token: token
    }
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

// Function That Requests The Next Animation Frame Recursivley And Renders It
// Renderer Size Is Based On The Size Of The gameWindow Div
function animate() {
    renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight)
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Function That Casts A Ray To Intersect With The Closest Object At That Point From The Camera
function onMouseClick(event) {
    mouse.x = ((event.clientX - gameWindow.getBoundingClientRect().left) / gameWindow.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - gameWindow.getBoundingClientRect().top) / gameWindow.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(meshes.children)          // Checks The Global Meshes Object To See If It Intersects With Any Meshes In The Scene

    if (intersects.length > 0) {
        const point = intersects[0].point           // Grabs the first point of intersection.
        console.log(point)

        if (point) {
            movePlayer(userId, point)
            socket.emit('updatePlayerPosition', point)
        }
    }

    
}

function movePlayer(playerId, point) { 

    // Check if the player exists in the scene before attempting to move
    if (playersInScene[playerId]) {
        playersInScene[playerId].mesh.position.set(point.x, point.y, point.z);
        console.log(`${playersInScene[playerId].name} moved to (x:${playersInScene[playerId].mesh.position.x}, y:${playersInScene[playerId].mesh.position.y}, z:${playersInScene[playerId].mesh.position.z})`);
    } else {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
    }
   
}

function instantiatePlayer(id, name, position){
    const clientPlayer = new Player({id, name, x: position.x, y: position.y, z: position.z})
    playersInScene[id] = clientPlayer
    scene.add(clientPlayer.mesh)
}

document.addEventListener('DOMContentLoaded', () => {

    socket.on('userData', (userData) => {
        userId = userData.id
        userName = userData.userName
        userPosition = userData.position

        console.log('Received user data')

        instantiatePlayer(userId, userName, userPosition)

        // Event Listener For Clicks on Game Window
        gameWindow.addEventListener('click', onMouseClick)

    })

    
    socket.on('joined_user_data', (joinedUserData) => {

        joinedUserId = joinedUserData.id
        joinedUserName = joinedUserData.username
        joinedUserPosition = joinedUserData.position
    
        instantiatePlayer(joinedUserId, joinedUserName, joinedUserPosition)
    })
    
    socket.on('new_user_data', (newUserData) => {
        newUserId = newUserData.id
        newUserName = newUserData.username
        newUserPosition = newUserData.position

        instantiatePlayer(newUserId, newUserName, newUserPosition)
    })

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

    //Update other player's position on screen
    socket.on('broadcastPlayerPosition', (playerMoveData) => {
        playerId = playerMoveData.playerId
        playerPoint = playerMoveData.playerPoint

        if (playerId != userId){
           
            movePlayer(playerId, playerPoint)
        }
        
    })

    //Remove players from mesh that have disconnected
    socket.on('userDisconnected', (disconnectedId) => {
        const disconnectedPlayer = playersInScene[disconnectedId];
        if (disconnectedPlayer) {
            scene.remove(disconnectedPlayer.mesh);
            disconnectedPlayer.mesh.geometry.dispose();
            disconnectedPlayer.mesh.material.dispose();
            delete playersInScene[disconnectedId];
            console.log(`Player with id ${disconnectedId} removed from scene`);
        } else {
            console.warn(`Player with id ${disconnectedId} not found in playersInScene.`);
        }
    })

    // Animation Loop
    animate();
})