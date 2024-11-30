// Import priorityQueue class for use in aStar algorithm
import priorityQueue from './priorityQueue.js'

export default class Movement {
    constructor(scene, objects, floor, playersInScene) {
        // Scene elements
        this.scene = scene;
        this.objects = objects; // Group containing obstacle meshes
        this.floor = floor; // Floor mesh

        this.playersInScene = playersInScene; // Map/Object of players
        
        // Raycaster for obstacle detection
        this.raycaster = new THREE.Raycaster();
        
        // Movement parameters
        this.defaultSpeed = 5; // Units per second
        this.playerDimensions = {
            width: 1,
            height: 1,
            depth: 1
        }

        // Pathfinding parameters
        this.neighborIncrement = 0.15; // Increment for neighbor search
        this.bufferDistance = 1.0; // Distance to stop before obstacles
        this.pathfindingBuffer = 0.1; // Buffer for path finding collision checks
        this.safetyMargin = 0.2; // Extra margin from obstacles
        
        // A* parameters
        this.closeEnoughDistance = 0.25; // Distance considered "arrived" at destination
    }

    //Update playersInScene dictionary
    updateSceneAndPlayers(updatedScene, updatedPlayersInScene) {
        this.scene = updatedScene
        this.playersInScene = updatedPlayersInScene
    }

    //Pathfinding helper methods

    //Returns euclidean distance of two 3d points
    euclidean_distance(curr_point, dest_point) {
        var dist = Math.sqrt((curr_point.x - dest_point.x)**2 + (curr_point.y - dest_point.y)**2 + (curr_point.z - dest_point.z)**2)
    
        return dist
    }

    // Function to check if a point is valid considering player dimensions
    #isValidNeighbor(point, playerDimensions = this.playerDimensions) {
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
            this.raycaster.set(
                new THREE.Vector3(corner.x, corner.y + 1, corner.z), 
                new THREE.Vector3(0, -1, 0)
            );
            const intersectsFloor = this.raycaster.intersectObject(this.floor.children[0]);
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
        const buffer = this.pathfindingBuffer; // 10cm buffer
        playerBox.expandByScalar(buffer);

        for (let i = 0; i < this.objects.children.length; i++) {
            const object = this.objects.children[i];
            const objectBox = new THREE.Box3().setFromObject(object);
            
            if (playerBox.intersectsBox(objectBox)) {
                return false;
            }
        }

