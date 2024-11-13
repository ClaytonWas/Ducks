import priorityQueue from './priorityQueue.js'

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

function movePlayerUltraLegacy(playerId, point) { 

    // Check if the player exists in the scene before attempting to move
    if (playersInScene[playerId]) {
        playersInScene[playerId].mesh.position.set(point.x, point.y, point.z);
        console.log(`${playersInScene[playerId].username} moved`);
    } else {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
    }
   
}

function instantiatePlayerLegacy(id, name, position){
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

function euclidean_distance(curr_point, dest_point) {
    var dist = Math.sqrt((curr_point.x - dest_point.x)**2 + (curr_point.y - dest_point.y)**2 + (curr_point.z - dest_point.z)**2)

    return dist
}

// Function to check if a point is valid considering player dimensions
function isValidNeighbor(point, playerDimensions = { width: 1, height: 1, depth: 1 }) {
    const halfWidth = playerDimensions.width / 2;
    const halfDepth = playerDimensions.depth / 2;
    
    // Create points to check for the corners of the player's base
    const cornerPoints = [
        { x: point.x - halfWidth, y: point.y, z: point.z - halfDepth }, // back left
        { x: point.x + halfWidth, y: point.y, z: point.z - halfDepth }, // back right
        { x: point.x - halfWidth, y: point.y, z: point.z + halfDepth }, // front left
        { x: point.x + halfWidth, y: point.y, z: point.z + halfDepth }, // front right
    ];

    // Step 1: Check if all corners are above the floor
    for (const corner of cornerPoints) {
        raycaster.set(
            new THREE.Vector3(corner.x, corner.y + 1, corner.z), 
            new THREE.Vector3(0, -1, 0)
        );
        const intersectsFloor = raycaster.intersectObject(floor1Mesh);
        if (intersectsFloor.length === 0) return false;
    }

    // Step 2: Check for intersection with objects using a box
    const playerBox = new THREE.Box3(
        new THREE.Vector3(
            point.x - halfWidth,
            point.y,
            point.z - halfDepth
        ),
        new THREE.Vector3(
            point.x + halfWidth,
            point.y + playerDimensions.height,
            point.z + halfDepth
        )
    );

    // Add a small buffer to avoid being too close to objects
    const buffer = 0.1; // 10cm buffer
    playerBox.expandByScalar(buffer);

    for (let i = 0; i < objects.children.length; i++) {
        const object = objects.children[i];
        const objectBox = new THREE.Box3().setFromObject(object);
        
        if (playerBox.intersectsBox(objectBox)) {
            return false;
        }
    }

    return true;
}

function get_neighbors(currPoint, inc = 0.15, playerDimensions = { width: 1, height: 1, depth: 1 }) {
    // Increase increment slightly to account for player size
    const effectiveInc = Math.max(inc, playerDimensions.width / 4);
    const increments = [0, -effectiveInc, effectiveInc];
    let validNeighbors = [];

    // Calculate minimum distance from obstacles based on player size
    const minDistance = Math.max(playerDimensions.width, playerDimensions.depth) / 2 + 0.2; // Add 20cm safety margin

    for (let xInc of increments) {
        for (let zInc of increments) { // Removed Y increment since we're moving on a floor
            // Avoid the original point
            if (xInc !== 0 || zInc !== 0) {
                const neighborPoint = {
                    x: currPoint.x + xInc,
                    y: currPoint.y, // Keep the same Y level
                    z: currPoint.z + zInc
                };
                
                if (isValidNeighbor(neighborPoint, playerDimensions)) {
                    // Additional check for minimum distance from all objects
                    let isFarEnough = true;
                    const neighborVector = new THREE.Vector3(
                        neighborPoint.x,
                        neighborPoint.y,
                        neighborPoint.z
                    );

                    for (let obj of objects.children) {
                        const objBox = new THREE.Box3().setFromObject(obj);
                        const closestPoint = new THREE.Vector3();
                        objBox.clampPoint(neighborVector, closestPoint);
                        
                        const distance = neighborVector.distanceTo(closestPoint);
                        if (distance < minDistance) {
                            isFarEnough = false;
                            break;
                        }
                    }

                    if (isFarEnough) {
                        validNeighbors.push(neighborPoint);
                    }
                }
            }
        }
    }

    return validNeighbors;
}

// Helper function to check if a point is on the floor and not intersecting any objects
function isValidNeighborLegacy(point) {
    // Step 1: Check if point is on the floor using raycasting
    raycaster.set(new THREE.Vector3(point.x, point.y + 1, point.z), new THREE.Vector3(0, -1, 0));
    const intersectsFloor = raycaster.intersectObject(floor1Mesh);
    
    // If no intersection with the floor, it's invalid
    if (intersectsFloor.length === 0) return false;

    // Step 2: Check for intersection with any objects
    for (let i = 0; i < objects.children.length; i++) {
        const object = objects.children[i];
        
        // Get the bounding box of the object if not already computed
        const box = new THREE.Box3().setFromObject(object);

        // Check if point lies within the bounding box
        if (box.containsPoint(new THREE.Vector3(point.x, point.y, point.z))) {
            return false;  // Intersects with an object
        }
    }

    // If it passed both checks, it's a valid neighbor
    return true;
}

function get_neighborsLegacy(currPoint, inc=0.15) {
    const increments = [0, -inc, inc];
    let validNeighbors = [];

    for (let xInc of increments) {
        for (let yInc of increments) {
            for (let zInc of increments) {
                // Avoid the original point
                if (xInc !== 0 || yInc !== 0 || zInc !== 0) {
                    var neighborPoint = {
                        x: currPoint.x + xInc,
                        y: currPoint.y + yInc,
                        z: currPoint.z + zInc
                    };
                    
                    if (isValidNeighbor(neighborPoint)) {
                        validNeighbors.push(neighborPoint)
                    }
                    
                }
                
            }
        }
    }

    return validNeighbors;
}   

function aStarSearch(startPoint, destPoint) {

    function movementCost(currCost, currPoint, destPoint) {

        return currCost + euclidean_distance(currPoint, destPoint)

    }

    function pointToString(point) {
        return `${point.x},${point.y},${point.z}`;
    }

    let frontier = new priorityQueue()

    frontier.add(startPoint, 0)
    
    let cameFrom = new Map()
    let costSoFar = new Map()

    //cameFrom[startPoint] = null
   //costSoFar[startPoint] = 0

    cameFrom.set(startPoint, null)
    costSoFar.set(pointToString(startPoint), 0);

    let count = 0

    while (frontier.peek() != null) {

        let currNode = frontier.remove()

        let currPoint = currNode[0]

        let currPriority = currNode[1]

        count += 1

        //console.log('Current point is ', currPoint, 'with a cost of ', costSoFar.get(pointToString(currPoint)), 
        //'distance to the target of  ', euclidean_distance(currPoint, destPoint), 'and priority of ', currPriority)

       // if (costSoFar.get(pointToString(currPoint)) > euclidean_distance(startPoint, destPoint)) {
       //     break
       // }

        //if (count == 1000) {
        //    break
        //}

        if ((euclidean_distance(currPoint, destPoint) <= 0.25) || (!detectObstaclesBool(startPoint, destPoint, objects))) {
            var destPointApprox = currPoint
            console.log('Path found')
            break
        }

        for (var neighborPoint of get_neighbors(currPoint)) {

            //console.log('Neighbor point is ', neighborPoint)
          
            let newCost = movementCost(costSoFar.get(pointToString(currPoint)), currPoint, neighborPoint)

            //console.log('Movement cost for neighbor is', newCost)

            
            //if (!(neighborPoint in costSoFar)) {
            //    console.log('foo')
            //}
            //else {
            //    console.log('bar')
            //}

            if (!costSoFar.has(pointToString(neighborPoint)) ||  newCost < costSoFar.get(pointToString(neighborPoint))) {

                costSoFar.set(pointToString(neighborPoint), newCost)

                let priority = newCost + euclidean_distance(neighborPoint, destPoint)

                frontier.add(neighborPoint, priority)

                //console.log('Added to the frontier ', neighborPoint)

                cameFrom.set(neighborPoint, currPoint)
            }

        }
    }

    let path = []
    let curr = destPointApprox

    while (curr != null) {
        path.push(curr)
        curr = cameFrom.get(curr)
    }

    path.reverse()

    return path
}

function followPath(playerId, path, destPoint, durationPerSegment = 10) {
    if (!playersInScene[playerId]) {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
        return;
    }

    const player = playersInScene[playerId];
    let currentSegment = 0;

    function moveToNextSegment() {
        if (currentSegment >= path.length - 1) {
            console.log('Reached the final destination.');

            console.log('Adjusting to final position')
            // Ensure the player reaches the exact target point at the end
            player.mesh.position.set(destPoint.x, destPoint.y, destPoint.z);
            player.x = destPoint.x;
            player.y = destPoint.y;
            player.z = destPoint.z;
            return; // Path is completed
        }

        const startPoint = path[currentSegment];
        const targetPoint = path[currentSegment + 1];

        const startX = startPoint.x;
        const startY = startPoint.y;
        const startZ = startPoint.z;

        const deltaX = targetPoint.x - startX;
        const deltaY = targetPoint.y - startY;
        const deltaZ = targetPoint.z - startZ;

        const startTime = performance.now();

        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / durationPerSegment, 1); // Normalized time (0 to 1)

            // Calculate the current position based on progress
            const incX = startX + deltaX * progress;
            const incY = startY + deltaY * progress;
            const incZ = startZ + deltaZ * progress;

            // Update the player's position
            player.mesh.position.set(incX, incY, incZ);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure the player reaches the exact target point at the end
                player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
                player.x = targetPoint.x;
                player.y = targetPoint.y;
                player.z = targetPoint.z;

                // Move to the next segment after the current one completes
                currentSegment++;
                moveToNextSegment();
            }
        }

        requestAnimationFrame(animate);
    }

    // Start the path-following animation
    moveToNextSegment();
}

