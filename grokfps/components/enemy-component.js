AFRAME.registerComponent('enemy-component', {
    schema: {
        health: { type: 'number', default: 100 },
        speed: { type: 'number', default: 2 },
        attackPower: { type: 'number', default: 10 },
        attackRate: { type: 'number', default: 1 },
        detectionRange: { type: 'number', default: 20 },
        attackRange: { type: 'number', default: 2 }
    },
    init: function() {
        try {
            this.health = this.data.health;
            this.maxHealth = this.data.health;
            this.isDead = false;
            this.lastAttack = 0;
            this.currentState = 'idle';
            this.playerEntity = document.getElementById('player');
            this.obstacleCheckInterval = 100;
            this.lastObstacleCheck = 0;
            this.stuckTime = 0;
            this.stuckThreshold = 2000;
            this.lastPosition = new THREE.Vector3();

            // Move this up before createEnemyModel
            this.hitboxSize = { width: 1.2, height: 1.8, depth: 1.2 };

            this.createEnemyModel();
            this.createHealthBar();
            this.setupYukaAI();
            this.lastDamageTime = 0;
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].registerEnemy(this);
            }

            // Add explicit hitbox for better detection
            this.hitbox = new THREE.Box3();
            this.updateHitbox(); // Initial update
        } catch (error) {
            console.error('Error initializing enemy component:', error);
        }
    },
    createEnemyModel: function() {
        try {
            const body = document.createElement('a-box');
            body.setAttribute('color', 'red');
            body.setAttribute('width', '0.8');
            body.setAttribute('height', '1.6');
            body.setAttribute('depth', '0.8');
            body.setAttribute('position', '0 0.8 0');
            body.setAttribute('class', 'enemy-body');
            this.el.appendChild(body);

            const head = document.createElement('a-sphere');
            head.setAttribute('color', 'darkred');
            head.setAttribute('radius', '0.3');
            head.setAttribute('position', '0 1.8 0');
            head.setAttribute('class', 'enemy-head');
            this.el.appendChild(head);

            const leftEye = document.createElement('a-sphere');
            leftEye.setAttribute('color', 'black');
            leftEye.setAttribute('radius', '0.05');
            leftEye.setAttribute('position', '-0.15 1.85 0.25');
            this.el.appendChild(leftEye);

            const rightEye = document.createElement('a-sphere');
            rightEye.setAttribute('color', 'black');
            rightEye.setAttribute('radius', '0.05');
            rightEye.setAttribute('position', '0.15 1.85 0.25');
            this.el.appendChild(rightEye);

            // Add hitbox helper (visible during development)
            const hitboxHelper = document.createElement('a-box');
            hitboxHelper.setAttribute('width', this.hitboxSize.width);
            hitboxHelper.setAttribute('height', this.hitboxSize.height);
            hitboxHelper.setAttribute('depth', this.hitboxSize.depth);
            hitboxHelper.setAttribute('position', `0 ${this.hitboxSize.height/2} 0`);
            hitboxHelper.setAttribute('opacity', '0.0'); // Make invisible in production
            hitboxHelper.setAttribute('color', '#00FF00');
            hitboxHelper.setAttribute('class', 'hitbox-helper');
            this.el.appendChild(hitboxHelper);
        } catch (error) {
            console.error('Error creating enemy model:', error);
        }
    },
    setupYukaAI: function() {
        try {
            this.vehicle = new YUKA.Vehicle();
            const position = this.el.getAttribute('position');
            this.vehicle.position.set(position.x, position.y, position.z);
            this.lastPosition.copy(this.vehicle.position);
            this.vehicle.maxSpeed = this.data.speed;
            this.vehicle.maxForce = 10;
            this.vehicle.mass = 1;
            this.seekBehavior = new YUKA.SeekBehavior();
            this.seekBehavior.active = false;
            this.vehicle.steering.add(this.seekBehavior);
            this.separationBehavior = new YUKA.SeparationBehavior();
            this.separationBehavior.active = false;
            this.vehicle.steering.add(this.separationBehavior);
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
            const playerPos = this.playerEntity.object3D.position;
            const enemyPos = this.el.object3D.position;
            const distance = new THREE.Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z).length();
            if (distance <= this.data.detectionRange) {
                if (distance <= this.data.attackRange) {
                    if (this.currentState !== 'attack') {
                        this.setState('attack');
                    }
                    this.attackPlayer();
                    this.seekBehavior.active = false;
                    this.separationBehavior.active = false;
                } else {
                    if (this.currentState !== 'chase') {
                        this.setState('chase');
                    }
                    this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
                    this.seekBehavior.active = true;
                    this.separationBehavior.active = true;
                }
            } else {
                if (this.currentState !== 'idle') {
                    this.setState('idle');
                }
                this.seekBehavior.active = false;
                this.separationBehavior.active = false;
            }
            this.el.object3D.position.x = this.vehicle.position.x;
            this.el.object3D.position.z = this.vehicle.position.z;
            if ((this.currentState === 'chase' || this.currentState === 'attack') && distance > 0.1) {
                const lookAt = new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z);
                this.el.object3D.lookAt(lookAt);
            }
            const now = performance.now();
            if (now - this.lastObstacleCheck > this.obstacleCheckInterval) {
                this.checkIfStuck(now);
                this.lastObstacleCheck = now;
            }
        } catch (error) {
            console.error('Error updating AI:', error);
        }
    },
    checkIfStuck: function(now) {
        try {
            if (this.currentState !== 'chase') {
                this.stuckTime = 0;
                this.lastPosition.copy(this.vehicle.position);
                return;
            }
            const distanceMoved = this.lastPosition.distanceTo(new THREE.Vector3(this.vehicle.position.x, this.vehicle.position.y, this.vehicle.position.z));
            if (distanceMoved < 0.05) {
                this.stuckTime += this.obstacleCheckInterval;
                if (this.stuckTime > this.stuckThreshold) {
                    this.tryToUnstick();
                    this.stuckTime = 0;
                }
            } else {
                this.stuckTime = 0;
            }
            this.lastPosition.copy(this.vehicle.position);
        } catch (error) {
            console.error('Error checking if stuck:', error);
        }
    },
    tryToUnstick: function() {
        try {
            const jitterAmount = 0.5;
            this.vehicle.position.x += (Math.random() * 2 - 1) * jitterAmount;
            this.vehicle.position.z += (Math.random() * 2 - 1) * jitterAmount;
            const originalSpeed = this.vehicle.maxSpeed;
            this.vehicle.maxSpeed *= 1.5;
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
            if (state === 'idle') {
                this.el.querySelector('a-box').setAttribute('color', 'red');
            } else if (state === 'chase') {
                this.el.querySelector('a-box').setAttribute('color', 'orange');
            } else if (state === 'attack') {
                this.el.querySelector('a-box').setAttribute('color', 'darkred');
            }
        } catch (error) {
            console.error('Error setting state:', error);
        }
    },
    attackPlayer: function() {
        try {
            const now = performance.now();
            if (now - this.lastAttack < this.data.attackRate * 1000) {
                return;
            }
            this.lastAttack = now;
            if (this.playerEntity && this.playerEntity.components['player-component']) {
                this.playerEntity.components['player-component'].takeDamage(this.data.attackPower);
            }
            this.flashColor('darkred', 'red', 200);
        } catch (error) {
            console.error('Error attacking player:', error);
        }
    },
    createHealthBar: function() {
        try {
            // Create container for the health bar
            const healthBarContainer = document.createElement('a-entity');
            healthBarContainer.setAttribute('position', '0 2.3 0');
            healthBarContainer.setAttribute('id', 'health-bar-container');

            // Create background for the health bar
            const healthBarBg = document.createElement('a-plane');
            healthBarBg.setAttribute('width', '1');
            healthBarBg.setAttribute('height', '0.1');
            healthBarBg.setAttribute('color', '#333');
            healthBarBg.setAttribute('opacity', '0.7');
            healthBarContainer.appendChild(healthBarBg);

            // Create the actual health bar
            const healthBar = document.createElement('a-plane');
            healthBar.setAttribute('width', '0.98');
            healthBar.setAttribute('height', '0.08');
            healthBar.setAttribute('color', '#00FF00');
            healthBar.setAttribute('position', '0 0 0.001'); // Slightly in front of background
            healthBar.setAttribute('id', 'health-bar');
            healthBarContainer.appendChild(healthBar);

            // Make health bar always face the camera
            healthBarContainer.setAttribute('look-at', '[camera]');

            this.el.appendChild(healthBarContainer);
        } catch (error) {
            console.error('Error creating health bar:', error);
        }
    },

    updateHealthBar: function() {
        try {
            const healthBar = this.el.querySelector('#health-bar');
            if (!healthBar) return;

            const healthPercent = Math.max(0, this.health / this.maxHealth);
            const width = 0.98 * healthPercent;

            healthBar.setAttribute('width', width);
            healthBar.setAttribute('position', `${(width - 0.98) / 2} 0 0.001`);

            // Change color based on health percentage
            if (healthPercent <= 0.25) {
                healthBar.setAttribute('color', '#FF0000'); // Red
            } else if (healthPercent <= 0.5) {
                healthBar.setAttribute('color', '#FFFF00'); // Yellow
            } else {
                healthBar.setAttribute('color', '#00FF00'); // Green
            }
        } catch (error) {
            console.error('Error updating health bar:', error);
        }
    },

    takeDamage: function(amount, hitPosition) {
        try {
            if (this.isDead) return;

            const oldHealth = this.health;
            this.health = Math.max(0, this.health - amount); // Ensure health doesn't go below 0
            this.lastDamageTime = performance.now();
            
            console.log(`ENEMY HIT! Damage: ${amount}, Health: ${oldHealth} → ${this.health}, Max: ${this.maxHealth}`);

            // Visual feedback at hit location if provided
            if (hitPosition) {
                this.createHitEffect(hitPosition);
                this.showDamageNumber(amount, hitPosition);
            }

            // Update health bar
            this.updateHealthBar();

            // Flash effect on enemy - make more intense for big hits
            const flashIntensity = amount > 20 ? 200 : 100;
            this.flashColor('white', this.currentState === 'idle' ? 'red' : 'orange', flashIntensity);

            // Apply hit force (push enemy slightly)
            if (this.playerEntity && this.playerEntity.object3D && !this.isDead) {
            const playerPos = this.playerEntity.object3D.position;
            const enemyPos = this.el.object3D.position;
            const direction = new THREE.Vector3()
                .subVectors(enemyPos, playerPos)
                .normalize();
            
                // Apply small movement in direction away from player
                // Scale by damage amount for bigger pushback on bigger hits
                const pushForce = 0.3 * (amount / 25);
            this.vehicle.position.x += direction.x * pushForce;
                this.vehicle.position.z += direction.z * pushForce;
            }

            // Check if enemy should die - make this very explicit
            if (this.health <= 0) {
            console.log('ENEMY KILLED! Health reached zero.');
            this.die();
            return; // Exit early since enemy is dead
            } else {
                // Log remaining health percentage
                const healthPercent = Math.floor((this.health / this.maxHealth) * 100);
                console.log(`Enemy at ${healthPercent}% health (${this.health}/${this.maxHealth})`);
                
                // Set to chase if not already chasing
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
    showDamageNumber: function(amount, position) {
        try {
            const damageText = document.createElement('a-text');
            damageText.setAttribute('value', amount.toString());
            damageText.setAttribute('color', '#FF0000');
            damageText.setAttribute('position', position);
            damageText.setAttribute('align', 'center');
            damageText.setAttribute('scale', '0.5 0.5 0.5');
            damageText.setAttribute('look-at', '[camera]');

            // Animation to float upward and fade out
            damageText.setAttribute('animation__position', {
                property: 'position.y',
                to: position.y + 1,
                dur: 1000,
                easing: 'easeOutQuad'
            });

            damageText.setAttribute('animation__opacity', {
                property: 'opacity',
                from: 1,
                to: 0,
                dur: 1000,
                easing: 'easeInQuad'
            });

            document.querySelector('a-scene').appendChild(damageText);

            // Remove after animation completes
            setTimeout(() => {
                if (damageText.parentNode) {
                    damageText.parentNode.removeChild(damageText);
                }
            }, 1000);
        } catch (error) {
            console.error('Error showing damage number:', error);
        }
    },

    createHitEffect: function(position) {
        try {
            // Create enhanced blood splatter effect
            const hitEffect = document.createElement('a-entity');
            hitEffect.setAttribute('position', position);
            hitEffect.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 30, // Increased particles
                color: '#900,#f00', // Red color variations 
                size: 0.15, // Larger particles
                duration: 0.5,
                direction: 'normal',
                velocity: 1.5, // Faster velocity
                spread: 1.5 // Wider spread
            });
            document.querySelector('a-scene').appendChild(hitEffect);

            // Remove after animation completes
            setTimeout(() => {
                if (hitEffect.parentNode) {
                    hitEffect.parentNode.removeChild(hitEffect);
                }
            }, 500);
        } catch (error) {
            console.error('Error creating hit effect:', error);
        }
    },
    flashColor: function(flashColor, returnColor, duration) {
        try {
            const body = this.el.querySelector('a-box');
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
            console.log('Enemy killed!');

            // Hide health bar
            const healthBar = this.el.querySelector('#health-bar-container');
            if (healthBar) healthBar.setAttribute('visible', false);

            // Change color of body and head to indicate death
            const bodyEl = this.el.querySelector('.enemy-body');
            const headEl = this.el.querySelector('.enemy-head');
            const hitboxHelper = this.el.querySelector('.hitbox-helper');

            if (bodyEl) bodyEl.setAttribute('color', 'black');
            if (headEl) headEl.setAttribute('color', 'black');
            if (hitboxHelper) hitboxHelper.setAttribute('visible', false);

            // Disable AI behaviors
            if (this.seekBehavior) this.seekBehavior.active = false;
            if (this.separationBehavior) this.separationBehavior.active = false;

            // Notify game manager
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].entityManager.remove(this.vehicle);
                gameManager.components['game-manager'].enemyKilled(this);
            }

            // Create death particles
            const position = this.el.object3D.position;
            const deathEffect = document.createElement('a-entity');
            deathEffect.setAttribute('position', position);
            deathEffect.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 50,
                color: '#900,#f00,#000',
                size: 0.2,
                duration: 1.0,
                velocity: 2,
                spread: 2
            });
            document.querySelector('a-scene').appendChild(deathEffect);

            // Fall and fade animation sequence
            this.el.setAttribute('animation__fall', { property: 'rotation.z', to: 90, dur: 1000, easing: 'easeOutQuad' });
            setTimeout(() => {
                this.el.setAttribute('animation__fade', { property: 'scale', to: '0 0 0', dur: 1000, easing: 'easeInQuad' });
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
    tick: function(time, delta) {
        try {
            const dt = delta / 1000;
            this.updateAI(dt);
            this.updateHitbox(); // Keep hitbox updated with entity position

            // Update health bar to face camera
            const healthBarContainer = this.el.querySelector('#health-bar-container');
            if (healthBarContainer) {
                healthBarContainer.setAttribute('look-at', '[camera]');
            }

            // Add hit reaction - enemies shake slightly when recently hit
            const timeSinceHit = performance.now() - this.lastDamageTime;
            if (timeSinceHit < 300 && !this.isDead) { // Only shake for 300ms after being hit
                const shakeMagnitude = 0.03;
                this.el.object3D.position.x += (Math.random() - 0.5) * shakeMagnitude;
                this.el.object3D.position.z += (Math.random() - 0.5) * shakeMagnitude;
            }
        } catch (error) {
            console.error('Error in enemy tick:', error);
        }
    },
    updateHitbox: function() {
        try {
            const pos = this.el.object3D.position;
            const halfWidth = this.hitboxSize.width / 2;
            const halfDepth = this.hitboxSize.depth / 2;
            const height = this.hitboxSize.height;

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

            // Update the visual hitbox helper if it exists
            const hitboxHelper = this.el.querySelector('.hitbox-helper');
            if (hitboxHelper) {
                // Make the hitbox helper match the actual hitbox size
                hitboxHelper.setAttribute('width', this.hitboxSize.width);
                hitboxHelper.setAttribute('height', this.hitboxSize.height);
                hitboxHelper.setAttribute('depth', this.hitboxSize.depth);
                hitboxHelper.setAttribute('position', `0 ${this.hitboxSize.height/2} 0`);

                // Make sure it's not blocking raycasts
                if (!hitboxHelper.hasAttribute('raycast-target')) {
                    hitboxHelper.setAttribute('raycast-target', 'false');
                }
            }

            // Debug message (uncomment when needed for debugging)
            // console.log('Updated enemy hitbox', this.hitbox);
        } catch (error) {
            console.error('Error updating hitbox:', error);
        }
    },
    remove: function() {
        try {
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