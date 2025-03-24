AFRAME.registerComponent('fps-camera', {
    schema: {
        walkSpeed: { type: 'number', default: 10 },
        phiSpeed: { type: 'number', default: 8 },
        thetaSpeed: { type: 'number', default: 5 }
    },
    init: function() {
        // Cache initial position and rotation
        this.translation = new THREE.Vector3(0, 1.6, 0);
        this.rotationQuat = new THREE.Quaternion();

        // For mouse movement handling, you might integrate with A-Frame's look-controls.
        // For simplicity, we assume look-controls updates the camera.
        // Additional logic (like smoothing, head bobbing, etc.) from your original code
        // can be integrated here.
    },
    tick: function(time, delta) {
        // For now we simply sync the entity's object3D to our stored translation and rotation.
        // Advanced behavior (like applying movement from WASD or using a physics controller)
        // can be implemented here.
        this.el.object3D.position.copy(this.translation);
        this.el.object3D.quaternion.copy(this.rotationQuat);
    }
});