function followPathOnlyConstant(playerId, path, speed = 5) {
    return new Promise((resolve) => {
        if (!playersInScene[playerId]) {
            console.error(`Player with ID ${playerId} does not exist in the scene.`);
            resolve();
            return;
        }

        const player = playersInScene[playerId];
        let currentSegment = 0;

        function moveToNextSegment() {
            if (currentSegment >= path.length - 1) {
                console.log('Reached the final destination.');
                resolve(); // Resolve the promise when the entire path is complete
                return;
            }

            const startPoint = path[currentSegment];
            const targetPoint = path[currentSegment + 1];

            const segmentDistance = euclidean_distance(startPoint, targetPoint);
            const segmentDuration = (segmentDistance / speed) * 1000;

            const startX = startPoint.x;
            const startY = startPoint.y;
            const startZ = startPoint.z;

            const deltaX = targetPoint.x - startX;
            const deltaY = targetPoint.y - startY;
            const deltaZ = targetPoint.z - startZ;

            const startTime = performance.now();

            function animate(currentTime) {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / segmentDuration, 1);

                const incX = startX + deltaX * progress;
                const incY = startY + deltaY * progress;
                const incZ = startZ + deltaZ * progress;

                player.mesh.position.set(incX, incY, incZ);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
                    player.x = targetPoint.x;
                    player.y = targetPoint.y;
                    player.z = targetPoint.z;

                    currentSegment++;
                    moveToNextSegment();
                }
            }

            requestAnimationFrame(animate);
        }

        moveToNextSegment();
    });
}

