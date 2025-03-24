AFRAME.registerComponent('game-manager', {
    init: function() {
        const sceneEl = this.el;

        // Wait for the scene to load before initializing
        sceneEl.addEventListener('loaded', () => {
            // Shooting mechanism with raycasting
            document.addEventListener('click', () => {
                const bullet = document.getElementById('bullet');
                bullet.setAttribute('visible', 'true');
                bullet.emit('start-shooting');
            });
        });
    },
});