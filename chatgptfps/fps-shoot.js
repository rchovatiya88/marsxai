AFRAME.registerComponent('fps-shoot', {
    init: function() {
        window.addEventListener('click', () => {
            const sceneEl = this.el.sceneEl;
            const camera = sceneEl.camera;
            // Determine the starting position of the bullet.
            // Here we use the camera position plus a small offset in the forward direction.
            const startPosition = new THREE.Vector3().copy(camera.position);
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            startPosition.add(direction.clone().multiplyScalar(0.5));

            // Create a bullet entity.
            const bullet = document.createElement('a-entity');
            bullet.setAttribute('position', startPosition);
            // Give the bullet a visible geometry (optional – can be hidden if you prefer just the particle effect)
            bullet.setAttribute('geometry', { primitive: 'sphere', radius: 0.05 });
            bullet.setAttribute('material', 'color', '#FFD700');
            // Use dynamic-body so physics apply to it.
            bullet.setAttribute('dynamic-body', { mass: 0.1 });
            // Attach our bullet behavior.
            bullet.setAttribute('bullet', {});

            // Also add a particle system for the muzzle flash / explosion effect.
            bullet.setAttribute('particle-system', {
                preset: 'dust',
                color: "#ff9900, #ffffff",
                particleCount: 100,
                size: 0.2,
                duration: 0.3
            });

            sceneEl.appendChild(bullet);
        });
    }
});