function followPathOnlyConstantLegacy(playerId, path, speed = 5) { // speed in units per second
    if (!playersInScene[playerId]) {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
        return;
    }

    const player = playersInScene[playerId];
    let currentSegment = 0;

    function moveToNextSegment() {
        if (currentSegment >= path.length - 1) {
            console.log('Reached the final destination.');
            return; // Path is completed
        }

        const startPoint = path[currentSegment];
        const targetPoint = path[currentSegment + 1];

        // Calculate segment distance and duration based on speed
        const segmentDistance = euclidean_distance(startPoint, targetPoint);
        const segmentDuration = (segmentDistance / speed) * 1000; // Convert to milliseconds

        const startX = startPoint.x;
        const startY = startPoint.y;
        const startZ = startPoint.z;

        const deltaX = targetPoint.x - startX;
        const deltaY = targetPoint.y - startY;
        const deltaZ = targetPoint.z - startZ;

        const startTime = performance.now();

        //console.log(`Starting segment ${currentSegment + 1}/${path.length - 1}`);
        //console.log(`Segment distance: ${segmentDistance.toFixed(2)} units`);
        //console.log(`Segment duration: ${segmentDuration.toFixed(2)}ms at ${speed} units/second`);

        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / segmentDuration, 1);

            // Calculate the current position based on progress
            const incX = startX + deltaX * progress;
            const incY = startY + deltaY * progress;
            const incZ = startZ + deltaZ * progress;

            // Update the player's position
            player.mesh.position.set(incX, incY, incZ);

            // Optional: Uncomment to debug current speed
            /*if (progress > 0 && progress < 1) {
                const currentPoint = {x: incX, y: incY, z: incZ};
                const distanceCovered = euclidean_distance(startPoint, currentPoint);
                const currentSpeed = (distanceCovered / elapsedTime) * 1000;
                console.log(`Current speed: ${currentSpeed.toFixed(2)} units/second`);
            }*/

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure the player reaches the exact target point at the end
                player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
                player.x = targetPoint.x;
                player.y = targetPoint.y;
                player.z = targetPoint.z;

                // Move to the next segment after the current one completes
                currentSegment++;
                moveToNextSegment();
            }
        }

        requestAnimationFrame(animate);
    }

    // Start the path-following animation
    moveToNextSegment();
}

