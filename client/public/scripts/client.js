import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import Movement from './Movement.js'

import TicTacToe from './ticTacToe.js'

import Typing from './typing.js'

// Make THREE available globally for other scripts
window.THREE = THREE

window.TicTacToe = TicTacToe

window.Typing = Typing

var inTTTGame = false

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
// Initial camera position (overview mode default)
camera.position.x = 0
camera.position.y = 20
camera.position.z = 25
camera.rotation.x = -0.5

// Camera mode: 'follow' or 'overview'
let cameraMode = 'follow'
let localPlayerId = null
let orbitControls = null

// Adding A Floorplane To The Three.js Scene
const gameWindow = document.getElementById('gameWindow')

// Initialize canvas size - use a function to ensure proper dimensions
function initializeCanvas() {
    if (gameWindow) {
        const width = gameWindow.clientWidth || 800
        const height = gameWindow.clientHeight || 600
        renderer.setSize(width, height)
        if (!gameWindow.contains(renderer.domElement)) {
            gameWindow.appendChild(renderer.domElement)
        }
    }
}

// Try to initialize immediately, but also on DOM ready
if (gameWindow && gameWindow.clientWidth > 0 && gameWindow.clientHeight > 0) {
    initializeCanvas()
}

// Mesh Groups Of Level
const floors = new THREE.Group()
const objects = new THREE.Group()
const transitions = new THREE.Group()

// Lighting 
const ambientLight = new THREE.AmbientLight(0x404040)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(5, 10, 3)
//const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5)

renderer.shadowMap.enabled = true
directionalLight.castShadow = true

scene.add(ambientLight)
scene.add(directionalLight)
//scene.add(directionalLightHelper)

// Player dictionary
var playersInScene = {}
var movementSystem = new Movement(scene, objects, floors, playersInScene)

// Chat bubble DOM elements map
var chatBubbles = new Map()

// Use injected game server URL or fallback to localhost for development
const host = window.GAME_SERVER_URL || 'http://localhost:3030'

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

//TicTacToe mini-game methods

// On click of a game board square, ask server to join that board
function joinTTTBoard (boardId) {
    socket.emit('joinBoard', boardId)

    socket.on('joinBoardResponse', (response) => {

        // If there is space on the board, display it and start the game loop
        if (response.isSpace) {
            TicTacToe.hideBoards()
            TTTGameLoop(response.marker)
        }
    })
}

window.joinTTTBoard = joinTTTBoard;

// On click of a game board's "Leave Game Board" button, inform server that the
// client has left the board
function leaveTTTBoard () {
    socket.emit('leaveBoard', inTTTGame)

    TicTacToe.leaveBoard()
}

window.leaveTTTBoard = leaveTTTBoard;

// Tic-tac-toe game function
function TTTGameLoop(marker) {

    // Instantiate TicTacToe game object
    let tttGame = new TicTacToe(socket)

    tttGame.setMarker(marker)
    tttGame.generateBoard() // Generate cells on the board
    TicTacToe.showBoard() // Display board
    tttGame.disableCellClicks() // Disable the ability to click on cell's until game begins

    tttGame.setGameInfoMessage('Waiting for opponent')

    console.log('Socket marker is ', tttGame.marker)

    // Upon message from server, begin game
    // Player with Marker 'X' gets the first turn
    socket.on('startGame', (opponentName) => {

        inTTTGame = true

        tttGame.setOpponentName(opponentName)

        if (marker == 'X') {
            tttGame.turn = true
            tttGame.enableCellClicks()
            tttGame.setGameInfoMessage('Game is active: Your turn')
        } else {
            tttGame.setGameInfoMessage(`Game is active: ${tttGame.opponentName}'s turn`)
        }
    })

    // Update board based on opponent's move
    socket.on('opponentMove', (moveData) => {
        tttGame.oppentCheckCell(moveData)
    })

    // If opponent has forfeited, disable board interactivity and add winning message
    socket.on('opponentLeft', (leaveMessage) => {
        inTTTGame = false
        tttGame.disableCellClicks()
        tttGame.setGameInfoMessage(leaveMessage)
    })

    // If the game has ended in a victory for either player or a tie, disable board
    // interactivity and add the end game message
    socket.on('endGame', (endGameData) => {

        inTTTGame = false
        
        if (endGameData.tieGame) {
            tttGame.setGameInfoMessage(endGameData.message)
        } else {
            tttGame.highlight(endGameData.winCombo, endGameData.comboColor)
            tttGame.setGameInfoMessage(endGameData.message)
            tttGame.disableCellClicks()
        }
    })
    
}

