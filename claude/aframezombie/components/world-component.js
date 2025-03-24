AFRAME.registerComponent('world-manager', {
    schema: {
        gravity: { type: 'number', default: 30 },
        debug: { type: 'boolean', default: false }
    },

    init: function() {
        // Setup Yuka entity manager
        this.entityManager = new YUKA.EntityManager();

        // Keep track of zombies
        this.zombies = [];
        this.gameOver = false;

        // Set up time
        this.time = new YUKA.Time();

        // Wait for all necessary components to load
        this.waitForComponents();

        // Listen for game events
        this.el.sceneEl.addEventListener('game-over', this.onGameOver.bind(this));

        // Debug helpers
        if (this.data.debug) {
            this.setupDebugHelpers();
        }
    },

    waitForComponents: function() {
        // Wait for navmesh to be ready
        const navmeshEl = document.getElementById('navmesh');
        if (!navmeshEl) {
            setTimeout(() => this.waitForComponents(), 100);
            return;
        }

        navmeshEl.addEventListener('navmesh-ready', () => {
            // Once navmesh is ready, load level
            const levelManagerEl = document.getElementById('level-manager');
            if (levelManagerEl && levelManagerEl.components['level-component']) {
                levelManagerEl.components['level-component'].initLevel();
            }

            // Emit world-ready event
            this.el.emit('world-ready', {});
        });
    },

    addZombie: function(zombie) {
        this.zombies.push(zombie);
    },

    removeZombie: function(zombie) {
        const index = this.zombies.indexOf(zombie);
        if (index !== -1) {
            this.zombies.splice(index, 1);
        }

        // If all zombies are defeated, go to next level
        if (this.zombies.length === 0 && !this.gameOver) {
            const levelManagerEl = document.getElementById('level-manager');
            if (levelManagerEl && levelManagerEl.components['level-component']) {
                levelManagerEl.components['level-component'].nextLevel();
            }
        }
    },

    onGameOver: function() {
        this.gameOver = true;

        // Show game over screen
        document.getElementById('intro').classList.remove('hidden');
        document.getElementById('start-button').style.display = 'none';
        document.getElementById('gameover').style.display = 'block';

        // Update game over text
        const playerEl = document.getElementById('player');
        if (playerEl && playerEl.components['player-component']) {
            const playerComponent = playerEl.components['player-component'];
            document.getElementById('gameover_hits').textContent = playerComponent.hits;

            const levelEl = document.getElementById('level-manager');
            if (levelEl && levelEl.components['level-component']) {
                document.getElementById('gameover_level').textContent =
                    levelEl.components['level-component'].data.currentLevel;
            }
        }

        // Exit pointer lock
        document.exitPointerLock();
    },

    setupDebugHelpers: function() {
        // Add helpers for debugging
        // Could add navmesh visualization, path visualization, etc.
    },

    tick: function(time, delta) {
        // Convert delta to seconds
        const dt = delta / 1000;

        // Update Yuka entity manager
        this.time.update();
        this.entityManager.update(this.time.getDelta());

        // Update game stats
        this.updateGameStats();
    },

    updateGameStats: function() {
        // Update game statistics for debugging
        if (this.data.debug) {
            const stats = document.getElementById('stats');
            if (stats) {
                stats.textContent = `Entities: ${this.entityManager.entities.length}\nZombies: ${this.zombies.length}`;
            }
        }
    }
});