function followPathOnly(playerId, path, durationPerSegment = 10) {
    if (!playersInScene[playerId]) {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
        return;
    }

    const player = playersInScene[playerId];
    let currentSegment = 0;

    function moveToNextSegment() {
        if (currentSegment >= path.length - 1) {
            console.log('Reached the final destination.');
            return; // Path is completed
        }

        const startPoint = path[currentSegment];
        const targetPoint = path[currentSegment + 1];

        const startX = startPoint.x;
        const startY = startPoint.y;
        const startZ = startPoint.z;

        const deltaX = targetPoint.x - startX;
        const deltaY = targetPoint.y - startY;
        const deltaZ = targetPoint.z - startZ;

        const startTime = performance.now();

        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / durationPerSegment, 1); // Normalized time (0 to 1)

            // Calculate the current position based on progress
            const incX = startX + deltaX * progress;
            const incY = startY + deltaY * progress;
            const incZ = startZ + deltaZ * progress;

            // Update the player's position
            player.mesh.position.set(incX, incY, incZ);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure the player reaches the exact target point at the end
                player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
                player.x = targetPoint.x;
                player.y = targetPoint.y;
                player.z = targetPoint.z;

                // Move to the next segment after the current one completes
                currentSegment++;
                moveToNextSegment();
            }
        }

        requestAnimationFrame(animate);
    }

    // Start the path-following animation
    moveToNextSegment();
}

// Function to detect objects in the path of a straight line using Three.js Raycaster
// Return a boolean value indicating if an obstacle was detected
function detectObstaclesBool(start, end, objectsGroup) {
    // Create a direction vector from start to end
    const direction = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z);
    
    // Set up the raycaster with the start position and direction
    raycaster.set(new THREE.Vector3(start.x, start.y, start.z), direction);

    //console.log(raycaster)
    
    // Calculate the distance between start and end
    const distance = euclidean_distance(start, end)

    // Collect all meshes in an array for raycasting
    const meshes = [];
    objectsGroup.traverse((child) => {
        if (child.isMesh) {
            meshes.push(child);
        }
    });

    //console.log(meshes)

    // Perform raycasting to detect intersections
    const intersects = raycaster.intersectObjects(meshes, true);
    
    //console.log('Intersection objects: ', intersects)

    // Filter intersections to only those within the range of the start to end line
    const filteredIntersects = intersects.filter(intersect => intersect.distance <= distance);

    //console.log('Filtered intersection objects ', filteredIntersects)

    //console.log(filteredIntersects.length > 0)

    // Return true if there are any objects detected, false otherwise
    return filteredIntersects.length > 0
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

    let startPoint = {x: startX, y: startY, z: startZ}

    console.log(`Starting point is (${startX}, ${startY}, ${startZ})`)
    console.log(`Destination point is (${targetPoint.x}, ${targetPoint.y}, ${targetPoint.z})`)
    console.log('Eculidean distance between the points is ', euclidean_distance(startPoint, targetPoint))

    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1); // Normalized time (0 to 1)

        // Calculate the current position based on progress
        const incX = startX + deltaX * progress;
        const incZ = startZ + deltaZ * progress;

        // Update the player's position
        player.mesh.position.set(incX, targetPoint.y, incZ);

        //console.log(`(${incX.toFixed(4)}, ${targetPoint.y.toFixed(4)}, ${incZ.toFixed(4)})`)

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

function linearMovementConstant(playerId, targetPoint, speed = 5) {
    return new Promise((resolve) => {
        if (!playersInScene[playerId]) {
            console.error(`Player with ID ${playerId} does not exist in the scene.`);
            resolve();
            return;
        }

        const player = playersInScene[playerId];
        const startX = player.x;
        const startY = player.y;
        const startZ = player.z;
        const startPoint = {x: startX, y: startY, z: startZ};
        
        const totalDistance = euclidean_distance(startPoint, targetPoint);
        const duration = (totalDistance / speed) * 1000;
        
        const deltaX = targetPoint.x - startX;
        const deltaY = targetPoint.y - startY;
        const deltaZ = targetPoint.z - startZ;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            const incX = startX + deltaX * progress;
            const incY = startY + deltaY * progress;
            const incZ = startZ + deltaZ * progress;

            player.mesh.position.set(incX, incY, incZ);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
                player.x = targetPoint.x;
                player.y = targetPoint.y;
                player.z = targetPoint.z;
                resolve(); // Resolve the promise when movement is complete
            }
        }
       
        requestAnimationFrame(animate);
    });
}

