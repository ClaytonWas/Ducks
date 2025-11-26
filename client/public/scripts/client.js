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

// Local player ID will be set by the server when we connect
// This avoids needing to decode the JWT client-side

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

// Function to initialize camera for local player (called when we have both ID and player data)
// Defined outside socket handlers so it's accessible everywhere
function initializeLocalPlayerCamera() {
    console.log('initializeLocalPlayerCamera called:', {
        localPlayerId,
        hasPlayer: localPlayerId && playersInScene[localPlayerId],
        cameraMode,
        hasOrbitControls: !!orbitControls,
        orbitControlsEnabled: orbitControls && orbitControls.enabled
    })
    
    if (!localPlayerId) {
        console.log('No localPlayerId yet')
        return false
    }
    
    if (!playersInScene[localPlayerId]) {
        console.log('Player not in scene yet')
        return false
    }
    
    if (cameraMode !== 'follow') {
        console.log('Camera mode is not follow:', cameraMode)
        return false
    }
    
    if (!orbitControls) {
        console.log('OrbitControls not initialized yet')
        return false
    }
    
    const player = playersInScene[localPlayerId]
    const offsetX = 0
    const offsetY = 3
    const offsetZ = 5
    
    camera.position.set(
        player.x + offsetX,
        player.y + offsetY,
        player.z + offsetZ
    )
    orbitControls.target.set(player.x, player.y, player.z)
    orbitControls.update()
    console.log(`Camera initialized for local player: ${localPlayerId} at position (${player.x}, ${player.y}, ${player.z})`)
    return true
}

socket.on('welcome', (message) => {
    console.log(message)
})