//Typing mini-game functions

function typeQuote(quoteSize) {

    Typing.hideTypingOptions()

    let typingGame = new Typing(socket)

    typingGame.requestQuote(quoteSize)

    socket.on('sendQuote', (quoteData) => {
        //console.log(quoteData)

        typingGame.loadQuote(quoteData)

        typingGame.typeInput()
    })

    Typing.showInterface()

}

window.typeQuote = typeQuote

// Movement throttling to reduce network overhead
let lastMovementTime = 0
const MOVEMENT_THROTTLE_MS = 50 // Send movement updates max every 50ms
let pendingMovement = null
let isMouseDown = false
let currentMovementPromise = null

function handleMovement(point) {
    const now = Date.now()
    
    // Store the latest movement target
    pendingMovement = point
    
    // Throttle network updates
    if (now - lastMovementTime >= MOVEMENT_THROTTLE_MS) {
        if (pendingMovement) {
            socket.emit('updatePlayerPosition', pendingMovement)
            pendingMovement = null
            lastMovementTime = now
        }
    }
}

function onMouseClick(event) {
    mouse.x = ((event.clientX - gameWindow.getBoundingClientRect().left) / gameWindow.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - gameWindow.getBoundingClientRect().top) / gameWindow.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera)

    // Check transitions first - they take priority
    // First try direct mesh intersection
    let intersectsTransitions = raycaster.intersectObjects(transitions.children, true)
    
    // If no direct hit, check if ray passes through any transition's bounding box
    // This makes the entire door clickable, not just where the mesh surface is
    if (intersectsTransitions.length === 0) {
        const ray = raycaster.ray
        const transitionHits = []
        
        transitions.children.forEach(transition => {
            if (transition.userData.transition) {
                // Get bounding box in world space
                transition.updateMatrixWorld(true)
                const box = new THREE.Box3().setFromObject(transition)
                // Check if ray intersects the bounding box
                const intersectionPoint = new THREE.Vector3()
                const isIntersecting = ray.intersectBox(box, intersectionPoint)
                if (isIntersecting) {
                    // Create a fake intersection result
                    transitionHits.push({
                        object: transition,
                        distance: camera.position.distanceTo(intersectionPoint),
                        point: intersectionPoint
                    })
                }
            }
        })
        
        // Sort by distance to get closest
        transitionHits.sort((a, b) => a.distance - b.distance)
        intersectsTransitions = transitionHits
    }
    
    if (intersectsTransitions.length > 0) {
        const onClick = intersectsTransitions[0].object.userData.transition

        // For Client Side On-Clicks
        if (onClick == "loadTypeRacer") {
            Typing.showTypingOptions()
        } else if (onClick == "loadTicTacToe") {
            TicTacToe.showBoards()
        } else {
            socket.emit(onClick)
        }
        return
    }

    // Check objects - if clicking an object, don't move
    const intersectsObjects = raycaster.intersectObjects(objects.children, true)
    if (intersectsObjects.length > 0) {
        // Clicked on an object, don't do movement
        return
    }

    // Check floors for movement
    const intersectsFloors = raycaster.intersectObjects(floors.children, true)
    if (intersectsFloors.length > 0) {
        const point = intersectsFloors[0].point
        if (point) {
            handleMovement(point)
        }
    }
}

