AFRAME.registerComponent('player-component', {
    schema: {
        speed: { type: 'number', default: 5 },
        sprintMultiplier: { type: 'number', default: 1.5 },
        jumpForce: { type: 'number', default: 15 },
        health: { type: 'number', default: 100 },
        gravity: { type: 'number', default: 30 },
        height: { type: 'number', default: 1.6 },
        dashDistance: { type: 'number', default: 5 },
        dashCooldown: { type: 'number', default: 3 }
    },
    
    init: function() {
        try {
            // Core elements
            this.camera = this.el.querySelector('a-camera');
            
            // Movement
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.direction = new THREE.Vector3();
            this.isOnGround = true;
            this.isSprinting = false;
            this.isDashing = false;
            this.dashCooldownRemaining = 0;
            
            // Health and state
            this.health = this.data.health;
            this.maxHealth = this.data.health;
            this.isDead = false;
            this.lastDamageTime = 0;
            this.invulnerable = false;
            this.invulnerabilityDuration = 500; // ms of invulnerability after taking damage
            
            // Physics and collision
            this.collisionRadius = 0.5;
            this.oldPosition = new THREE.Vector3();
            this.newPosition = new THREE.Vector3();
            this.groundRaycaster = new THREE.Raycaster(
                new THREE.Vector3(), 
                new THREE.Vector3(0, -1, 0), 
                0, 
                2
            );
            
            // Setup controls and UI
            this.setupControls();
            this.updateHealthUI();
            
            // Footstep sounds
            this.footstepTime = 0;
            this.footstepInterval = 0.5;
            
            // Disable default A-Frame controls
            if (this.camera) {
                this.camera.setAttribute('wasd-controls', 'enabled', false);
            }
            
            // Weapon state tracking
            this.currentWeapon = null;
        } catch (error) {
            console.error('Error initializing player component:', error);
        }
    },
    
    updateHealthUI: function() {
        try {
            const healthBar = document.getElementById('health-bar');
            if (healthBar) {
                const healthPercent = (this.health / this.maxHealth) * 100;
                healthBar.style.width = `${healthPercent}%`;
                
                // Color coding based on health level
                if (healthPercent <= 25) {
                    healthBar.style.backgroundColor = '#f00'; // Red
                } else if (healthPercent <= 50) {
                    healthBar.style.backgroundColor = '#ff0'; // Yellow
                } else {
                    healthBar.style.backgroundColor = '#0f0'; // Green
                }
            }
        } catch (error) {
            console.error('Error updating health UI:', error);
        }
    },
    
    setupControls: function() {
        try {
            // Track key states
            this.keys = { 
                KeyW: false, 
                KeyA: false, 
                KeyS: false, 
                KeyD: false, 
                Space: false, 
                ShiftLeft: false,
                KeyE: false  // Dash key
            };
            
            // Bind event handlers
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onKeyUp = this.onKeyUp.bind(this);
            
            // Add event listeners
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);
        } catch (error) {
            console.error('Error setting up controls:', error);
        }
    },
    
    onKeyDown: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = true;
            
            // Handle sprint
            if (event.code === 'ShiftLeft') {
                this.isSprinting = true;
                this.footstepInterval = 0.3;
            }
            
            // Handle dash
            if (event.code === 'KeyE' && !this.isDashing && this.dashCooldownRemaining <= 0) {
                this.performDash();
            }
        }
    },
    
    onKeyUp: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = false;
            
            // Handle sprint end
            if (event.code === 'ShiftLeft') {
                this.isSprinting = false;
                this.footstepInterval = 0.5;
            }
        }
    },
    
    performDash: function() {
        if (this.isDead || !this.isOnGround) return;
        
        this.isDashing = true;
        this.invulnerable = true;
        
        // Get current camera direction
        const rotation = this.camera.getAttribute('rotation');
        const rotationRad = THREE.MathUtils.degToRad(rotation.y);
        
        // Calculate dash direction
        let dashDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.KeyW) dashDirection.z = -1;
        else if (this.keys.KeyS) dashDirection.z = 1;
        
        if (this.keys.KeyA) dashDirection.x = -1;
        else if (this.keys.KeyD) dashDirection.x = 1;
        
        // If no direction keys pressed, dash forward
        if (dashDirection.length() === 0) {
            dashDirection.z = -1;
        }
        
        // Apply rotation to dash direction
        dashDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRad);
        dashDirection.normalize();
        
        // Apply dash
        const pos = this.el.object3D.position;
        pos.x += dashDirection.x * this.data.dashDistance;
        pos.z += dashDirection.z * this.data.dashDistance;
        
        // Create dash effect
        this.createDashEffect(dashDirection);
        
        // Start cooldown
        this.dashCooldownRemaining = this.data.dashCooldown;
        
        // Reset dash state after short delay
        setTimeout(() => {
            this.isDashing = false;
            this.invulnerable = false;
        }, 300);
    },
    
    createDashEffect: function(direction) {
        // Particles trailing behind player
        const trailEffect = document.createElement('a-entity');
        trailEffect.setAttribute('position', this.el.getAttribute('position'));
        trailEffect.setAttribute('particle-system', {
            preset: 'dust',
            particleCount: 50,
            color: '#7df,#fff',
            size: '0.1,0.2',
            duration: 0.5,
            direction: 'normal',
            velocity: 3,
            directionVector: {
                x: -direction.x,
                y: 0,
                z: -direction.z
            },
            spread: 1
        });
        
        document.querySelector('a-scene').appendChild(trailEffect);
    },
    
    updateMovement: function(dt) {
        try {
            if (this.isDead || this.isDashing) return;
            
            const { speed, jumpForce, gravity, sprintMultiplier } = this.data;
            
            // Store old position for collision detection
            this.oldPosition.copy(this.el.object3D.position);
            
            // Reset direction
            this.direction.set(0, 0, 0);
            
            // Get camera rotation
            const rotation = this.camera.getAttribute('rotation');
            const rotationRad = THREE.MathUtils.degToRad(rotation.y);
            
            // Calculate movement direction based on key presses
            if (this.keys.KeyW) {
                this.direction.z = -Math.cos(rotationRad);
                this.direction.x = -Math.sin(rotationRad);
            } else if (this.keys.KeyS) {
                this.direction.z = Math.cos(rotationRad);
                this.direction.x = Math.sin(rotationRad);
            }
            
            if (this.keys.KeyA) {
                this.direction.x = -Math.cos(rotationRad);
                this.direction.z = Math.sin(rotationRad);
            } else if (this.keys.KeyD) {
                this.direction.x = Math.cos(rotationRad);
                this.direction.z = -Math.sin(rotationRad);
            }
            
            // Normalize direction vector if needed
            if (this.direction.length() > 0) {
                this.direction.normalize();
            }
            
            // Apply sprint multiplier if sprinting
            const currentSpeed = this.isSprinting ? speed * sprintMultiplier : speed;
            
            // Set horizontal velocity
            this.velocity.x = this.direction.x * currentSpeed;
            this.velocity.z = this.direction.z * currentSpeed;
            
            // Apply gravity or jump
            if (!this.isOnGround) {
                this.velocity.y -= gravity * dt;
            } else if (this.keys.Space) {
                this.velocity.y = jumpForce;
                this.isOnGround = false;
            }
            
            // Apply velocity to position
            const pos = this.el.object3D.position;
            pos.x += this.velocity.x * dt;
            pos.y += this.velocity.y * dt;
            pos.z += this.velocity.z * dt;
            
            // Store new position for collision detection
            this.newPosition.copy(this.el.object3D.position);
            
            // Check for collisions
            this.checkGroundCollision();
            this.checkObstacleCollisions();
            this.checkBoundaries();
            
            // Handle footstep sounds
            if (this.isMoving() && this.isOnGround) {
                this.footstepTime += dt;
                if (this.footstepTime >= this.footstepInterval) {
                    this.footstepTime = 0;
                    this.playFootstepSound();
                }
            }
            
            // Update dash cooldown
            if (this.dashCooldownRemaining > 0) {
                this.dashCooldownRemaining -= dt;
                if (this.dashCooldownRemaining < 0) {
                    this.dashCooldownRemaining = 0;
                }
            }
        } catch (error) {
            console.error('Error updating movement:', error);
        }
    },
    
    playFootstepSound: function() {
        // Get ground material
        const groundMaterial = 'concrete'; // Default
        
        // Different sounds based on material
        const volume = this.isSprinting ? 0.8 : 0.5;
        
        GAME_UTILS.playSound('footstep', this.el.getAttribute('position'), {
            volume: volume,
            pitchVariation: 0.2,
            duration: 0.3
        });
    },
    
    isMoving: function() {
        return this.keys.KeyW || this.keys.KeyA || this.keys.KeyS || this.keys.KeyD;
    },
    
    checkGroundCollision: function() {
        try {
            this.groundRaycaster.ray.origin.copy(this.el.object3D.position);
            
            // Quick check for ground level
            if (this.el.object3D.position.y <= this.data.height) {
                this.el.object3D.position.y = this.data.height;
                this.velocity.y = 0;
                this.isOnGround = true;
                return;
            }
            
            // Check for collisions with obstacles and ground
            const obstacles = document.querySelectorAll('.obstacle, [ground]');
            let onGround = false;
            
            obstacles.forEach(obstacle => {
                if (obstacle.object3D) {
                    const intersects = this.groundRaycaster.intersectObject(obstacle.object3D, true);
                    
                    if (intersects.length > 0 && intersects[0].distance <= this.data.height + 0.2) {
                        this.el.object3D.position.y = intersects[0].point.y + this.data.height;
                        this.velocity.y = 0;
                        onGround = true;
                    }
                }
            });
            
            this.isOnGround = onGround || this.el.object3D.position.y <= this.data.height;
        } catch (error) {
            console.error('Error checking ground collision:', error);
        }
    },
    
    checkObstacleCollisions: function() {
        try {
            const playerPos = this.el.object3D.position;
            const obstacles = document.querySelectorAll('.obstacle');
            
            obstacles.forEach(obstacle => {
                if (obstacle.object3D) {
                    const obstaclePos = obstacle.object3D.position;
                    const obstacleWidth = obstacle.getAttribute('width') || 1;
                    const obstacleDepth = obstacle.getAttribute('depth') || 1;
                    
                    // Calculate distance
                    const dx = playerPos.x - obstaclePos.x;
                    const dz = playerPos.z - obstaclePos.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    // Minimum distance before collision
                    const minDistance = this.collisionRadius + Math.max(obstacleWidth, obstacleDepth) / 2;
                    
                    // Push player away if colliding
                    if (distance < minDistance) {
                        const angle = Math.atan2(dz, dx);
                        const pushX = Math.cos(angle) * (minDistance - distance);
                        const pushZ = Math.sin(angle) * (minDistance - distance);
                        
                        playerPos.x += pushX;
                        playerPos.z += pushZ;
                    }
                }
            });
        } catch (error) {
            console.error('Error checking obstacle collisions:', error);
        }
    },
    
    checkBoundaries: function() {
        try {
            // Map boundaries
            const boundaries = { 
                minX: -24, 
                maxX: 24, 
                minZ: -24, 
                maxZ: 24 
            };
            
            const pos = this.el.object3D.position;
            
            // Constrain position within boundaries
            if (pos.x < boundaries.minX) pos.x = boundaries.minX;
            if (pos.x > boundaries.maxX) pos.x = boundaries.maxX;
            if (pos.z < boundaries.minZ) pos.z = boundaries.minZ;
            if (pos.z > boundaries.maxZ) pos.z = boundaries.maxZ;
        } catch (error) {
            console.error('Error checking boundaries:', error);
        }
    },
    
    takeDamage: function(amount) {
        try {
            if (this.isDead || this.invulnerable) return;
            
            const now = performance.now();
            this.health -= amount;
            
            // Create damage effect
            this.createDamageEffect();
            
            // Handle death
            if (this.health <= 0) {
                this.health = 0;
                this.die();
            }
            
            // Update UI
            this.updateHealthUI();
            
            // Set temporary invulnerability
            this.invulnerable = true;
            setTimeout(() => {
                this.invulnerable = false;
            }, this.invulnerabilityDuration);
            
            // Store last damage time for health regeneration
            this.lastDamageTime = now;
        } catch (error) {
            console.error('Error taking damage:', error);
        }
    },
    
    createDamageEffect: function() {
        try {
            // Screen overlay effect
            const damageOverlay = document.getElementById('damage-overlay');
            if (damageOverlay) {
                damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                setTimeout(() => {
                    damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
                }, 100);
            }
            
            // Camera shake effect
            if (this.camera) {
                const intensity = 0.5;
                const shake = {
                    x: (Math.random() * 2 - 1) * intensity,
                    y: (Math.random() * 2 - 1) * intensity,
                    z: (Math.random() * 2 - 1) * intensity
                };
                
                const originalPos = this.camera.getAttribute('position') || { x: 0, y: 0, z: 0 };
                this.camera.setAttribute('position', {
                    x: originalPos.x + shake.x,
                    y: originalPos.y + shake.y,
                    z: originalPos.z + shake.z
                });
                
                setTimeout(() => {
                    this.camera.setAttribute('position', originalPos);
                }, 100);
            }
        } catch (error) {
            console.error('Error creating damage effect:', error);
        }
    },
    
    die: function() {
        try {
            if (this.isDead) return;
            
            this.isDead = true;
            console.log('Player died');
            
            // Disable controls
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            
            if (this.camera) {
                this.camera.setAttribute('look-controls', 'enabled', false);
            }
            
            // Death animation
            this.el.setAttribute('animation', { 
                property: 'position.y', 
                to: '0.5', 
                dur: 1000, 
                easing: 'easeInQuad' 
            });
            
            if (this.camera) {
                this.camera.setAttribute('animation', { 
                    property: 'rotation.z', 
                    to: '90', 
                    dur: 1000, 
                    easing: 'easeInQuad' 
                });
            }
            
            // Emit death event
            this.el.emit('player-died', {});
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    },
    
    tick: function(time, delta) {
        try {
            const dt = delta / 1000; // Convert to seconds
            
            // Only process when pointer is locked (game is active)
            if (document.pointerLockElement) {
                // Update movement
                this.updateMovement(dt);
                
                // Health regeneration
                const now = performance.now();
                if (this.health < this.maxHealth && now - this.lastDamageTime > 5000) {
                    this.health += 5 * dt;
                    if (this.health > this.maxHealth) {
                        this.health = this.maxHealth;
                    }
                    this.updateHealthUI();
                }
                
                // Update dash UI if implemented
                this.updateDashUI();
            }
        } catch (error) {
            console.error('Error in player tick:', error);
        }
    },
    
    updateDashUI: function() {
        // If you have a dash cooldown UI element, update it here
        const dashCooldownEl = document.getElementById('dash-cooldown');
        if (dashCooldownEl) {
            const cooldownPercent = (this.dashCooldownRemaining / this.data.dashCooldown) * 100;
            dashCooldownEl.style.width = `${100 - cooldownPercent}%`;
            
            if (this.dashCooldownRemaining <= 0) {
                dashCooldownEl.style.backgroundColor = '#0ff'; // Cyan when ready
            } else {
                dashCooldownEl.style.backgroundColor = '#888'; // Gray when on cooldown
            }
        }
    },
    
    remove: function() {
        try {
            // Clean up event listeners
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            
            // Exit pointer lock if active
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        } catch (error) {
            console.error('Error removing player component:', error);
        }
    }
});