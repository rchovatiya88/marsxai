AFRAME.registerComponent('level-component', {
    schema: {
        startLevel: { type: 'number', default: 1 },
        maxZombies: { type: 'number', default: 20 },
        zombieHealthMultiplier: { type: 'number', default: 1 },
        zombieSpeedMultiplier: { type: 'number', default: 1 },
        zombiePowerMultiplier: { type: 'number', default: 1 },
        currentLevel: { type: 'number', default: 1 }
    },

    init: function() {
        this.zombiesToSpawn = this.data.maxZombies;
        this.data.currentLevel = this.data.startLevel;

        // Update UI
        document.getElementById('level-value').textContent = this.data.currentLevel;
    },

    initLevel: function() {
        // Spawn initial zombies
        this.spawnZombies();
    },

    nextLevel: function() {
        // Increase level
        this.data.currentLevel++;

        // Update level UI
        document.getElementById('level-value').textContent = this.data.currentLevel;

        // Show level transition effect
        this.showLevelTransition();

        // Recalculate zombies to spawn with difficulty scaling
        this.zombiesToSpawn = Math.floor(this.data.maxZombies * (1 + (this.data.currentLevel - 1) * 0.1));

        // Spawn zombies for the new level
        setTimeout(() => this.spawnZombies(), 2000);
    },

    showLevelTransition: function() {
        // Show level transition effect
        const levelTransition = document.getElementById('level-transition');
        if (levelTransition) {
            levelTransition.textContent = `Level ${this.data.currentLevel}`;
            levelTransition.style.display = 'block';

            // Hide after 1.5 seconds
            setTimeout(() => {
                levelTransition.style.display = 'none';
            }, 1500);
        }
    },

    spawnZombies: function() {
        // Spawn zombies around the map
        for (let i = 0; i < this.zombiesToSpawn; i++) {
            this.spawnZombie(i);
        }
    },

    spawnZombie: function(index) {
        // Create zombie entity
        const zombie = document.createElement('a-entity');

        // Calculate random spawn position
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 10; // Spawn 15-25 units away
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Set position
        zombie.setAttribute('position', `${x} 1 ${z}`);

        // Set zombie component with scaled difficulty
        zombie.setAttribute('zombie-component', {
            id: `zombie-${this.data.currentLevel}-${index}`,
            health: 100 * this.data.zombieHealthMultiplier * Math.pow(1.5, this.data.currentLevel - 1),
            speed: 1.0 * this.data.zombieSpeedMultiplier * (1 + (this.data.currentLevel - 1) * 0.1),
            attackPower: 10 * this.data.zombiePowerMultiplier * Math.pow(1.2, this.data.currentLevel - 1),
            attackRate: 1.0
        });

        // Add to scene
        this.el.sceneEl.appendChild(zombie);
    }
});