function linearMovementConstantLegacy(playerId, targetPoint, speed = 5) { // speed in units per second
    if (!playersInScene[playerId]) {
        console.error(`Player with ID ${playerId} does not exist in the scene.`);
        return;
    }

    const player = playersInScene[playerId];
    const startX = player.x;
    const startY = player.y;
    const startZ = player.z;
    const startPoint = {x: startX, y: startY, z: startZ};
    
    // Calculate total distance
    const totalDistance = euclidean_distance(startPoint, targetPoint);
    
    // Calculate duration based on speed and distance
    const duration = (totalDistance / speed) * 1000; // Convert to milliseconds
    
    const deltaX = targetPoint.x - startX;
    const deltaZ = targetPoint.z - startZ;
    const startTime = performance.now();

    //console.log(`Starting point is (${startX}, ${startY}, ${startZ})`);
    //console.log(`Destination point is (${targetPoint.x}, ${targetPoint.y}, ${targetPoint.z})`);
    //console.log('Euclidean distance between the points is', totalDistance);
    //console.log(`Movement will take ${duration.toFixed(2)}ms at ${speed} units per second`);

    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        // Calculate the current position based on progress
        const incX = startX + deltaX * progress;
        const incZ = startZ + deltaZ * progress;

        // Update the player's position
        player.mesh.position.set(incX, targetPoint.y, incZ);

        // Optional: Uncomment to debug current speed
        /*if (progress > 0 && progress < 1) {
            const currentPoint = {x: incX, y: targetPoint.y, z: incZ};
            const distanceCovered = euclidean_distance(startPoint, currentPoint);
            const currentSpeed = (distanceCovered / elapsedTime) * 1000;
            console.log(`Current speed: ${currentSpeed.toFixed(2)} units/second`);
        }*/

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Ensure the player reaches the exact target point at the end
            player.mesh.position.set(targetPoint.x, targetPoint.y, targetPoint.z);
            player.x = targetPoint.x;
            player.y = targetPoint.y;
            player.z = targetPoint.z;
        }
    }
   
    requestAnimationFrame(animate);
}

// Function to detect objects in the path of a straight line using Three.js Raycaster
// Return a boolean value indicating if an obstacle was detected, and a list of points
// of intersection
function detectObstacles(start, end, objectsGroup) {
    // Create a direction vector from start to end
    const direction = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z);
    
    // Set up the raycaster with the start position and direction
    raycaster.set(new THREE.Vector3(start.x, start.y, start.z), direction);

    console.log(raycaster)
    
    // Calculate the distance between start and end
    const distance = euclidean_distance(start, end)

    // Collect all meshes in an array for raycasting
    const meshes = [];
    objectsGroup.traverse((child) => {
        if (child.isMesh) {
            meshes.push(child);
        }
    });

    console.log(meshes)

    // Perform raycasting to detect intersections
    const intersects = raycaster.intersectObjects(meshes, true);
    
    console.log('Intersection objects: ', intersects)

    // Filter intersections to only those within the range of the start to end line
    const filteredIntersects = intersects.filter(intersect => intersect.distance <= distance);

    console.log('Filtered intersection objects ', filteredIntersects)

    console.log(filteredIntersects.length > 0)

    // Return true if there are any objects detected, false otherwise
    return [filteredIntersects.length > 0, filteredIntersects];
}

function getPointBeforeIntersection(startPoint, intersectionPoint, bufferDistance) {
    // Calculate the direction vector from startPoint to intersectionPoint
    const direction = new THREE.Vector3(
        intersectionPoint.x - startPoint.x,
        intersectionPoint.y - startPoint.y,
        intersectionPoint.z - startPoint.z
    ).normalize(); // Normalize to get the unit vector

    // Calculate the point before the intersection at the buffer distance
    const pointBeforeIntersection = new THREE.Vector3(
        intersectionPoint.x - direction.x * bufferDistance,
        intersectionPoint.y - direction.y * bufferDistance,
        intersectionPoint.z - direction.z * bufferDistance
    );

    return pointBeforeIntersection;
}

