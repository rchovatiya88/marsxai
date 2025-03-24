AFRAME.registerComponent('bullet', {
    schema: {
        speed: { type: 'number', default: 30 }
    },
    init: function() {
        // Get forward direction from the bullet's initial orientation.
        this.direction = new THREE.Vector3();
        this.el.object3D.getWorldDirection(this.direction);
        // Set a timeout to remove the bullet after a few seconds if it doesn't hit anything.
        this.removeTimeout = setTimeout(() => {
            if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        }, 3000);

        // Listen for collision events from the physics system.
        this.el.addEventListener('collide', (e) => {
            // Check if the collided object is an enemy (for example, by color or class)
            const otherEl = e.detail.body.el;
            if (otherEl && otherEl.getAttribute('material') && otherEl.getAttribute('material').color === 'red') {
                // Spawn an explosion particle effect at the collision point.
                const explosion = document.createElement('a-entity');
                explosion.setAttribute('position', this.el.getAttribute('position'));
                explosion.setAttribute('particle-system', {
                    preset: 'explosion',
                    particleCount: 200,
                    color: "#ff0000, #ffff00",
                    size: 0.3,
                    duration: 0.5
                });
                this.el.sceneEl.appendChild(explosion);
                // Remove the explosion effect after its duration.
                setTimeout(() => {
                    if (explosion.parentNode) {
                        explosion.parentNode.removeChild(explosion);
                    }
                }, 600);
                // Optionally, change enemy color or trigger other damage effects.
                otherEl.setAttribute('material', 'color', 'yellow');
                setTimeout(() => {
                    otherEl.setAttribute('material', 'color', 'red');
                }, 200);
                // Remove the bullet.
                this.removeBullet();
            }
        });
    },
    tick: function(time, delta) {
        // Move the bullet forward.
        const distance = (this.data.speed * delta) / 1000;
        const moveVector = this.direction.clone().multiplyScalar(distance);
        this.el.object3D.position.add(moveVector);
    },
    removeBullet: function() {
        clearTimeout(this.removeTimeout);
        if (this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
});