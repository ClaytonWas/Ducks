import priorityQueue from './priorityQueue.js'

import Movement from './Movement.js'

const token = localStorage.getItem('token')
if (!token) {
    window.location.href = '/login'
}

// Three.js Neccesities For Creating Game Worlds
const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer()
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.x = 0
camera.position.y = 15
camera.position.z = 15
camera.rotation.x = -0.6

// Adding A Floorplane To The Three.js Scene
const gameWindow = document.getElementById('gameWindow')
renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight)
gameWindow.appendChild(renderer.domElement)

// Mesh Groups Of Level
const floors = new THREE.Group()
const objects = new THREE.Group()
const transitions = new THREE.Group()

// Lighting 
const ambientLight = new THREE.AmbientLight(0x404040)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(1, 10, -10)
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5)

renderer.shadowMap.enabled = true
directionalLight.castShadow = true

scene.add(ambientLight)
scene.add(directionalLight)
scene.add(directionalLightHelper)

// Player dictionary
var playersInScene = {}
var movementSystem = new Movement(scene, objects, floors, playersInScene)

const host = 'http://localhost:3030'

const socket = io(host, {
    auth: { token: token }
})

socket.on("connect_error", (err) => {
    console.log(err.message)
    console.log(err.description)
    console.log(err.context)
})

socket.on('welcome', (message) => {
    console.log(message)
})

function onMouseClick(event) {
    mouse.x = ((event.clientX - gameWindow.getBoundingClientRect().left) / gameWindow.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - gameWindow.getBoundingClientRect().top) / gameWindow.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera)

    const intersectsTransitions = raycaster.intersectObjects(transitions.children)
    const intersectsFloors = raycaster.intersectObjects(floors.children)

    if (intersectsTransitions.length > 0) {
        console.log(intersectsTransitions[0].object.userData.transition)
        console.log("this needs to get the onclick stored in each transitions object and emit it as an event that corrctly loads this socket into that map")
        return
    }

    if (intersectsFloors.length > 0) {
        const point = intersectsFloors[0].point
        if (point) {
            socket.emit('updatePlayerPosition', point)
        }
    }
}

function animate() {
    renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight)
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function instantiatePlayer(id, name, shape, color, position) {
    console.log(shape)
    let clientPlayer = new Player(id, name, shape, color, position.x, position.y, position.z)
    playersInScene[id] = clientPlayer
    scene.add(clientPlayer.mesh)
    movementSystem.updateSceneAndPlayers(scene, playersInScene)
}

function chatBubble(player, message) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = 1024
    canvas.height = 512

    
    // Draw the chat bubble
    context.fillStyle = 'white'
    context.strokeStyle = 'gray'
    context.lineWidth = 10

    // Calculate center and radii for the ellipse
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radiusX = canvas.width / 3
    const radiusY = canvas.height / 3

    context.beginPath()
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    context.font = '100px Arial'
    context.fillStyle = 'black'
    context.textAlign = 'center'
    context.fillText(message, centerX, centerY)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)

    sprite.position.set(0, 2, 0)
    sprite.scale.set(5, 2.5, 1)

    player.mesh.add(sprite)

    setInterval(() => {
        player.mesh.remove(sprite)
        material.dispose()
        texture.dispose()
    }, 7000)
}

function emptyGroup(group) {
    while(group.children.length > 0) { 
        const child = group.children[0]
        if (child.geometry) {
            child.geometry.dispose()
        }
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose())
            } else {
                child.material.dispose()
            }
        }
        group.remove(child)
    }
}

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
    },
    'w': () => {
        console.log('Moving Camera')
        camera.position.z -= 0.5
    },
    's': () => {
        console.log('Moving Camera')
        camera.position.z += 0.5
    },
    'a': () => {
        console.log('Moving Camera')
        camera.position.x -= 0.5
    },
    'd': () => {
        console.log('Moving Camera')
        camera.position.x += 0.5
    },
    'q': () => {
        console.log('Moving Camera')
        camera.position.y -= 0.5
    },
    'e': () => {
        console.log('Moving Camera')
        camera.position.y += 0.5
    },
    'z': () => {
        console.log('Rotating Camera')
        camera.rotation.x += Math.PI/6
    },
    'x': () => {
        console.log('Rotating Camera')
        camera.rotation.y += Math.PI/6
    },
    'c': () => {
        console.log('Rotating Camera')
        camera.rotation.z += Math.PI/6
    }
}

