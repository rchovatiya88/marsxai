AFRAME.registerComponent('navmesh-component', {
    schema: {
        visualize: { type: 'boolean', default: false }
    },

    init: function() {
        this.isReady = false;
        this.navMesh = null;
        this.navMeshGeometry = null;

        // Listen for model loaded event
        this.el.addEventListener('model-loaded', this.onModelLoaded.bind(this));
    },

    onModelLoaded: function() {
        // Process the navmesh geometry
        const model = this.el.getObject3D('mesh');
        if (!model) return;

        // Extract the geometry from the loaded model
        model.traverse(node => {
            if (node.isMesh) {
                this.navMeshGeometry = node.geometry;
                this.processNavMesh();
            }
        });
    },

    processNavMesh: function() {
        if (!this.navMeshGeometry) return;

        // Create a Yuka NavMesh
        // Note: In a full implementation, we'd need to convert the THREE.Geometry
        // to Yuka's NavMesh format. This is simplified.
        this.navMesh = new YUKA.NavMesh();

        // In a real implementation, we would:
        // 1. Extract vertices and faces from the loaded geometry
        // 2. Create regions from the extracted geometry
        // 3. Build the navmesh with those regions

        // For demonstration, visualize the navmesh if needed
        if (this.data.visualize) {
            this.visualizeNavMesh();
        }

        this.isReady = true;

        // Emit event that navmesh is ready
        this.el.emit('navmesh-ready', { navMesh: this.navMesh });
    },

    visualizeNavMesh: function() {
        // Create a visual representation of the navmesh
        if (!this.navMeshGeometry) return;

        const material = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });

        const mesh = new THREE.Mesh(this.navMeshGeometry, material);
        this.el.setObject3D('navmesh-helper', mesh);
    },

    getClosestPointOnNavMesh: function(position) {
        if (!this.navMesh) return position;

        // In a real implementation, we would use the navmesh to find 
        // the closest point on the navmesh to the given position
        // This is simplified
        return position;
    },

    isOutOfBounds: function(position) {
        if (!this.navMesh || !this.navMeshGeometry) return false;

        // Check if position is on the navmesh
        // In a real implementation, we would use the navmesh to check
        // if the position is on the navmesh
        // For simplicity, just check if position is far from the origin
        const distanceFromOrigin = position.length();
        return distanceFromOrigin > 50;
    },

    findPath: function(startPosition, endPosition) {
        if (!this.navMesh) return [startPosition, endPosition];

        // In a real implementation, we would use the navmesh to find
        // a path from startPosition to endPosition
        // For simplicity, just return direct path
        return [startPosition, endPosition];
    },

    remove: function() {
        // Clean up the visualized navmesh
        if (this.el.getObject3D('navmesh-helper')) {
            this.el.removeObject3D('navmesh-helper');
        }
    }
});