async function masterMovement(playerId, startPoint, destPoint) {
    let [intersectsFlag, intersectObjects] = detectObstacles(startPoint, destPoint, objects);

    console.log('Intersects flag is ', intersectsFlag);
    console.log('Starting point is ', startPoint);
    console.log('Destination point is ', destPoint);
    console.log('Euclidean distance between the points is ', euclidean_distance(startPoint, destPoint));

    if (intersectsFlag) {
        const intersectionPoint = intersectObjects[0].point;
        console.log('Point of intersection with the object is', intersectionPoint);

        const bufferDistance = 1.0;
        const pointBeforeIntersection = getPointBeforeIntersection(startPoint, intersectionPoint, bufferDistance);
        console.log('Point before intersection is', pointBeforeIntersection);
 
        let path = aStarSearch(pointBeforeIntersection, destPoint);

        // Wait for the linear movement to complete before starting path following
        await linearMovementConstant(playerId, pointBeforeIntersection);

        if (path.length > 0) {
            console.log('Optimal path is:', path);
            console.log('Last path point is ', path[path.length - 1]);
            
            // Now follow the path
            await followPathOnlyConstant(playerId, path);

            // Go to the destination point using linear movement
            await linearMovement(playerId, destPoint)
        }
    } else {
        console.log('No point of intersection found');
        console.log('Using linear movement to move');
        await linearMovementConstant(playerId, destPoint);
    }
}

function masterMovementLegacy(playerId, startPoint, destPoint) {

    let [intersectsFlag, intersectObjects] = detectObstacles(startPoint, destPoint, objects)

    console.log('Intesects flag is ', intersectsFlag)

    console.log('Starting point is ', startPoint)
    console.log('Destination point is ', destPoint)
    console.log('Eculidean distance between the points is ', euclidean_distance(startPoint, destPoint))

    if (intersectsFlag) {

        const intersectionPoint = intersectObjects[0].point;
        console.log('Point of intersection with the object is', intersectionPoint);

        // Calculate a point before the intersection, with a buffer of 0.5 units (or half the character's size)
        const bufferDistance = 1.0;
        const pointBeforeIntersection = getPointBeforeIntersection(startPoint, intersectionPoint, bufferDistance);

        console.log('Point before intersection is', pointBeforeIntersection);
 
        let path = aStarSearch(pointBeforeIntersection, destPoint)

        // Move linearly to the point before the intersection
        linearMovementConstant(playerId, pointBeforeIntersection);

        if (path.length > 0) {
            console.log('Optimal path is :')
            console.log(path)

            const lastPathPoint = path[path.length - 1];

            console.log('Last path point is ', lastPathPoint)

            followPathOnlyConstant(playerId, path)

            // Move linearly from the last point of the Astar path to the destination point
            //const lastPathPoint = path.slice(-1)[0]
            //linearMovement(playerId, destPoint)
        }
        
    }
    else {

        console.log('No point of intersection found')
        console.log('Using linear movement to move')

        linearMovementConstant(playerId, destPoint)
    }
    
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
        console.log(currentHour)
    })

    socket.on('sendPlayerData', (player) => {
        instantiatePlayer(player.id, player.username, player.color, player.position)
    })

    // Client-Side Message Sent To Game Server
    let sendMessageButton = document.getElementById('sendUserMessage')
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
    let chatlog = document.getElementById('messagesLog')
    socket.on('recieveGlobalUserMessage', (message) => {
        chatlog.value += message + '\n'
    })

    //Update other player's position on screen
    socket.on('broadcastPlayerPosition', (movementData) => {
        //movePlayer(movementData.id, movementData.position)
        //linearMovement(movementData.id, movementData.position)

        //let currPosition = {x: playersInScene[movementData.id].x, y: playersInScene[movementData.id].y, z: playersInScene[movementData.id].z}

        //console.log('Starting point is ', currPosition)
        //console.log('Destination point is ', movementData.position)
        //console.log('Eculidean distance between the points is ', euclidean_distance(currPosition, movementData.position))

        //let path = aStarSearch(currPosition, movementData.position)

        //if (path.length > 0) {
        //    console.log('Optimal path is :')
        //    console.log(path)
        //
        //    followPath(movementData.id, path, movementData.position)
        //}

        let currPosition = {x: playersInScene[movementData.id].x, y: playersInScene[movementData.id].y, z: playersInScene[movementData.id].z}
        
        masterMovement(movementData.id, currPosition, movementData.position)
   
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