        return true;
    }

    //Returns a list of a point's valid neighbors
    #get_neighbors(currPoint, inc = this.neighborIncrement, playerDimensions = this.playerDimensions) {
        // Increase increment slightly to account for player size
        const effectiveInc = Math.max(inc, playerDimensions.width / 4);
        const increments = [0, -effectiveInc, effectiveInc];
        let validNeighbors = [];
    
        // Calculate minimum distance from obstacles based on player size
        const minDistance = Math.max(playerDimensions.width, playerDimensions.depth) / 2 + this.safetyMargin; // Add 20cm safety margin
    
        for (let xInc of increments) {
            for (let zInc of increments) {
                // Avoid the original point
                if (xInc !== 0 || zInc !== 0) {
                    const neighborPoint = {
                        x: currPoint.x + xInc,
                        y: currPoint.y,
                        z: currPoint.z + zInc
                    };
                    
                    if (this.#isValidNeighbor(neighborPoint, playerDimensions)) {
                        // Additional check for minimum distance from all objects
                        let isFarEnough = true;
                        const neighborVector = new THREE.Vector3(
                            neighborPoint.x,
                            neighborPoint.y,
                            neighborPoint.z
                        );
    
                        for (let obj of this.objects.children) {
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

    // Function to detect objects in the path of a straight line using Three.js Raycaster
    // Return a boolean value indicating if an obstacle was detected
    #detectObstaclesBool(start, end, objectsGroup=this.objects) {
        // Create a direction vector from start to end
        const direction = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z);
        
        // Set up the raycaster with the start position and direction
        this.raycaster.set(new THREE.Vector3(start.x, start.y, start.z), direction);

        // Calculate the distance between start and end
        const distance = this.euclidean_distance(start, end)

        // Collect all meshes in an array for raycasting
        const meshes = [];
        objectsGroup.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
            }
        });

        // Perform raycasting to detect intersections
        const intersects = this.raycaster.intersectObjects(meshes, true);
        
        // Filter intersections to only those within the range of the start to end line
        const filteredIntersects = intersects.filter(intersect => intersect.distance <= distance);

        // Return true if there are any objects detected, false otherwise
        return filteredIntersects.length > 0
    }

    // Function to detect objects in the path of a straight line using Three.js Raycaster
    // Return a boolean value indicating if an obstacle was detected, and a list of points
    // of intersection
    #detectObstacles(start, end, objectsGroup = this.objects) {
        // Create a direction vector from start to end
        const direction = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z);
        
        // Set up the raycaster with the start position and direction
        this.raycaster.set(new THREE.Vector3(start.x, start.y, start.z), direction);
   
        // Calculate the distance between start and end
        const distance = this.euclidean_distance(start, end)

        // Collect all meshes in an array for raycasting
        const meshes = [];
        objectsGroup.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
            }
        });

        // Perform raycasting to detect intersections
        const intersects = this.raycaster.intersectObjects(meshes, true);
        
        // Filter intersections to only those within the range of the start to end line
        const filteredIntersects = intersects.filter(intersect => intersect.distance <= distance);

        // Return true if there are any objects detected, false otherwise
        return [filteredIntersects.length > 0, filteredIntersects];
    }
    
    //Astar pathfining method - combines greedy and heuristic search to
    //chart a path around obstacles
    #aStarSearch(startPoint, destPoint) {

        // Helper function to calculate movement cost
        const movementCost = (currCost, currPoint, destPoint) => {
            return currCost + this.euclidean_distance(currPoint, destPoint)
        }

        // Helper function to convert a point to a string for use in the priority queue
        function pointToString(point) {
            return `${point.x},${point.y},${point.z}`;
        }
    
        let frontier = new priorityQueue()
        
        // Add initial point to the priority queue
        frontier.add(startPoint, 0)
        
        // Map's a point to it's immediate predecessor
        let cameFrom = new Map()

        // Map's a point to the cost it takes to get to it
        let costSoFar = new Map()
        
        cameFrom.set(startPoint, null)
        costSoFar.set(pointToString(startPoint), 0);
    
        while (frontier.peek() != null) {
    
            let currNode = frontier.remove()
    
            let currPoint = currNode[0]
            
            // Exit conditon is if minimal space remains between the current point or destination, 
            // or if there are no obstacles in a straight line path from the current point to the destination
            if ((this.euclidean_distance(currPoint, destPoint) <= 0.25) || (!this.#detectObstaclesBool(startPoint, destPoint))) {
                var destPointApprox = currPoint
                //console.log('Path found')
                break
            }
    
            for (var neighborPoint of this.#get_neighbors(currPoint)) {
              
                let newCost = movementCost(costSoFar.get(pointToString(currPoint)), currPoint, neighborPoint)
    
                if (!costSoFar.has(pointToString(neighborPoint)) ||  newCost < costSoFar.get(pointToString(neighborPoint))) {
    
                    costSoFar.set(pointToString(neighborPoint), newCost)
    
                    let priority = newCost + this.euclidean_distance(neighborPoint, destPoint)
    
                    frontier.add(neighborPoint, priority)
    
                    cameFrom.set(neighborPoint, currPoint)
                }
    
            }
        }
    
        let path = []
        let curr = destPointApprox
        
        // Construct the path from the destination to the begining
        while (curr != null) {
            path.push(curr)
            curr = cameFrom.get(curr)
        }
        
        // Reverse the path to put it the correct order
        path.reverse()
    
        return path
    }

    // Function move's the player in a straight line to the destination point
    async linearMovementConstant(playerId, targetPoint, speed = this.defaultSpeed) {
        return new Promise((resolve) => {
            if (!this.playersInScene[playerId]) {
                console.error(`Player with ID ${playerId} does not exist in the scene.`);
                resolve();
                return;
            }
    
            const player = this.playersInScene[playerId];
            const startX = player.x;
            const startY = player.y;
            const startZ = player.z;
            const startPoint = {x: startX, y: startY, z: startZ};
            
            const totalDistance = this.euclidean_distance(startPoint, targetPoint);
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

                player.x = incX
                player.y = incY
                player.z = incZ
    
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

    // Function move's the player along a path created by the aStar algorithm
    async followPathOnlyConstant(playerId, path, speed = this.defaultSpeed) {
        return new Promise((resolve) => {
            if (!this.playersInScene[playerId]) {
                console.error(`Player with ID ${playerId} does not exist in the scene.`);
                resolve();
                return;
            }
    
            const player = this.playersInScene[playerId];
            let currentSegment = 0;
    
            const moveToNextSegment = () => {
                if (currentSegment >= path.length - 1) {
                    //console.log('Reached the final destination.');
                    resolve(); // Resolve the promise when the entire path is complete
                    return;
                }
    
                const startPoint = path[currentSegment];
                const targetPoint = path[currentSegment + 1];
    
                const segmentDistance = this.euclidean_distance(startPoint, targetPoint);
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

                    player.x = incX
                    player.y = incY
                    player.z = incZ
    
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

    // Get's the point before a player would intersect with an object if they were
    // walk along a straight line path
    #getPointBeforeIntersection(startPoint, intersectionPoint, bufferDistance = this.bufferDistance) {
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

    // This function governs player movement
    // If the destination point lies along an unobstructed straight line from
    // the player's current positon, linear movement will be used for movement
    // If an obstacle lies between a player and the destination, a mixture of 
    // movement along an aStar path and linear movement will be used
    async masterMovement(playerId, startPoint, destPoint) {

        //Check if an obstacle lies between the player and destination point
        let [intersectsFlag, intersectObjects] = this.#detectObstacles(startPoint, destPoint);

        destPoint.y += 0.5
    
        if (intersectsFlag) {
            const intersectionPoint = intersectObjects[0].point;
            //console.log('Point of intersection with the object is', intersectionPoint);
    
            //const bufferDistance = this.bufferDistance;
            const pointBeforeIntersection = this.#getPointBeforeIntersection(startPoint, intersectionPoint);
            //console.log('Point before intersection is', pointBeforeIntersection);
     
            let path = this.#aStarSearch(pointBeforeIntersection, destPoint);
    
            // Wait for the linear movement to complete before starting path following
            await this.linearMovementConstant(playerId, pointBeforeIntersection);
    
            if (path.length > 0) {
                //console.log('Optimal path is:', path);
                //console.log('Last path point is ', path[path.length - 1]);
                
                // Now follow the path
                await this.followPathOnlyConstant(playerId, path);
    
                // Go to the destination point using linear movement
                await this.linearMovementConstant(playerId, destPoint)
            }
        } else {
            //console.log('No point of intersection found');
            //console.log('Using linear movement to move');
            await this.linearMovementConstant(playerId, destPoint);
        }
    }


}