function onMouseMove(event) {
    if (!isMouseDown) return
    
    mouse.x = ((event.clientX - gameWindow.getBoundingClientRect().left) / gameWindow.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - gameWindow.getBoundingClientRect().top) / gameWindow.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera)

    // Only check floors for continuous movement
    const intersectsFloors = raycaster.intersectObjects(floors.children)
    if (intersectsFloors.length > 0) {
        const point = intersectsFloors[0].point
        if (point) {
            handleMovement(point)
        }
    }
}

function onMouseDown(event) {
    // Only handle left mouse button for movement
    if (event.button === 0) { // Left mouse button
        isMouseDown = true
        onMouseClick(event) // Handle initial click
    }
}

function onMouseUp(event) {
    // Only handle left mouse button for movement
    if (event.button === 0) { // Left mouse button
        isMouseDown = false
        pendingMovement = null // Clear any pending movement
    }
}

function updateChatBubblePositions() {
    // Update positions of all chat bubbles based on player positions
    chatBubbles.forEach((bubbleData, playerId) => {
        const player = bubbleData.player
        if (!player || !player.mesh) return
        
        // Get player's world position
        const worldPosition = new THREE.Vector3()
        player.mesh.getWorldPosition(worldPosition)
        
        // Project 3D position to 2D screen coordinates
        worldPosition.y += 2 // Offset above player
        const vector = worldPosition.project(camera)
        
        // Convert normalized device coordinates to screen coordinates
        const x = (vector.x * 0.5 + 0.5) * gameWindow.clientWidth
        const y = (vector.y * -0.5 + 0.5) * gameWindow.clientHeight
        
        // Update bubble position
        const bubble = bubbleData.element
        bubble.style.left = x + 'px'
        bubble.style.top = y + 'px'
        bubble.style.transform = 'translate(-50%, -100%)'
        
        // Hide if behind camera or too far
        if (vector.z > 1 || vector.z < -1) {
            bubble.style.display = 'none'
        } else {
            bubble.style.display = 'block'
        }
    })
}

