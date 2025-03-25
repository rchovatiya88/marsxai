AFRAME.registerComponent('enemy-component', {
    schema: {
        type: { type: 'string', default: 'basic' },
        health: { type: 'number', default: 100 },
        speed: { type: 'number', default: 2 },
        attackPower: { type: 'number', default: 10 },
        attackRate: { type: 'number', default: 1 },
        detectionRange: { type: 'number', default: 20 },
        attackRange: { type: 'number', default: 2 },
        color: { type: 'string', default: 'red' },
        scoreValue: { type: 'number', default: 10 }
    },
    
    init: function() {
        try {
            // Health and state
            this.health = this.data.health;
            this.maxHealth = this.data.health;
            this.isDead = false;
            this.lastAttack = 0;
            this.hitboxSize = { width: 0.8, height: 1.6, depth: 0.8 };
            this.hitbox = new THREE.Box3();
            
            // AI state
            this.currentState = 'idle';
            this.playerEntity = document.getElementById('player');
            this.obstacleCheckInterval = 100;
            this.lastObstacleCheck = 0;
            this.stuckTime = 0;
            this.stuckThreshold = 2000;
            this.lastPosition = new THREE.Vector3();
            
            // Create visual model
            this.createEnemyModel();
            
            // Set up AI navigation
            this.setupYukaAI();
            
            // Register with game manager
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].registerEnemy(this);
            }
            
            // Customize based on enemy type
            this.configureEnemyType();
            
            // Create health bar
            this.createHealthBar();
            
            // Add hit detection
            this.setupHitDetection();
        } catch (error) {
            console.error('Error initializing enemy component:', error);
        }
    },
    
    configureEnemyType: function() {
        // Apply different properties based on enemy type
        switch (this.data.type) {
            case 'fast':
                // Fast enemies have lighter hitboxes 
                this.hitboxSize = { width: 0.6, height: 1.4, depth: 0.6 };
                break;
                
            case 'heavy':
                // Heavy enemies have larger hitboxes
                this.hitboxSize = { width: 1.0, height: 1.8, depth: 1.0 };
                break;
                
            // Basic enemies use default hitbox size
        }
    },
    
    createEnemyModel: function() {
        try {
            // Body
            const body = document.createElement('a-box');
            body.setAttribute('color', this.data.color);
            body.setAttribute('width', this.hitboxSize.width);
            body.setAttribute('height', this.hitboxSize.height);
            body.setAttribute('depth', this.hitboxSize.depth);
            body.setAttribute('position', `0 ${this.hitboxSize.height/2} 0`);
            body.setAttribute('class', 'enemy-body');
            this.el.appendChild(body);
            
            // Head
            const head = document.createElement('a-sphere');
            const headColor = this.data.type === 'heavy' ? 'darkred' : 
                             this.data.type === 'fast' ? 'orange' : 'darkred';
            head.setAttribute('color', headColor);
            head.setAttribute('radius', '0.3');
            head.setAttribute('position', `0 ${this.hitboxSize.height + 0.2} 0`);
            head.setAttribute('class', 'enemy-head');
            this.el.appendChild(head);
            
            // Eyes
            const leftEye = document.createElement('a-sphere');
            leftEye.setAttribute('color', 'black');
            leftEye.setAttribute('radius', '0.05');
            leftEye.setAttribute('position', `-0.15 ${this.hitboxSize.height + 0.25} 0.25`);
            this.el.appendChild(leftEye);
            
            const rightEye = document.createElement('a-sphere');
            rightEye.setAttribute('color', 'black');
            rightEye.setAttribute('radius', '0.05');
            rightEye.setAttribute('position', `0.15 ${this.hitboxSize.height + 0.25} 0.25`);
            this.el.appendChild(rightEye);
            
            // Special features based on enemy type
            if (this.data.type === 'fast') {
                // Add spikes for fast enemies
                const spikes = document.createElement('a-entity');
                
                const spike1 = document.createElement('a-cone');
                spike1.setAttribute('color', 'orange');
                spike1.setAttribute('height', '0.4');
                spike1.setAttribute('radius-bottom', '0.1');
                spike1.setAttribute('radius-top', '0');
                spike1.setAttribute('position', `0 ${this.hitboxSize.height + 0.5} 0`);
                spikes.appendChild(spike1);
                
                this.el.appendChild(spikes);
                
            } else if (this.data.type === 'heavy') {
                // Add armor plates for heavy enemies
                const shoulder1 = document.createElement('a-box');
                shoulder1.setAttribute('color', 'gray');
                shoulder1.setAttribute('width', '0.3');
                shoulder1.setAttribute('height', '0.3');
                shoulder1.setAttribute('depth', '0.8');
                shoulder1.setAttribute('position', `-0.6 ${this.hitboxSize.height - 0.4} 0`);
                this.el.appendChild(shoulder1);
                
                const shoulder2 = document.createElement('a-box');
                shoulder2.setAttribute('color', 'gray');
                shoulder2.setAttribute('width', '0.3');
                shoulder2.setAttribute('height', '0.3');
                shoulder2.setAttribute('depth', '0.8');
                shoulder2.setAttribute('position', `0.6 ${this.hitboxSize.height - 0.4} 0`);
                this.el.appendChild(shoulder2);
            }
            
        } catch (error) {
            console.error('Error creating enemy model:', error);
        }
    },
    
    createHealthBar: function() {
        const healthBarContainer = document.createElement('a-plane');
        healthBarContainer.setAttribute('width', '1');
        healthBarContainer.setAttribute('height', '0.1');
        healthBarContainer.setAttribute('position', `0 ${this.hitboxSize.height + 0.6} 0`);
        healthBarContainer.setAttribute('material', 'color: #333; opacity: 0.5');
        healthBarContainer.setAttribute('look-at', '[camera]');
        
        const healthBar = document.createElement('a-plane');
        healthBar.setAttribute('class', 'enemy-health-bar');
        healthBar.setAttribute('width', '0.98');
        healthBar.setAttribute('height', '0.08');
        healthBar.setAttribute('position', '0 0 0.01');
        healthBar.setAttribute('material', 'color: #0f0');
        
        healthBarContainer.appendChild(healthBar);
        this.el.appendChild(healthBarContainer);
    },
    
    updateHealthBar: function() {
        const healthBar = this.el.querySelector('.enemy-health-bar');
        if (healthBar) {
            const healthPercent = (this.health / this.maxHealth);
            healthBar.setAttribute('width', Math.max(0.01, 0.98 * healthPercent));
            
            // Update color based on health
            if (healthPercent <= 0.25) {
                healthBar.setAttribute('material', 'color: #f00'); // Red
            } else if (healthPercent <= 0.5) {
                healthBar.setAttribute('material', 'color: #ff0'); // Yellow
            } else {
                healthBar.setAttribute('material', 'color: #0f0'); // Green
            }
        }
    },
    
    setupHitDetection: function() {
        // Update hitbox on every frame
        this.updateHitbox();
    },
    
    updateHitbox: function() {
        const pos = this.el.object3D.position;
        const halfWidth = this.hitboxSize.width / 2;
        const halfDepth = this.hitboxSize.depth / 2;
        const height = this.hitboxSize.height;
        
        // Create box3 for hit detection
        this.hitbox.min.set(
            pos.x - halfWidth,
            pos.y,
            pos.z - halfDepth
        );
        this.hitbox.max.set(
            pos.x + halfWidth,
            pos.y + height,
            pos.z + halfDepth
        );
    },
    
    setupYukaAI: function() {
        try {
            // Create vehicle for AI movement
            this.vehicle = new YUKA.Vehicle();
            
            // Set initial position
            const position = this.el.getAttribute('position');
            this.vehicle.position.set(position.x, position.y, position.z);
            this.lastPosition.copy(this.vehicle.position);
            
            // Configure vehicle properties
            this.vehicle.maxSpeed = this.data.speed;
            this.vehicle.maxForce = 10;
            this.vehicle.mass = 1;
            
            // Add steering behaviors
            this.seekBehavior = new YUKA.SeekBehavior();
            this.seekBehavior.active = false;
            this.vehicle.steering.add(this.seekBehavior);
            
            this.separationBehavior = new YUKA.SeparationBehavior();
            this.separationBehavior.active = false;
            this.vehicle.steering.add(this.separationBehavior);
            
            // Register with entity manager
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].entityManager.add(this.vehicle);
            }
            
        } catch (error) {
            console.error('Error setting up Yuka AI:', error);
        }
    },
    
    updateAI: function(dt) {
        try {
            if (this.isDead) return;
            
            if (!this.playerEntity || !this.playerEntity.object3D) return;
            
            // Get player position
            const playerPos = this.playerEntity.object3D.position;
            const enemyPos = this.el.object3D.position;
            
            // Calculate distance to player
            const distance = new THREE.Vector3(
                playerPos.x - enemyPos.x, 
                0, 
                playerPos.z - enemyPos.z
            ).length();
            
            // Update state based on distance to player
            if (distance <= this.data.detectionRange) {
                if (distance <= this.data.attackRange) {
                    // Attack range - stop moving and attack
                    if (this.currentState !== 'attack') {
                        this.setState('attack');
                    }
                    this.attackPlayer();
                    this.seekBehavior.active = false;
                    this.separationBehavior.active = false;
                } else {
                    // Detection range - chase player
                    if (this.currentState !== 'chase') {
                        this.setState('chase');
                    }
                    this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
                    this.seekBehavior.active = true;
                    this.separationBehavior.active = true;
                }
            } else {
                // Out of range - idle
                if (this.currentState !== 'idle') {
                    this.setState('idle');
                }
                this.seekBehavior.active = false;
                this.separationBehavior.active = false;
            }
            
            // Update position from AI vehicle
            this.el.object3D.position.x = this.vehicle.position.x;
            this.el.object3D.position.z = this.vehicle.position.z;
            
            // Make enemy face player if chasing or attacking
            if ((this.currentState === 'chase' || this.currentState === 'attack') && distance > 0.1) {
                const lookAt = new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z);
                this.el.object3D.lookAt(lookAt);
            }
            
            // Check if enemy is stuck
            const now = performance.now();
            if (now - this.lastObstacleCheck > this.obstacleCheckInterval) {
                this.checkIfStuck(now);
                this.lastObstacleCheck = now;
            }
            
            // Update hitbox for collision detection
            this.updateHitbox();
            
        } catch (error) {
            console.error('Error updating AI:', error);
        }
    },
    
    checkIfStuck: function(now) {
        try {
            // Only check for stuck state when chasing
            if (this.currentState !== 'chase') {
                this.stuckTime = 0;
                this.lastPosition.copy(this.vehicle.position);
                return;
            }
            
            // Calculate how far enemy has moved since last check
            const distanceMoved = this.lastPosition.distanceTo(
                new THREE.Vector3(
                    this.vehicle.position.x, 
                    this.vehicle.position.y, 
                    this.vehicle.position.z
                )
            );
            
            // If movement is minimal, increment stuck time
            if (distanceMoved < 0.05) {
                this.stuckTime += this.obstacleCheckInterval;
                
                // If stuck for too long, try to unstick
                if (this.stuckTime > this.stuckThreshold) {
                    this.tryToUnstick();
                    this.stuckTime = 0;
                }
            } else {
                // Reset stuck time if moving correctly
                this.stuckTime = 0;
            }
            
            // Update last position
            this.lastPosition.copy(this.vehicle.position);
            
        } catch (error) {
            console.error('Error checking if stuck:', error);
        }
    },
    
    tryToUnstick: function() {
        try {
            // Apply random jitter to position
            const jitterAmount = 0.5;
            this.vehicle.position.x += (Math.random() * 2 - 1) * jitterAmount;
            this.vehicle.position.z += (Math.random() * 2 - 1) * jitterAmount;
            
            // Temporarily increase speed to break out of stuck state
            const originalSpeed = this.vehicle.maxSpeed;
            this.vehicle.maxSpeed *= 1.5;
            
            // Reset speed after short delay
            setTimeout(() => {
                this.vehicle.maxSpeed = originalSpeed;
            }, 500);
            
        } catch (error) {
            console.error('Error trying to unstick:', error);
        }
    },
    
    setState: function(state) {
        try {
            if (this.currentState === state) return;
            
            this.currentState = state;
            
            // Update visual appearance based on state
            const body = this.el.querySelector('.enemy-body');
            if (body) {
                if (state === 'idle') {
                    body.setAttribute('color', this.data.color);
                } else if (state === 'chase') {
                    body.setAttribute('color', this.data.type === 'fast' ? 'orange' : 
                                            this.data.type === 'heavy' ? 'brown' : 'orange');
                } else if (state === 'attack') {
                    body.setAttribute('color', this.data.type === 'fast' ? 'darkorange' : 
                                            this.data.type === 'heavy' ? 'darkred' : 'darkred');
                }
            }
            
        } catch (error) {
            console.error('Error setting state:', error);
        }
    },
    
    attackPlayer: function() {
        try {
            const now = performance.now();
            
            // Check attack cooldown
            if (now - this.lastAttack < this.data.attackRate * 1000) {
                return;
            }
            
            // Update last attack time
            this.lastAttack = now;
            
            // Deal damage to player if it exists and has health component
            if (this.playerEntity && this.playerEntity.components['player-component']) {
                this.playerEntity.components['player-component'].takeDamage(this.data.attackPower);
            }
            
            // Visual feedback for attack
            this.flashColor('darkred', this.currentState === 'idle' ? this.data.color : 'orange', 200);
            
            // Create attack effect
            this.createAttackEffect();
            
        } catch (error) {
            console.error('Error attacking player:', error);
        }
    },
    
    createAttackEffect: function() {
        // Animation for attack
        const head = this.el.querySelector('.enemy-head');
        if (head) {
            const original = head.getAttribute('position');
            
            // Quick forward lunge
            head.setAttribute('animation', {
                property: 'position',
                to: `${original.x} ${original.y} ${parseFloat(original.z) + 0.2}`,
                dur: 100,
                easing: 'easeOutQuad',
                loop: 1,
                dir: 'alternate'
            });
        }
        
        // Get direction to player for effect positioning
        const playerPos = this.playerEntity.object3D.position;
        const enemyPos = this.el.object3D.position;
        const direction = new THREE.Vector3().subVectors(playerPos, enemyPos).normalize();
        
        // Position effect between enemy and player
        const effectPos = new THREE.Vector3().copy(enemyPos).addScaledVector(direction, this.data.attackRange * 0.5);
        
        // Add slash effect
        const attackEffect = document.createElement('a-entity');
        attackEffect.setAttribute('position', effectPos);
        attackEffect.setAttribute('particle-system', {
            preset: 'dust',
            particleCount: 20,
            color: this.data.type === 'fast' ? '#ff0,#f80' : 
                   this.data.type === 'heavy' ? '#800,#f00' : '#f00,#800',
            size: '0.1,0.3',
            duration: 0.3,
            direction: 'random',
            velocity: 3,
            spread: 1
        });
        
        // Look at player
        attackEffect.setAttribute('look-at', '[camera]');
        
        document.querySelector('a-scene').appendChild(attackEffect);
    },
    
    takeDamage: function(amount, hitPosition) {
        try {
            if (this.isDead) return;
            
            // Reduce health
            this.health -= amount;
            
            // Create visual hit effect
            this.flashColor('yellow', this.currentState === 'idle' ? this.data.color : 'orange', 100);
            
            // Create blood splatter at hit position if provided
            if (hitPosition) {
                GAME_UTILS.createEffect('hit', hitPosition, {
                    particleCount: 15,
                    color: '#900,#700',
                    duration: 0.8
                });
            }
            
            // Update health bar
            this.updateHealthBar();
            
            // Handle death if health depleted
            if (this.health <= 0) {
                this.die();
            } else {
                // Change to chase state if hit
                this.setState('chase');
                
                if (this.playerEntity && this.playerEntity.object3D) {
                    const playerPos = this.playerEntity.object3D.position;
                    this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
                    this.seekBehavior.active = true;
                    this.separationBehavior.active = true;
                }
            }
        } catch (error) {
            console.error('Error taking damage:', error);
        }
    },
    
    flashColor: function(flashColor, returnColor, duration) {
        try {
            const body = this.el.querySelector('.enemy-body');
            if (!body) return;
            
            const originalColor = body.getAttribute('color');
            body.setAttribute('color', flashColor);
            
            setTimeout(() => {
                if (!this.isDead && body.parentNode) {
                    body.setAttribute('color', returnColor || originalColor);
                }
            }, duration);
            
        } catch (error) {
            console.error('Error flashing color:', error);
        }
    },
    
    die: function() {
        try {
            if (this.isDead) return;
            
            this.isDead = true;
            
            // Change appearance
            const bodyEl = this.el.querySelector('.enemy-body');
            const headEl = this.el.querySelector('.enemy-head');
            if (bodyEl) bodyEl.setAttribute('color', 'black');
            if (headEl) headEl.setAttribute('color', 'black');
            
            // Disable AI
            if (this.seekBehavior) this.seekBehavior.active = false;
            if (this.separationBehavior) this.separationBehavior.active = false;
            
            // Create death effects
            this.createDeathEffect();
            
            // Hide health bar
            const healthBar = this.el.querySelector('.enemy-health-bar');
            if (healthBar && healthBar.parentNode) {
                healthBar.parentNode.parentNode.removeChild(healthBar.parentNode);
            }
            
            // Emit death event
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].entityManager.remove(this.vehicle);
                
                // Emit event with score value
                this.el.emit('enemy-killed', {
                    enemy: this,
                    scoreValue: this.data.scoreValue
                });
                
                // Also notify game manager directly in case event doesn't work
                gameManager.components['game-manager'].onEnemyKilled({
                    detail: {
                        enemy: this,
                        scoreValue: this.data.scoreValue
                    }
                });
                
                // Unregister from game manager
                gameManager.components['game-manager'].unregisterEnemy(this);
            }
            
            // Death animation
            this.el.setAttribute('animation__fall', { 
                property: 'rotation.z', 
                to: 90, 
                dur: 1000, 
                easing: 'easeOutQuad' 
            });
            
            // Remove entity after animation
            setTimeout(() => {
                this.el.setAttribute('animation__fade', { 
                    property: 'scale', 
                    to: '0 0 0', 
                    dur: 1000, 
                    easing: 'easeInQuad' 
                });
                
                setTimeout(() => {
                    if (this.el.parentNode) {
                        this.el.parentNode.removeChild(this.el);
                    }
                }, 1000);
            }, 1500);
            
        } catch (error) {
            console.error('Error handling enemy death:', error);
        }
    },
    
    createDeathEffect: function() {
        // Position
        const position = this.el.getAttribute('position');
        
        // Blood splatter effect
        GAME_UTILS.createEffect('hit', position, {
            particleCount: 40,
            color: '#900,#700,#500',
            size: '0.1,0.3',
            duration: 1.2,
            velocity: 5,
            spread: 3
        });
        
        // Special effects based on enemy type
        if (this.data.type === 'heavy') {
            // Explosion effect for heavy enemies
            setTimeout(() => {
                GAME_UTILS.createEffect('explosion', position, {
                    particleCount: 60,
                    duration: 1.5
                });
            }, 500);
        } else if (this.data.type === 'fast') {
            // Energy dissipation for fast enemies
            const energyEffect = document.createElement('a-entity');
            energyEffect.setAttribute('position', position);
            energyEffect.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 50,
                color: '#ff0,#fa0,#f70',
                size: '0.2,0.4',
                duration: 1,
                direction: 'random',
                velocity: 4,
                spread: 2
            });
            
            document.querySelector('a-scene').appendChild(energyEffect);
        }
    },
    
    tick: function(time, delta) {
        try {
            const dt = delta / 1000; // Convert to seconds
            this.updateAI(dt);
        } catch (error) {
            console.error('Error in enemy tick:', error);
        }
    },
    
    remove: function() {
        try {
            // Clean up
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager'] && this.vehicle) {
                gameManager.components['game-manager'].entityManager.remove(this.vehicle);
                gameManager.components['game-manager'].unregisterEnemy(this);
            }
        } catch (error) {
            console.error('Error removing enemy component:', error);
        }
    }
});