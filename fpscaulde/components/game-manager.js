AFRAME.registerComponent('game-manager', {
    schema: {
        enemyCount: { type: 'number', default: 5 },
        level: { type: 'number', default: 1 },
        spawnRadius: { type: 'number', default: 20 },
        enemySpawnInterval: { type: 'number', default: 3000 }, // ms between enemy spawns
        maxActiveEnemies: { type: 'number', default: 10 },
        gameStartDelay: { type: 'number', default: 2000 } // ms delay before game starts
    },

    init: function() {
        try {
            // Game state
            this.score = 0;
            this.level = this.data.level;
            this.enemiesRemaining = this.data.enemyCount * this.level;
            this.activeEnemies = [];
            this.activeEnemiesCount = 0;
            this.gameOver = false;
            this.levelInProgress = false;
            this.gameStarted = false;
            this.maxSpawnAttempts = 10;

            // Create Yuka entity manager for AI
            this.entityManager = new YUKA.EntityManager();

            // Setup event listeners
            this.el.addEventListener('player-died', this.onPlayerDied.bind(this));

            // Set initial UI values
            document.getElementById('level-value').textContent = this.level;
            document.getElementById('score-value').textContent = this.score;
            document.getElementById('enemies-value').textContent = this.enemiesRemaining;
        } catch (error) {
            console.error('Error initializing game manager:', error);
        }
    },

    startGame: function() {
        try {
            if (this.gameStarted) return;

            this.gameStarted = true;
            this.showMessage(`Get ready!`, 2000);
            // GAME_AUDIO.init();

            // Start first level after a short delay
            setTimeout(() => {
                this.startLevel();
            }, 2000);
        } catch (error) {
            console.error('Error starting game:', error);
        }
    },

    startLevel: function() {
        try {
            if (this.gameOver) return;

            this.levelInProgress = true;
            console.log(`Starting level ${this.level}`);

            // Update level display
            document.getElementById('level-value').textContent = this.level;

            // Calculate enemies for this level
            this.enemiesRemaining = this.data.enemyCount * this.level;
            document.getElementById('enemies-value').textContent = this.enemiesRemaining;

            // Show level message
            this.showMessage(`Level ${this.level}`, 3000);

            // Start spawning enemies
            this.startSpawningEnemies();
        } catch (error) {
            console.error('Error starting level:', error);
        }
    },

    startSpawningEnemies: function() {
        try {
            // Clear any existing spawn interval
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }

            // Calculate spawn rate based on level
            const spawnRate = Math.max(500, this.data.enemySpawnInterval / this.level);

            // Create spawn interval
            this.spawnTimer = setInterval(() => {
                if (this.gameOver) {
                    clearInterval(this.spawnTimer);
                    return;
                }

                if (this.activeEnemiesCount < this.data.maxActiveEnemies && this.enemiesRemaining > 0) {
                    this.spawnEnemy();

                    // Update enemy counter
                    this.enemiesRemaining--;
                    document.getElementById('enemies-value').textContent = this.enemiesRemaining;
                } else if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
                    // All enemies spawned and defeated
                    this.completeLevel();
                }
            }, spawnRate);
        } catch (error) {
            console.error('Error starting enemy spawning:', error);
        }
    },

    registerEnemy: function(enemy) {
        try {
            this.activeEnemies.push(enemy);
            this.activeEnemiesCount++;
        } catch (error) {
            console.error('Error registering enemy:', error);
        }
    },

    unregisterEnemy: function(enemy) {
        try {
            const index = this.activeEnemies.indexOf(enemy);
            if (index !== -1) {
                this.activeEnemies.splice(index, 1);
                this.activeEnemiesCount--;
            }

            // Check if level is complete
            if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
                this.completeLevel();
            }
        } catch (error) {
            console.error('Error unregistering enemy:', error);
        }
    },

    findValidSpawnPosition: function() {
        try {
            const playerPos = document.getElementById('player').object3D.position;
            const minDistanceFromPlayer = 10; // Minimum distance from player

            // Try finding a valid position within max attempts
            for (let attempt = 0; attempt < this.maxSpawnAttempts; attempt++) {
                // Generate random position within spawn radius
                const angle = Math.random() * Math.PI * 2;
                const radius = this.data.spawnRadius * (0.5 + Math.random() * 0.5);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;

                // Check distance from player
                const distToPlayer = new THREE.Vector3(x - playerPos.x, 0, z - playerPos.z).length();

                if (distToPlayer >= minDistanceFromPlayer) {
                    // Check if position overlaps with obstacles
                    const obstacles = document.querySelectorAll('.obstacle');
                    let validPosition = true;

                    for (let i = 0; i < obstacles.length; i++) {
                        const obstacle = obstacles[i];
                        const obstaclePos = obstacle.getAttribute('position');
                        const obstacleWidth = obstacle.getAttribute('width') || 1;

                        const distToObstacle = new THREE.Vector3(
                            x - obstaclePos.x,
                            0,
                            z - obstaclePos.z
                        ).length();

                        if (distToObstacle < obstacleWidth + 1) {
                            validPosition = false;
                            break;
                        }
                    }

                    if (validPosition) {
                        return { x, z };
                    }
                }
            }

            // Fallback to a position at the edge if no valid position found
            const angle = Math.random() * Math.PI * 2;
            return {
                x: Math.cos(angle) * this.data.spawnRadius,
                z: Math.sin(angle) * this.data.spawnRadius
            };
        } catch (error) {
            console.error('Error finding valid spawn position:', error);
            // Return a default position
            return { x: 0, z: -10 };
        }
    },

    spawnEnemy: function() {
        try {
            if (this.gameOver) return;

            // Find a valid spawn position
            const position = this.findValidSpawnPosition();

            // Create enemy entity
            const enemy = document.createElement('a-entity');

            // Set position and component
            enemy.setAttribute('position', `${position.x} 0 ${position.z}`);

            // Scale difficulty with level
            const speedMultiplier = 1 + (this.level * 0.1);
            const healthMultiplier = 1 + (this.level * 0.2);
            const attackMultiplier = 1 + (this.level * 0.15);

            enemy.setAttribute('enemy-component', {
                health: 100 * healthMultiplier,
                speed: 2 * speedMultiplier,
                attackPower: 10 * attackMultiplier,
                attackRate: Math.max(0.5, 1 - (this.level * 0.05)) // Faster attacks at higher levels
            });

            // Add to scene
            this.el.appendChild(enemy);
        } catch (error) {
            console.error('Error spawning enemy:', error);
        }
    },

    enemyKilled: function(enemy) {
        try {
            // Award points
            const basePoints = 10;
            const levelMultiplier = this.level;
            const pointsGained = basePoints * levelMultiplier;

            this.score += pointsGained;

            // Update score display
            document.getElementById('score-value').textContent = this.score;

            // Show points gained
            const position = enemy.el.getAttribute('position');
            this.showPointsGained(pointsGained, position);
        } catch (error) {
            console.error('Error handling enemy killed:', error);
        }
    },

    showPointsGained: function(points, position) {
        try {
            // Create floating text for points
            const pointsEl = document.createElement('a-text');
            pointsEl.setAttribute('value', `+${points}`);
            pointsEl.setAttribute('color', 'yellow');
            pointsEl.setAttribute('position', `${position.x} ${position.y + 2} ${position.z}`);
            pointsEl.setAttribute('align', 'center');
            pointsEl.setAttribute('scale', '1.5 1.5 1.5');
            pointsEl.setAttribute('look-at', '[camera]');

            // Add animation
            pointsEl.setAttribute('animation__float', {
                property: 'position',
                to: `${position.x} ${position.y + 4} ${position.z}`,
                dur: 1500,
                easing: 'easeOutQuad'
            });

            pointsEl.setAttribute('animation__fade', {
                property: 'opacity',
                from: '1',
                to: '0',
                dur: 1500,
                easing: 'easeInQuad'
            });

            this.el.appendChild(pointsEl);

            // Remove after animation
            setTimeout(() => {
                if (pointsEl.parentNode) {
                    pointsEl.parentNode.removeChild(pointsEl);
                }
            }, 1500);
        } catch (error) {
            console.error('Error showing points gained:', error);
        }
    },

    completeLevel: function() {
        try {
            if (!this.levelInProgress || this.gameOver) return;

            this.levelInProgress = false;
            console.log(`Level ${this.level} complete!`);

            // Clear spawn timer
            clearInterval(this.spawnTimer);

            // Add level completion bonus
            const levelBonus = 100 * this.level;
            this.score += levelBonus;
            document.getElementById('score-value').textContent = this.score;

            // Play level complete sound
            // GAME_AUDIO.init();

            // Show level complete message
            this.showMessage(`Level ${this.level} Complete!<br>+${levelBonus} bonus points`, 3000);

            // Advance to next level
            this.level++;

            // Start next level after delay
            setTimeout(() => {
                if (!this.gameOver) {
                    this.startLevel();
                }
            }, 5000);
        } catch (error) {
            console.error('Error completing level:', error);
        }
    },

    onPlayerDied: function() {
        try {
            if (this.gameOver) return;

            this.gameOver = true;
            this.levelInProgress = false;
            console.log('Game over!');

            // Clear spawn timer
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }

            // Show game over message
            this.showMessage(`Game Over!<br>Final Score: ${this.score}<br><br>Click to restart`, 0);

            // Add click listener to restart game
            const restartListener = (event) => {
                document.removeEventListener('click', restartListener);
                window.location.reload(); // Simple restart by reloading page
            };

            setTimeout(() => {
                document.addEventListener('click', restartListener);
            }, 2000); // Prevent accidental clicks
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    },

    showMessage: function(text, duration) {
        try {
            // Create or update message element
            const gameMessage = document.getElementById('game-message');

            if (gameMessage) {
                gameMessage.innerHTML = text;
                gameMessage.style.display = 'block';

                // Hide after duration if specified
                if (duration > 0) {
                    setTimeout(() => {
                        gameMessage.style.display = 'none';
                    }, duration);
                }
            }
        } catch (error) {
            console.error('Error showing message:', error);
        }
    },

    tick: function(time, delta) {
        try {
            // Convert to seconds
            const dt = delta / 1000;

            // Update Yuka entity manager
            this.entityManager.update(dt);

            // Update game state
            if (this.levelInProgress) {
                // Check if level is complete (all enemies spawned and defeated)
                if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0) {
                    this.completeLevel();
                }
            }
        } catch (error) {
            console.error('Error in game manager tick:', error);
        }
    },

    remove: function() {
        try {
            // Clean up
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }
        } catch (error) {
            console.error('Error removing game manager:', error);
        }
    }
});