function animate() {
    renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight)
    
    // In follow mode, update OrbitControls target to player position
    // This allows the camera to orbit around the player while letting users control zoom/position
    if (cameraMode === 'follow' && localPlayerId && playersInScene[localPlayerId]) {
        const player = playersInScene[localPlayerId]
        
        // Update OrbitControls target to player position in follow mode
        // This makes the camera orbit around the player, but doesn't reset camera position
        if (orbitControls && orbitControls.enabled) {
            // Smoothly update the target to follow the player
            orbitControls.target.x += (player.x - orbitControls.target.x) * 0.1
            orbitControls.target.y += (player.y - orbitControls.target.y) * 0.1
            orbitControls.target.z += (player.z - orbitControls.target.z) * 0.1
        }
    }
    
    // Update orbit controls if enabled
    // OrbitControls handles all camera positioning when enabled
    if (orbitControls && orbitControls.enabled) {
        orbitControls.update()
    }
    
    // Update chat bubble positions
    updateChatBubblePositions()
    
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
    // Remove existing chat bubble for this player if any
    if (chatBubbles.has(player.id)) {
        const existingBubble = chatBubbles.get(player.id)
        if (existingBubble.element && existingBubble.element.parentNode) {
            existingBubble.element.parentNode.removeChild(existingBubble.element)
        }
        if (existingBubble.timeout) {
            clearTimeout(existingBubble.timeout)
        }
    }

    // Create DOM element for chat bubble
    const bubbleElement = document.createElement('div')
    bubbleElement.className = 'chat-bubble'
    bubbleElement.textContent = message
    
    // Get or create chat bubbles container
    let chatContainer = document.getElementById('chatBubblesContainer')
    if (!chatContainer) {
        chatContainer = document.createElement('div')
        chatContainer.id = 'chatBubblesContainer'
        chatContainer.style.position = 'absolute'
        chatContainer.style.top = '0'
        chatContainer.style.left = '0'
        chatContainer.style.width = '100%'
        chatContainer.style.height = '100%'
        chatContainer.style.pointerEvents = 'none'
        chatContainer.style.zIndex = '1000'
        gameWindow.appendChild(chatContainer)
    }
    
    chatContainer.appendChild(bubbleElement)
    
    // Store bubble reference
    const timeout = setTimeout(() => {
        if (bubbleElement.parentNode) {
            bubbleElement.parentNode.removeChild(bubbleElement)
        }
        chatBubbles.delete(player.id)
    }, 7000)
    
    chatBubbles.set(player.id, {
        element: bubbleElement,
        player: player,
        timeout: timeout
    })
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
    '[': () => {
        TicTacToe.showBoards()
    },
    ']': () => {
        Typing.showTypingOptions()
    },
    '-': () => {
        console.log('Decreasing Sunlight Intensity')
        directionalLight.intensity -= 0.1
    },
    '=': () => {
        console.log('Increasing Sunlight Intensity')
        directionalLight.intensity += 0.1
    },
    'ArrowUp': () => {
        console.log('Moving Camera')
        camera.position.z -= 0.5
    },
    'ArrowDown': () => {
        console.log('Moving Camera')
        camera.position.z += 0.5
    },
    'ArrowLeft': () => {
        console.log('Moving Camera')
        camera.position.x -= 0.5
    },
    'ArrowRight': () => {
        console.log('Moving Camera')
        camera.position.x += 0.5
    },
    'Tab': () => {
        console.log('Moving Camera')
        camera.position.y -= 0.5
    },
    '`': () => {
        console.log('Moving Camera')
        camera.position.y += 0.5
    },
    '7': () => {
        console.log('Rotating Camera')
        camera.rotation.x += Math.PI/6
    },
    '8': () => {
        console.log('Rotating Camera')
        camera.rotation.y += Math.PI/6
    },
    '9': () => {
        console.log('Rotating Camera')
        camera.rotation.z += Math.PI/6
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure canvas is properly initialized with correct dimensions
    initializeCanvas()
    
    // Handle window resize
    window.addEventListener('resize', () => {
        initializeCanvas()
        if (orbitControls) {
            orbitControls.handleResize()
        }
    })
    
    // Initialize OrbitControls - always enabled, uses right mouse button
    try {
        orbitControls = new OrbitControls(camera, renderer.domElement)
        orbitControls.enableDamping = true // Smooth camera movement
        orbitControls.dampingFactor = 0.05
        orbitControls.enableZoom = true
        orbitControls.enablePan = true
        orbitControls.minDistance = 5
        orbitControls.maxDistance = 100
        orbitControls.maxPolarAngle = Math.PI / 2 // Prevent camera from going below ground
        
        // Configure to use right mouse button for rotation
        orbitControls.mouseButtons = {
            LEFT: null, // Disable left mouse button (we use it for movement)
            MIDDLE: THREE.MOUSE.DOLLY, // Middle mouse for zoom
            RIGHT: THREE.MOUSE.ROTATE // Right mouse for rotation
        }
        
        // Enable pan with right mouse + shift
        orbitControls.panSpeed = 1.0
        
        // Always enabled - works in both modes
        orbitControls.enabled = true
        console.log('OrbitControls initialized successfully')
    } catch (error) {
        console.error('Failed to initialize OrbitControls:', error)
    }
    
    // Camera toggle button
    const cameraToggle = document.getElementById('cameraToggle')
    if (cameraToggle) {
        // Set initial state based on default mode
        if (cameraMode === 'follow') {
            cameraToggle.textContent = '🌐'
            cameraToggle.title = 'Switch to Overview Camera'
        } else {
            cameraToggle.textContent = '📷'
            cameraToggle.title = 'Switch to Follow Camera'
        }
        
        cameraToggle.addEventListener('click', () => {
            if (cameraMode === 'follow') {
                // Switch to overview mode
                cameraMode = 'overview'
                // Move camera forward for better overview
                camera.position.x = 0
                camera.position.y = 20
                camera.position.z = 25
                camera.rotation.x = -0.5
                camera.rotation.y = 0
                camera.rotation.z = 0
                
                // Update orbit controls target to center of scene
                if (orbitControls) {
                    orbitControls.target.set(0, 0, 0)
                    orbitControls.update()
                }
                
                cameraToggle.textContent = '📷'
                cameraToggle.title = 'Switch to Follow Camera'
            } else {
                // Switch to follow mode
                cameraMode = 'follow'
                
                // Set OrbitControls target to player position if available
                if (orbitControls && localPlayerId && playersInScene[localPlayerId]) {
                    const player = playersInScene[localPlayerId]
                    orbitControls.target.set(player.x, player.y, player.z)
                    // Set initial camera position behind and above player (but user can adjust)
                    const offsetX = 0
                    const offsetY = 3
                    const offsetZ = 5
                    camera.position.set(
                        player.x + offsetX,
                        player.y + offsetY,
                        player.z + offsetZ
                    )
                    orbitControls.update()
                }
                
                cameraToggle.textContent = '🌐'
                cameraToggle.title = 'Switch to Overview Camera'
            }
        })
    }
    
    // Mouse event listeners for click and drag movement
    gameWindow.addEventListener('mousedown', onMouseDown)
    gameWindow.addEventListener('mousemove', onMouseMove)
    gameWindow.addEventListener('mouseup', onMouseUp)
    gameWindow.addEventListener('mouseleave', onMouseUp) // Stop dragging if mouse leaves window
    
    // Prevent context menu on right-click for OrbitControls
    gameWindow.addEventListener('contextmenu', (event) => {
        event.preventDefault()
    })

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

            if (object.material) {
                textureLoader.load(
                    `${host}/textures/${object.material}`, 
                    (texture) => {
                        Material = new THREE.MeshStandardMaterial({ map: texture })
                        console.log(`${object.material} loaded.`)
                        let Mesh = new THREE.Mesh(Geometry, Material)
                        Mesh.position.set(object.position.x, object.position.y, object.position.z)
                        Mesh.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z)
                        objects.add(Mesh)
                    },
                    (error) => { 
                        console.log(`Could not find ${object.material} in texture set.`) 
                    }
                )
            } else {
                // If no material is provided, use the default colour
                let Mesh = new THREE.Mesh(Geometry, Material)
                Mesh.position.set(object.position.x, object.position.y, object.position.z)
                Mesh.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z)
                objects.add(Mesh)
            }
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

        // Reinitalize playersInScene and movementSystem
        playersInScene = {}
        movementSystem.updateSceneAndPlayers(scene, playersInScene)
        
        // Clean up all chat bubbles when scene changes
        chatBubbles.forEach((bubbleData) => {
            if (bubbleData.timeout) {
                clearTimeout(bubbleData.timeout)
            }
            if (bubbleData.element && bubbleData.element.parentNode) {
                bubbleData.element.parentNode.removeChild(bubbleData.element)
            }
        })
        chatBubbles.clear()
    })

    socket.on('sendWorldTime', (date) => {
        let gameServerTime = new Date(date)
        // Format as "hh:mm AM/PM" (no seconds)
        let hours = gameServerTime.getHours()
        let minutes = gameServerTime.getMinutes()
        let ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12
        hours = hours ? hours : 12 // 0 should be 12
        minutes = minutes < 10 ? '0' + minutes : minutes
        let gameServerTimeString = `${hours}:${minutes} ${ampm}`
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

    // Track which player we control by monitoring position updates
    let positionUpdateHandler = null
    
    socket.on('sendPlayerData', (player) => {
        instantiatePlayer(player.id, player.username, player.shape, player.color, player.position)
        console.log(`${player.username} added to my scene`)
        
        // Set local player ID on first player received (usually ourselves)
        if (!localPlayerId) {
            localPlayerId = player.id
            console.log(`Local player ID set to: ${localPlayerId}`)
            // Set initial camera position in follow mode when player first loads
            if (cameraMode === 'follow' && orbitControls && orbitControls.enabled) {
                const offsetX = 0
                const offsetY = 3
                const offsetZ = 5
                camera.position.set(
                    player.position.x + offsetX,
                    player.position.y + offsetY,
                    player.position.z + offsetZ
                )
                orbitControls.target.set(player.position.x, player.position.y, player.position.z)
                orbitControls.update()
            }
        }
    })
    
    // Refine local player detection when we move - track which player moves
    const originalEmit = socket.emit.bind(socket)
    socket.emit = function(event, ...args) {
        if (event === 'updatePlayerPosition' && !localPlayerId) {
            // If we don't have a local player ID yet, find the closest player to clicked point
            const clickedPoint = args[0]
            let closestPlayer = null
            let closestDistance = Infinity
            
            for (const [id, player] of Object.entries(playersInScene)) {
                const distance = Math.sqrt(
                    Math.pow(player.x - clickedPoint.x, 2) +
                    Math.pow(player.z - clickedPoint.z, 2)
                )
                if (distance < closestDistance) {
                    closestDistance = distance
                    closestPlayer = id
                }
            }
            
            if (closestPlayer) {
                localPlayerId = closestPlayer
                console.log(`Local player ID identified: ${localPlayerId}`)
            }
        }
        return originalEmit(event, ...args)
    }

    // Client-Side Message Sent To Game Server
    let sendMessageButton = document.getElementById('sendUserMessage')
    let userInput = document.getElementById('userMessage')
    
    // Function to send message
    function sendMessage() {
        let userMessage = String(userInput.value).trim()
        if(userMessage) {
            userInput.value = ''
            socket.emit('sendGlobalUserMessage', userMessage);
            // Keep focus on input field
            userInput.focus()
        } else {
            console.log('Message could not be sent!')
        }
    }
    
    // Send button click
    sendMessageButton.addEventListener('click', sendMessage)
    
    // Enter key to send message
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            sendMessage()
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
        
        // Cancel previous movement if new one comes in (optimization)
        // The movement system will handle this internally via async cancellation
        movementSystem.masterMovement(movementData.id, currPosition, movementData.position)
    })
    
    // Throttled movement update interval - sends pending movements periodically
    setInterval(() => {
        if (pendingMovement) {
            socket.emit('updatePlayerPosition', pendingMovement)
            pendingMovement = null
            lastMovementTime = Date.now()
        }
    }, MOVEMENT_THROTTLE_MS)

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
        
        // Remove chat bubble if exists
        if (chatBubbles.has(id)) {
            const bubbleData = chatBubbles.get(id)
            if (bubbleData.timeout) {
                clearTimeout(bubbleData.timeout)
            }
            if (bubbleData.element && bubbleData.element.parentNode) {
                bubbleData.element.parentNode.removeChild(bubbleData.element)
            }
            chatBubbles.delete(id)
        }
    })

    // Update a board's description
    socket.on('updateBoard', (updateData) => {
        TicTacToe.updateBoardDescription(updateData)
    })

    // Lock a board to prevent the client attempting to join it
    socket.on('lockBoard', (boardId) => {
        TicTacToe.lockBoard(boardId)
    })

    // Unlock a board to renable the ability for the client to join it
    socket.on('unlockBoard', (boardId) => {
        console.log('Unlocking board ', boardId)
        TicTacToe.unlockBoard(boardId)
    })

    // Animation Loop
    animate();
})