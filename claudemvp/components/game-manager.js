AFRAME.registerComponent('game-manager', {
    schema: {
        enemyCount: { type: 'number', default: 5 },
        level: { type: 'number', default: 1 },
        spawnRadius: { type: 'number', default: 20 },
        enemySpawnInterval: { type: 'number', default: 3000 },
        maxActiveEnemies: { type: 'number', default: 10 },
        gameStartDelay: { type: 'number', default: 2000 },
        difficultyScaling: { type: 'boolean', default: true }
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
            
            // Enemy manager
            this.entityManager = new YUKA.EntityManager();
            
            // Register event listeners
            this.el.addEventListener('player-died', this.onPlayerDied.bind(this));
            this.el.addEventListener('enemy-killed', this.onEnemyKilled.bind(this));
            
            // Initialize UI
            this.updateScoreUI();
            
            // Enemy types with varying attributes
            this.enemyTypes = [
                {
                    id: 'basic',
                    color: 'red',
                    speed: 2,
                    health: 100,
                    attackPower: 10,
                    scoreValue: 10,
                    probability: 0.7
                },
                {
                    id: 'fast',
                    color: 'yellow',
                    speed: 3.5,
                    health: 70,
                    attackPower: 8,
                    scoreValue: 15,
                    probability: 0.2
                },
                {
                    id: 'heavy',
                    color: 'darkred',
                    speed: 1.2,
                    health: 200,
                    attackPower: 15,
                    scoreValue: 20,
                    probability: 0.1
                }
            ];
            
        } catch (error) {
            console.error('Error initializing game manager:', error);
        }
    },
    
    updateScoreUI: function() {
        document.getElementById('level-value').textContent = this.level;
        document.getElementById('score-value').textContent = GAME_UTILS.formatNumber(this.score);
        document.getElementById('enemies-value').textContent = this.enemiesRemaining;
    },
    
    startGame: function() {
        try {
            if (this.gameStarted) return;
            this.gameStarted = true;
            this.showMessage(`Get ready!`, 2000);
            
            setTimeout(() => {
                this.startLevel();
            }, this.data.gameStartDelay);
        } catch (error) {
            console.error('Error starting game:', error);
        }
    },
    
    startLevel: function() {
        try {
            if (this.gameOver) return;
            this.levelInProgress = true;
            console.log(`Starting level ${this.level}`);
            
            // Calculate enemies for this level based on level number
            this.enemiesRemaining = Math.floor(this.data.enemyCount * (1 + (this.level * 0.5)));
            
            // Update UI
            this.updateScoreUI();
            this.showMessage(`Level ${this.level}`, 3000);
            
            // Start spawning enemies
            this.startSpawningEnemies();
        } catch (error) {
            console.error('Error starting level:', error);
        }
    },
    
    startSpawningEnemies: function() {
        try {
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }
            
            // Calculate spawn rate based on level (faster spawns in higher levels)
            const baseSpawnRate = this.data.enemySpawnInterval;
            const spawnRate = Math.max(500, baseSpawnRate / Math.sqrt(this.level));
            
            this.spawnTimer = setInterval(() => {
                if (this.gameOver) {
                    clearInterval(this.spawnTimer);
                    return;
                }
                
                // Spawn enemy if below max active and enemies remain
                if (this.activeEnemiesCount < this.data.maxActiveEnemies && this.enemiesRemaining > 0) {
                    this.spawnEnemy();
                    this.enemiesRemaining--;
                    this.updateScoreUI();
                } 
                // Check if level is complete
                else if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
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
            const minDistanceFromPlayer = 10;
            
            // Try to find a valid spawn position
            for (let attempt = 0; attempt < this.maxSpawnAttempts; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = this.data.spawnRadius * (0.5 + Math.random() * 0.5);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                // Check distance from player
                const distToPlayer = new THREE.Vector3(x - playerPos.x, 0, z - playerPos.z).length();
                if (distToPlayer >= minDistanceFromPlayer) {
                    
                    // Check distance from obstacles
                    const obstacles = document.querySelectorAll('.obstacle');
                    let validPosition = true;
                    
                    for (let i = 0; i < obstacles.length; i++) {
                        const obstacle = obstacles[i];
                        const obstaclePos = obstacle.getAttribute('position');
                        const obstacleWidth = obstacle.getAttribute('width') || 1;
                        const distToObstacle = new THREE.Vector3(x - obstaclePos.x, 0, z - obstaclePos.z).length();
                        
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
            
            // Fallback to a random position if no valid position found
            const angle = Math.random() * Math.PI * 2;
            return { 
                x: Math.cos(angle) * this.data.spawnRadius, 
                z: Math.sin(angle) * this.data.spawnRadius 
            };
        } catch (error) {
            console.error('Error finding valid spawn position:', error);
            return { x: 0, z: -10 };
        }
    },
    
    selectEnemyType: function() {
        // Select a random enemy type based on probabilities
        const rand = Math.random();
        let cumulativeProbability = 0;
        
        // Adjust probabilities based on level
        const adjustedTypes = this.enemyTypes.map(type => {
            let adjustedType = {...type};
            
            // Higher levels get more tough enemies
            if (type.id === 'basic') {
                adjustedType.probability = Math.max(0.3, type.probability - (this.level * 0.05));
            } else if (type.id === 'heavy') {
                adjustedType.probability = Math.min(0.4, type.probability + (this.level * 0.03));
            }
            
            return adjustedType;
        });
        
        // Normalize probabilities
        const sum = adjustedTypes.reduce((sum, type) => sum + type.probability, 0);
        const normalizedTypes = adjustedTypes.map(type => ({
            ...type,
            probability: type.probability / sum
        }));
        
        // Select type based on probability
        for (let type of normalizedTypes) {
            cumulativeProbability += type.probability;
            if (rand <= cumulativeProbability) {
                return type;
            }
        }
        
        // Fallback to basic type
        return this.enemyTypes[0];
    },
    
    spawnEnemy: function() {
        try {
            if (this.gameOver) return;
            
            // Find a valid position
            const position = this.findValidSpawnPosition();
            
            // Select enemy type
            const enemyType = this.selectEnemyType();
            
            // Apply difficulty scaling based on level
            const speedMultiplier = this.data.difficultyScaling ? 1 + (this.level * 0.1) : 1;
            const healthMultiplier = this.data.difficultyScaling ? 1 + (this.level * 0.2) : 1;
            const attackMultiplier = this.data.difficultyScaling ? 1 + (this.level * 0.15) : 1;
            
            // Create enemy entity
            const enemy = document.createElement('a-entity');
            enemy.setAttribute('position', `${position.x} 0 ${position.z}`);
            enemy.setAttribute('enemy-component', {
                type: enemyType.id,
                health: enemyType.health * healthMultiplier,
                speed: enemyType.speed * speedMultiplier,
                attackPower: enemyType.attackPower * attackMultiplier,
                attackRate: Math.max(0.5, 1 - (this.level * 0.05)),
                color: enemyType.color,
                scoreValue: enemyType.scoreValue
            });
            
            this.el.appendChild(enemy);
        } catch (error) {
            console.error('Error spawning enemy:', error);
        }
    },
    
    onEnemyKilled: function(event) {
        try {
            // Extract data from event
            const enemy = event.detail.enemy;
            const position = enemy.el.getAttribute('position');
            const scoreValue = event.detail.scoreValue;
            
            // Award points
            this.score += scoreValue;
            this.updateScoreUI();
            
            // Show points gained visual effect
            this.showPointsGained(scoreValue, position);
        } catch (error) {
            console.error('Error handling enemy killed event:', error);
        }
    },
    
    showPointsGained: function(points, position) {
        try {
            const pointsEl = document.createElement('a-text');
            pointsEl.setAttribute('value', `+${points}`);
            pointsEl.setAttribute('color', 'yellow');
            pointsEl.setAttribute('position', `${position.x} ${position.y + 2} ${position.z}`);
            pointsEl.setAttribute('align', 'center');
            pointsEl.setAttribute('scale', '1.5 1.5 1.5');
            pointsEl.setAttribute('look-at', '[camera]');
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
            
            // Clear enemy spawning timer
            clearInterval(this.spawnTimer);
            
            // Award bonus points
            const levelBonus = 100 * this.level;
            this.score += levelBonus;
            this.updateScoreUI();
            
            // Show completion message
            this.showMessage(`Level ${this.level} Complete!<br>+${levelBonus} bonus points`, 3000);
            
            // Increment level 
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
            
            // Clear enemy spawning timer
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }
            
            // Show game over message
            this.showMessage(`Game Over!<br>Final Score: ${GAME_UTILS.formatNumber(this.score)}<br><br>Click to restart`, 0);
            
            // Add restart listener after delay
            const restartListener = (event) => {
                document.removeEventListener('click', restartListener);
                window.location.reload();
            };
            
            setTimeout(() => {
                document.addEventListener('click', restartListener);
            }, 2000);
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    },
    
    showMessage: function(text, duration) {
        try {
            const gameMessage = document.getElementById('game-message');
            if (gameMessage) {
                gameMessage.innerHTML = text;
                gameMessage.style.display = 'block';
                
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
            const dt = delta / 1000;
            
            // Update YUKA entity manager
            this.entityManager.update(dt);
            
            // Check for level completion
            if (this.levelInProgress) {
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
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }
        } catch (error) {
            console.error('Error removing game manager:', error);
        }
    }
});