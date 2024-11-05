// Three.js Neccesities For Creating Game Worlds
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

// Initial Camera Position
camera.position.x = 0
camera.position.y = 15
camera.position.z = 15
camera.rotation.x = -0.6

// Adding A Floorplane To The Three.js Scene
const gameWindow = document.getElementById('gameWindow')
renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight)
gameWindow.appendChild(renderer.domElement)
const floor1Geometry = new THREE.PlaneGeometry(20, 10)
const floor1Material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide })
const floor1Mesh = new THREE.Mesh(floor1Geometry, floor1Material)
floor1Mesh.position.set(0, 0, -10)
floor1Mesh.rotation.set(-Math.PI/2, 0, 0)

// Three.js Mesh Array For Worlds Floorplan
const floors = new THREE.Group()
floors.add(floor1Mesh)
scene.add(floors)

// Adding Objects To The Three.js Scene
const box1Geometry = new THREE.BoxGeometry(2, 1, 2)
const box1Material = new THREE.MeshStandardMaterial({ color: 0x12ABC1 })
const box1Mesh = new THREE.Mesh(box1Geometry, box1Material)
box1Mesh.position.set(5, 0.5, -10)

const box2Geometry = new THREE.BoxGeometry(1, 2, 1)
const box2Material = new THREE.MeshStandardMaterial({ color: 0xAA1100 })
const box2Mesh = new THREE.Mesh(box2Geometry, box2Material)
box2Mesh.position.set(-7, 1, -10)

// Three.js Mesh Array For Impassable Objects
const objects = new THREE.Group()
objects.add(box1Mesh)
objects.add(box2Mesh)
scene.add(objects)

// Three.js Lighting System
const ambientLight = new THREE.AmbientLight(0x404040);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(1, 10, -10)
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);

renderer.shadowMap.enabled = true
directionalLight.castShadow = true

scene.add(ambientLight)
scene.add(directionalLight)
scene.add(directionalLightHelper)

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

    const intersects = raycaster.intersectObjects(floors.children)          // Checks The Global Meshes Object To See If It Intersects With Any Meshes In The Scene

    if (intersects.length > 0) {
        const point = intersects[0].point           // Grabs the first point of intersection.

        if (point) {
            socket.emit('updatePlayerPosition', point)
        }
    }
}

function movePlayer(playerId, point) { 

    // Check if the player exists in the scene before attempting to move
    if (playersInScene[playerId]) {
        playersInScene[playerId].mesh.position.set(point.x, point.y, point.z);
        console.log(`${playersInScene[playerId].username} moved`);
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

function linearMovement(playerId, targetPoint, duration = 1000) {
    if (!playersInScene[playerId]) {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
        return;
    }

    const player = playersInScene[playerId];
    const startX = player.x;
    const startY = player.y;
    const startZ = player.z;
    const deltaX = targetPoint.x - startX;
    const deltaZ = targetPoint.z - startZ;
    const startTime = performance.now();

    console.log(`Starting point is (${startX}, ${startY}, ${startZ})`)
    console.log(`Destination point is (${targetPoint.x}, ${targetPoint.y}, ${targetPoint.z})`)

    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1); // Normalized time (0 to 1)

        // Calculate the current position based on progress
        const incX = startX + deltaX * progress;
        const incZ = startZ + deltaZ * progress;

        // Update the player's position
        player.mesh.position.set(incX, targetPoint.y, incZ);

        console.log(`(${incX.toFixed(4)}, ${targetPoint.y.toFixed(4)}, ${incZ.toFixed(4)})`)

        // If the movement isn't complete, request the next animation frame
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Ensure the player reaches the exact target point at the end
            player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
            player.x = targetPoint.x
            player.y = targetPoint.y
            player.z = targetPoint.z
        }
    }
   
    // Start the animation
    requestAnimationFrame(animate);
}

//Legacy function - teleports player
function movePlayer(playerId, point) { 

    // Check if the player exists in the scene before attempting to move
    if (playersInScene[playerId]) {
        linearMovement(playerId, point)
        playersInScene[playerId].mesh.position.set(point.x, point.y, point.z);
        console.log(`${playersInScene[playerId].name} moved to {${point.x}, ${point.y}, ${point.z}}`);
    } else {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
    }
   
}

function instantiatePlayer(id, name, color, position){
    let clientPlayer = new Player(id, name, color, position.x, position.y, position.z)
    playersInScene[id] = clientPlayer
    scene.add(clientPlayer.mesh)
}

// Toolbar Handler
const toolbarInputs = {
    '1': () => {
        console.log('Camera Angle 1 - Game Angle');
        camera.position.x = 0
        camera.position.y = 15
        camera.position.z = 15

        camera.rotation.x = -0.6
        camera.rotation.y = 0
        camera.rotation.z = 0
    },
    '2': () => {
        console.log('Camera Angle 2 - Perspective Angle ');
        camera.position.x = -10
        camera.position.y = 5
        camera.position.z = 10

        camera.rotation.x = 0
        camera.rotation.y = -0.3
        camera.rotation.z = 0
    },
    '3': () => {
        console.log('Camera Angle 3 - At World Origin');
        camera.position.x = 0
        camera.position.y = 0
        camera.position.z = 0

        camera.rotation.x = 0
        camera.rotation.y = 0
        camera.rotation.z = 0
    },    
    '4': () => {
        console.log('Camera Angle 4 - Near Plane Angle');
        camera.position.x = 0
        camera.position.y = 0.75
        camera.position.z = 2

        camera.rotation.x = 0
        camera.rotation.y = 0
        camera.rotation.z = 0
    },
    '-': () => {
        console.log('Decreasing Sunlight Intensity')
        directionalLight.intensity -= 0.1
    },
    '=': () => {
        console.log('Increasing Sunlight Intensity')
        directionalLight.intensity += 0.1
    }
};

document.addEventListener('DOMContentLoaded', () => {
    gameWindow.addEventListener('click', onMouseClick)

    // Toolbar Listener
    document.addEventListener('keydown', (event) => {
        const key = event.key;
        
        // Check if the pressed key has a corresponding action
        if (toolbarInputs[key]) {
            toolbarInputs[key]();
        }
    });

    socket.on('sendPlayerData', (player) => {
        instantiatePlayer(player.id, player.username, player.color, player.position)
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
    socket.on('broadcastPlayerPosition', (movementData) => {
        //movePlayer(movementData.id, movementData.position)
        linearMovement(movementData.id, movementData.position)
    })

    //Remove players from mesh that have disconnected
    socket.on('userDisconnected', (id) => {
        const disconnectedPlayer = playersInScene[id];
        if (disconnectedPlayer) {
            scene.remove(disconnectedPlayer.mesh);
            disconnectedPlayer.mesh.geometry.dispose();
            disconnectedPlayer.mesh.material.dispose();
            delete playersInScene[id];
            console.log(`Player instance with id ${id} removed from scene.`);
        } else {
            console.warn(`Player with id ${id} not found in playersInScene.`);
        }
    })

    // Animation Loop
    animate();
})