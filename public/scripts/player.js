class Player {
  constructor(id, name, shape = 'cube', color = THREE.Color(0x00ff00), x = 0, y = 0, z = 0) {
      this.id = id; // Unique user id
      this.name = name; // username
      this.color = new THREE.Color(color); // temporarily using coloured capsules as models
      this.x = x; // current scene x position
      this.y = y; // current scene y position
      this.z = z;

      if (shape === 'cube') {
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
      } else if (shape === 'sphere') {
        this.geometry = new THREE.SphereGeometry(1, 16, 16);
      } else if (shape === 'cone') {
        this.geometry = new THREE.ConeGeometry(1, 2, 14);
      } 
      this.material = new THREE.MeshBasicMaterial( { color: color } );
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.position.set(this.x, this.y + 0.5, this.z) 
    }

    // Method to move the player
    move(point_of_intersection)
    {
      this.mesh.position.copy(point_of_intersection.x);
      this.mesh.position.y += 0.7;
    }
      
}