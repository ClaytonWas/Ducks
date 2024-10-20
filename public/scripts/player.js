class Player {
    constructor(id, name, color = 0x00ff00, x = 0, y = 0) {
      this.id = id; // Unique user id
      this.name = name; // username
      this.color = color; // temporarily using coloured capsules as models
      this.x = x; // current scene x position
      this.y = y; // current scene y position
      this.z = z;

      this.geometry = new THREE.BoxGeometry(1, 1, 1);
      this.material = new THREE.MeshBasicMaterial( { color: color } );
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      
    }

    // Method to move the player
    move(point_of_intersection)
    {
      this.mesh.position.copy(point_of_intersection.x);
      this.mesh.position.y += 0.7;
    }
      
  }