document.addEventListener('DOMContentLoaded', () => {
    gameWindow.addEventListener('click', onMouseClick)

    // Toolbar Listener
    document.addEventListener('keydown', (event) => {
        const key = event.key
        if (toolbarInputs[key]) {
            toolbarInputs[key]()
        } 
    })

    socket.on('recieveWorldData', (world) => {
        emptyGroup(floors)
        emptyGroup(objects)
        emptyGroup(transitions)
        let textureLoader = new THREE.TextureLoader()
        let floorData = world.floors
        let objectData = world.objects
        let transitionsData = world.transitions

        floorData.forEach(floor => {
            let Geometry = new THREE.PlaneGeometry(floor.geometry.width, floor.geometry.height)
            let Material = new THREE.MeshStandardMaterial({ color: floor.color })
            
            if (floor.material) {
                textureLoader.load(
                    `${host}/textures/${floor.material}`, 
                    (texture) => {
                        Material = new THREE.MeshStandardMaterial({ map: texture })
                        console.log(`${floor.material} loaded.`)
                        let Mesh = new THREE.Mesh(Geometry, Material)
                        Mesh.position.set(floor.position.x, floor.position.y, floor.position.z)
                        Mesh.rotation.set(floor.rotation.x, floor.rotation.y, floor.rotation.z)
                        floors.add(Mesh)
                    },
                    (error) => { 
                        console.log(`Could not find ${floor.material} in texture set.`) 
                    }
                )
            } else {
                // If no material is provided, use the default colour
                let Mesh = new THREE.Mesh(Geometry, Material)
                Mesh.position.set(floor.position.x, floor.position.y, floor.position.z)
                Mesh.rotation.set(floor.rotation.x, floor.rotation.y, floor.rotation.z)
                floors.add(Mesh)
            }
        })

        objectData.forEach(object => {
            if (object.type === "box") {
                var Geometry = new THREE.BoxGeometry(object.geometry.width, object.geometry.height, object.geometry.depth)
            }
            let Material = new THREE.MeshStandardMaterial({ color: object.color })
            let Mesh = new THREE.Mesh(Geometry, Material)
            Mesh.position.set(object.position.x, object.position.y, object.position.z)
            Mesh.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z)
            objects.add(Mesh)
        })

        transitionsData.forEach(transition => {
            if (transition.type === "box") {
                var Geometry = new THREE.BoxGeometry(transition.geometry.width, transition.geometry.height, transition.geometry.depth)
            }
            let Material = new THREE.MeshStandardMaterial({ color: transition.color })

            if (transition.material) {
                textureLoader.load(
                    `${host}/textures/${transition.material}`, 
                    (texture) => {
                        Material = new THREE.MeshStandardMaterial({ map: texture })
                        console.log(`${transition.material} loaded.`)
                        let Mesh = new THREE.Mesh(Geometry, Material)
                        Mesh.position.set(transition.position.x, transition.position.y, transition.position.z)
                        Mesh.rotation.set(transition.rotation.x, transition.rotation.y, transition.rotation.z)
                        Mesh.userData.transition = transition.onClick            
                        transitions.add(Mesh)
                    },
                    (error) => { 
                        console.log(`Could not find ${transition.material} in texture set.`) 
                    }
                )
            } else {
                // If no material is provided, use the default colour
                let Mesh = new THREE.Mesh(Geometry, Material)
                Mesh.position.set(transition.position.x, transition.position.y, transition.position.z)
                Mesh.rotation.set(transition.rotation.x, transition.rotation.y, transition.rotation.z)
                Mesh.userData.transition = transition.onClick            
                transitions.add(Mesh)
            }
        })

        scene.add(floors)
        scene.add(objects)
        scene.add(transitions)
    })

    socket.on('sendWorldTime', (date) => {
        let gameServerTime = new Date(date)
        let gameServerTimeString = gameServerTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
        document.getElementById('worldDateTime').textContent = gameServerTimeString

        let currentHour = gameServerTime.getHours()
        if (currentHour > 12 && currentHour < 20) { //between 1-7pm
            currentHour = currentHour % 12
            directionalLight.intensity = currentHour/12 + .3
        } else if (currentHour >= 20) {
            currentHour = currentHour % 12
            directionalLight.intensity = currentHour/12
        } else {
            directionalLight.intensity = currentHour/12
        }
    })

    socket.on('sendPlayerData', (player) => {
        instantiatePlayer(player.id, player.username, player.shape, player.color, player.position)
    })

    // Client-Side Message Sent To Game Server
    let sendMessageButton = document.getElementById('sendUserMessage')
    sendMessageButton.addEventListener('click', async () => {  
        let userInput = document.getElementById('userMessage')
        let userMessage = String(userInput.value)
        if(userMessage) {
            userInput.value = ''
            socket.emit('sendGlobalUserMessage', userMessage);
        } else {
            console.log('Message could not be sent!')
        }
    })

    // Client-Side Message Recieved From The Game Server
    let chatlog = document.getElementById('messagesLog')
    socket.on('recieveGlobalUserMessage', (message, id, username) => {
        let textArea = `[${username}]: ${message}`
        chatlog.value += textArea + '\n'
    
        const player = playersInScene[id]
        if (!player) {
            console.warn(`Player with ID ${id} not found.`)
            return
        }
        chatBubble(player, message)
    })
    

    //Update other player's position on screen
    socket.on('broadcastPlayerPosition', (movementData) => {
        let currPosition = {x: playersInScene[movementData.id].x, y: playersInScene[movementData.id].y, z: playersInScene[movementData.id].z}
        
        movementSystem.masterMovement(movementData.id, currPosition, movementData.position)
   
    })

    //Remove players from mesh that have disconnected
    socket.on('userDisconnected', (id) => {
        const disconnectedPlayer = playersInScene[id];
        if (disconnectedPlayer) {
            scene.remove(disconnectedPlayer.mesh);
            disconnectedPlayer.mesh.geometry.dispose();
            disconnectedPlayer.mesh.material.dispose();
            delete playersInScene[id];
            movementSystem.updateSceneAndPlayers(scene, playersInScene)
            console.log(`Player instance with id ${id} removed from scene.`);
        } else {
            console.warn(`Player with id ${id} not found in playersInScene.`);
        }
    })

    // Animation Loop
    animate();
})