// Receive our player ID from the server (more reliable than decoding JWT)
socket.on('yourPlayerId', (playerId) => {
    localPlayerId = playerId
    console.log(`Local player ID received from server: ${localPlayerId}`)
    // Try to initialize camera if player data already exists
    // Use setTimeout to ensure orbitControls might be initialized
    setTimeout(() => {
        initializeLocalPlayerCamera()
    }, 200)
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
let lastContinuousMovementTime = 0
const CONTINUOUS_MOVEMENT_THROTTLE_MS = 100 // Throttle continuous movement to every 100ms

function handleMovement(point, isContinuousMovement = false) {
    const now = Date.now()
    
    // Store the latest movement target (always update to latest)
    pendingMovement = point
    
    // Immediately move local player client-side for responsiveness (client-side prediction)
    if (localPlayerId && playersInScene[localPlayerId]) {
        const player = playersInScene[localPlayerId]
        const currentPos = {x: player.x, y: player.y, z: player.z}
        const distance = Math.sqrt(
            Math.pow(point.x - currentPos.x, 2) + 
            Math.pow(point.z - currentPos.z, 2)
        )
        
        // For continuous movement, use very simple direct movement (no pathfinding)
        if (isContinuousMovement) {
            // Throttle continuous movement updates
            if (now - lastContinuousMovementTime < CONTINUOUS_MOVEMENT_THROTTLE_MS) {
                return
            }
            lastContinuousMovementTime = now
            
            // Skip if distance is too small (performance optimization - avoid unnecessary work)
            if (distance < 0.1) {
                // Don't send update for tiny movements - save network bandwidth
                // Only send if this is a NEW target (different from last sent target)
                // This prevents spam while still keeping server updated on actual movement changes
                pendingMovement = null
                return
            }
            
            // For continuous movement, just use simple steering (it will handle obstacles)
            movementSystem.masterMovement(localPlayerId, currentPos, point, true)
        } else {
            // Single click: use full A* pathfinding
            // Cancel any previous movement when starting a new one
            
            // For single clicks, always send to server (even if movement is skipped)
            // This ensures server knows about new movement targets, preventing stale positions
            // But only if distance is meaningful (avoid spam for clicks on self)
            if (distance >= 0.1) {
                // Normal movement - will be sent via throttled update below
                movementSystem.masterMovement(localPlayerId, currentPos, point, false)
            } else {
                // Very small movement - send current position to sync server, then clear
                // This prevents server from having stale target when user clicks elsewhere
                if (now - lastMovementTime >= MOVEMENT_THROTTLE_MS) {
                    socket.emit('updatePlayerPosition', currentPos)
                    lastMovementTime = now
                }
                pendingMovement = null
                return
            }
        }
    }
    
    // Send movement update with throttling (performance optimization)
    // Only send if enough time has passed since last update
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

    // Check in priority order: transitions first, then objects, then floors
    // This ensures we check the most important things first
    
    // 1. Check transitions first (they take priority)
    let intersectsTransitions = raycaster.intersectObjects(transitions.children, false)
    if (intersectsTransitions.length > 0) {
        const hitObject = intersectsTransitions[0].object
        if (hitObject.userData && hitObject.userData.transition) {
            const onClick = hitObject.userData.transition
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
    }
    
    // 2. Check objects - if ANY object is hit (with or without onClick), handle it
    let intersectsObjects = raycaster.intersectObjects(objects.children, false)
    if (intersectsObjects.length > 0) {
        const hitObject = intersectsObjects[0].object
        
        // If object has onClick, execute it
        if (hitObject.userData && hitObject.userData.onClick) {
            const onClick = hitObject.userData.onClick
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
        
        // Object has no onClick - do nothing, block all movement
        return
    }
    
    // 3. Only check floors if no objects were hit
    // This prevents movement when clicking through objects
    let intersectsFloors = raycaster.intersectObjects(floors.children, false)
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
            // Use simple steering for continuous movement (much faster than A*)
            handleMovement(point, true)
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
    // WOW-style: User controls camera angle and distance, camera target follows player
    if (cameraMode === 'follow' && localPlayerId && playersInScene[localPlayerId]) {
        const player = playersInScene[localPlayerId]
        
        // Update OrbitControls target to player position in follow mode
        // This makes the camera orbit around the player, but doesn't reset camera position/angle
        if (orbitControls && orbitControls.enabled) {
            // Smoothly update the target to follow the player
            // This allows the camera to orbit around the player from any angle
            const targetLerpFactor = 0.1
            orbitControls.target.x += (player.x - orbitControls.target.x) * targetLerpFactor
            orbitControls.target.y += (player.y - orbitControls.target.y) * targetLerpFactor
            orbitControls.target.z += (player.z - orbitControls.target.z) * targetLerpFactor
            
            // Don't force camera position - let user control it freely with orbit controls
            // The target will follow the player, but camera angle/distance is user-controlled
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
    // Remove existing player if it exists (prevents ghosting)
    if (playersInScene[id]) {
        const existingPlayer = playersInScene[id]
        scene.remove(existingPlayer.mesh)
        if (existingPlayer.mesh.geometry) {
            existingPlayer.mesh.geometry.dispose()
        }
        if (existingPlayer.mesh.material) {
            existingPlayer.mesh.material.dispose()
        }
        delete playersInScene[id]
    }
    
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
        // OrbitControls automatically handles resize, no need to call handleResize
    })
    
    // Initialize OrbitControls - always enabled, uses right mouse button
    try {
        orbitControls = new OrbitControls(camera, renderer.domElement)
        orbitControls.enableDamping = true // Smooth camera movement
        orbitControls.dampingFactor = 0.05
        orbitControls.enableZoom = true
        orbitControls.enablePan = true
        orbitControls.minDistance = 2 // Allow zooming in close
        orbitControls.maxDistance = 500 // Allow zooming much further out (WOW-style)
        orbitControls.maxPolarAngle = Math.PI // Allow full 360 degree rotation (WOW-style)
        orbitControls.minPolarAngle = 0 // Allow looking straight up and down
        
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
        
        // Try to initialize camera for local player if data is already available
        if (localPlayerId && playersInScene[localPlayerId] && cameraMode === 'follow') {
            setTimeout(() => {
                initializeLocalPlayerCamera()
            }, 100)
        }
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
                console.log('Switching to follow mode, localPlayerId:', localPlayerId, 'playersInScene keys:', Object.keys(playersInScene))
                
                // Function to initialize camera to follow player
                const tryInitializeFollow = () => {
                    let playerToFollow = null
                    let playerIdToFollow = localPlayerId
                    
                    // If we have localPlayerId, use it
                    if (localPlayerId && playersInScene[localPlayerId]) {
                        playerToFollow = playersInScene[localPlayerId]
                    } else {
                        // Otherwise, try to find any player in the scene (fallback)
                        const playerIds = Object.keys(playersInScene)
                        if (playerIds.length > 0) {
                            playerIdToFollow = playerIds[0]
                            playerToFollow = playersInScene[playerIdToFollow]
                            console.log('Using fallback player:', playerIdToFollow)
                        }
                    }
                    
                    if (playerToFollow && orbitControls) {
                        // Set initial camera position behind player (user can change it)
                        const offsetX = 0
                        const offsetY = 3
                        const offsetZ = 5
                        camera.position.set(
                            playerToFollow.x + offsetX,
                            playerToFollow.y + offsetY,
                            playerToFollow.z + offsetZ
                        )
                        // Set target to player - user can then orbit/zoom freely
                        orbitControls.target.set(playerToFollow.x, playerToFollow.y, playerToFollow.z)
                        orbitControls.update()
                        console.log('Camera set to follow player via button (WOW-style controls enabled)')
                        return true
                    }
                    return false
                }
                
                // Try immediately
                if (!tryInitializeFollow()) {
                    // If not available, wait a bit and try again
                    console.log('Player data not ready, waiting...')
                    setTimeout(() => {
                        if (!tryInitializeFollow()) {
                            console.warn('Could not initialize follow camera - missing data:', {
                                localPlayerId,
                                hasPlayer: localPlayerId && playersInScene[localPlayerId],
                                hasOrbitControls: !!orbitControls,
                                playersInScene: Object.keys(playersInScene)
                            })
                        }
                    }, 500)
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

    // Geometry and Material caches for performance (MMO-style optimization)
    const geometryCache = new Map() // Reuse geometries for same-sized objects
    const materialCache = new Map() // Reuse materials for same textures/colors
    
    const getGeometryKey = (type, geometry) => {
        if (type === "box") {
            return `box_${geometry.width}_${geometry.height}_${geometry.depth}`
        } else if (type === "plane") {
            return `plane_${geometry.width}_${geometry.height}`
        }
        return null
    }
    
    const getCachedGeometry = (type, geometry) => {
        const key = getGeometryKey(type, geometry)
        if (!key) return null
        
        if (!geometryCache.has(key)) {
            let newGeometry
            if (type === "box") {
                newGeometry = new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth)
            } else if (type === "plane") {
                newGeometry = new THREE.PlaneGeometry(geometry.width, geometry.height)
            }
            geometryCache.set(key, newGeometry)
        }
        return geometryCache.get(key)
    }
    
    const getCachedMaterial = (color, textureName = null, textureMap = null) => {
        // Only share materials if they have the EXACT same texture file (or same color if no texture)
        // If texture exists, use texture name as key (color is ignored when texture is present)
        // If no texture, use color as key
        const texture = textureName && textureMap ? textureMap.get(textureName) : null
        const key = texture ? `tex_${textureName}` : `col_${color}`
        
        if (!materialCache.has(key)) {
            const material = texture 
                ? new THREE.MeshStandardMaterial({ map: texture })
                : new THREE.MeshStandardMaterial({ color: color })
            materialCache.set(key, material)
        }
        return materialCache.get(key)
    }

    socket.on('recieveWorldData', (world) => {
        emptyGroup(floors)
        emptyGroup(objects)
        emptyGroup(transitions)
        
        // Clear material cache when loading new scene (textures might change)
        materialCache.clear()
        
        let textureLoader = new THREE.TextureLoader()
        let floorData = world.floors
        let objectData = world.objects
        let transitionsData = world.transitions
        
        // Pre-load all textures first (MMO-style: load assets before creating meshes)
        const texturePromises = new Map()
        const allTextures = new Set()
        
        floorData.forEach(floor => {
            if (floor.material) allTextures.add(floor.material)
        })
        objectData.forEach(object => {
            if (object.material) allTextures.add(object.material)
        })
        transitionsData.forEach(transition => {
            if (transition.material) allTextures.add(transition.material)
        })
        
        // Load all textures in parallel
        allTextures.forEach(textureName => {
            const promise = new Promise((resolve) => {
                textureLoader.load(
                    `${host}/textures/${textureName}`,
                    (texture) => resolve({ name: textureName, texture: texture }),
                    undefined,
                    (error) => {
                        console.log(`Could not find ${textureName} in texture set.`)
                        resolve({ name: textureName, texture: null })
                    }
                )
            })
            texturePromises.set(textureName, promise)
        })
        
        // Wait for all textures to load, then create meshes progressively
        Promise.all(Array.from(texturePromises.values())).then((textureResults) => {
            const textureMap = new Map()
            textureResults.forEach(result => {
                if (result.texture) {
                    textureMap.set(result.name, result.texture)
                }
            })
            
            // Create meshes progressively using requestAnimationFrame (prevents blocking)
            let itemIndex = 0
            const allItems = [
                ...floorData.map(item => ({ type: 'floor', data: item })),
                ...objectData.map(item => ({ type: 'object', data: item })),
                ...transitionsData.map(item => ({ type: 'transition', data: item }))
            ]
            
            const createNextBatch = () => {
                const batchSize = 5 // Create 5 meshes per frame
                const endIndex = Math.min(itemIndex + batchSize, allItems.length)
                
                for (let i = itemIndex; i < endIndex; i++) {
                    const item = allItems[i]
                    
                    if (item.type === 'floor') {
                        const floor = item.data
                        const geometry = getCachedGeometry('plane', floor.geometry)
                        // Pass texture NAME (string) and textureMap so cache key is based on filename
                        const material = getCachedMaterial(floor.color, floor.material, textureMap)
                        
                        const mesh = new THREE.Mesh(geometry, material)
                        mesh.position.set(floor.position.x, floor.position.y, floor.position.z)
                        mesh.rotation.set(floor.rotation.x, floor.rotation.y, floor.rotation.z)
                        floors.add(mesh)
                    } else if (item.type === 'object') {
                        const object = item.data
                        if (object.type === "box") {
                            const geometry = getCachedGeometry('box', object.geometry)
                            // Pass texture NAME (string) and textureMap so cache key is based on filename
                            const material = getCachedMaterial(object.color, object.material, textureMap)
                            
                            const mesh = new THREE.Mesh(geometry, material)
                            mesh.position.set(object.position.x, object.position.y, object.position.z)
                            mesh.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z)
                            if (object.onClick) {
                                mesh.userData.onClick = object.onClick
                            }
                            objects.add(mesh)
                        }
                    } else if (item.type === 'transition') {
                        const transition = item.data
                        if (transition.type === "box") {
                            const geometry = getCachedGeometry('box', transition.geometry)
                            // Pass texture NAME (string) and textureMap so cache key is based on filename
                            const material = getCachedMaterial(transition.color, transition.material, textureMap)
                            
                            const mesh = new THREE.Mesh(geometry, material)
                            mesh.position.set(transition.position.x, transition.position.y, transition.position.z)
                            mesh.rotation.set(transition.rotation.x, transition.rotation.y, transition.rotation.z)
                            mesh.userData.transition = transition.onClick
                            transitions.add(mesh)
                        }
                    }
                }
                
                itemIndex = endIndex
                
                if (itemIndex < allItems.length) {
                    // Continue loading next batch on next frame
                    requestAnimationFrame(createNextBatch)
                } else {
                    // All meshes created, add groups to scene
                    scene.add(floors)
                    scene.add(objects)
                    scene.add(transitions)
                    console.log('Scene loaded with optimized geometry/material caching')
                }
            }
            
            // Start progressive loading
            createNextBatch()
        })

        // Clean up all existing players before resetting
        for (const [id, player] of Object.entries(playersInScene)) {
            scene.remove(player.mesh)
            if (player.mesh.geometry) {
                player.mesh.geometry.dispose()
            }
            if (player.mesh.material) {
                player.mesh.material.dispose()
            }
        }
        
        // Reinitalize playersInScene and movementSystem
        // NOTE: Don't reset localPlayerId - it should persist across scene changes
        // The server will re-send yourPlayerId on scene change
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
        try {
            let gameServerTime = new Date(date)
            // Format as "hh:mm AM/PM" (no seconds)
            let hours = gameServerTime.getHours()
            let minutes = gameServerTime.getMinutes()
            let ampm = hours >= 12 ? 'PM' : 'AM'
            hours = hours % 12
            hours = hours ? hours : 12 // 0 should be 12
            minutes = minutes < 10 ? '0' + minutes : minutes
            let gameServerTimeString = `${hours}:${minutes} ${ampm}`
            
            const worldDateTimeElement = document.getElementById('worldDateTime')
            if (worldDateTimeElement) {
                worldDateTimeElement.textContent = gameServerTimeString
            }

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
        } catch (error) {
            console.error('Error processing world time:', error)
            // Set a default time display if there's an error
            const worldDateTimeElement = document.getElementById('worldDateTime')
            if (worldDateTimeElement) {
                worldDateTimeElement.textContent = '--:-- --'
            }
        }
    })

    // Track which player we control by monitoring position updates
    let positionUpdateHandler = null
    
    socket.on('sendPlayerData', (player) => {
        instantiatePlayer(player.id, player.username, player.shape, player.color, player.position)
        console.log(`${player.username} added to my scene (ID: ${player.id}, localPlayerId: ${localPlayerId})`)
        
        // If this is the local player, try to initialize camera
        if (localPlayerId && player.id === localPlayerId) {
            console.log(`This is the local player! Initializing camera...`)
            // Use setTimeout to ensure orbitControls is initialized
            setTimeout(() => {
                initializeLocalPlayerCamera()
            }, 100)
        } else if (!localPlayerId) {
            console.warn(`Received player data but localPlayerId is still null. Player ID: ${player.id}`)
        }
    })
    
    // Note: We no longer need to detect local player by movement since server sends yourPlayerId

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
        // CRITICAL: Ignore position updates for the local player
        // The server broadcasts to ALL players including the sender, but we use client-side prediction
        // Applying server updates to ourselves would override our local movement and cause teleporting
        if (movementData.id === localPlayerId) {
            return // Ignore our own position updates from server
        }
        
        // Only apply server updates for other players
        if (!playersInScene[movementData.id]) {
            return // Player doesn't exist in scene
        }
        
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