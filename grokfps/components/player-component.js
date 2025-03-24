AFRAME.registerComponent('player-component', {
    schema: {
        speed: { type: 'number', default: 5 },
        sprintMultiplier: { type: 'number', default: 1.5 },
        jumpForce: { type: 'number', default: 15 },
        health: { type: 'number', default: 100 },
        gravity: { type: 'number', default: 30 },
        height: { type: 'number', default: 1.6 }
    },
    init: function() {
        try {
            this.camera = this.el.querySelector('a-camera');
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.direction = new THREE.Vector3();
            this.isOnGround = true;
            this.isSprinting = false;
            this.health = this.data.health;
            this.maxHealth = this.data.health;
            this.isDead = false;
            this.lastDamageTime = 0;
            this.collisionRadius = 0.5;
            this.oldPosition = new THREE.Vector3();
            this.newPosition = new THREE.Vector3();
            this.groundRaycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 2);
            this.setupControls();
            this.updateHealthUI();
            this.footstepTime = 0;
            this.footstepInterval = 0.5;
            if (this.camera) {
                this.camera.setAttribute('wasd-controls', 'enabled', false);
            }
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
                if (healthPercent <= 25) {
                    healthBar.style.backgroundColor = '#f00';
                } else if (healthPercent <= 50) {
                    healthBar.style.backgroundColor = '#ff0';
                } else {
                    healthBar.style.backgroundColor = '#0f0';
                }
            }
        } catch (error) {
            console.error('Error updating health UI:', error);
        }
    },
    setupControls: function() {
        try {
            this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, Space: false, ShiftLeft: false };
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onKeyUp = this.onKeyUp.bind(this);
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);
        } catch (error) {
            console.error('Error setting up controls:', error);
        }
    },
    onKeyDown: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = true;
            if (event.code === 'ShiftLeft') {
                this.isSprinting = true;
                this.footstepInterval = 0.3;
            }
        }
    },
    onKeyUp: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = false;
            if (event.code === 'ShiftLeft') {
                this.isSprinting = false;
                this.footstepInterval = 0.5;
            }
        }
    },
    updateMovement: function(dt) {
        try {
            if (this.isDead) return;
            const { speed, jumpForce, gravity, sprintMultiplier } = this.data;
            this.oldPosition.copy(this.el.object3D.position);
            this.direction.set(0, 0, 0);
            const rotation = this.camera.getAttribute('rotation');
            const rotationRad = THREE.MathUtils.degToRad(rotation.y);
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
            if (this.direction.length() > 0) {
                this.direction.normalize();
            }
            const currentSpeed = this.isSprinting ? speed * sprintMultiplier : speed;
            this.velocity.x = this.direction.x * currentSpeed;
            this.velocity.z = this.direction.z * currentSpeed;
            if (!this.isOnGround) {
                this.velocity.y -= gravity * dt;
            } else if (this.keys.Space) {
                this.velocity.y = jumpForce;
                this.isOnGround = false;
            }
            const pos = this.el.object3D.position;
            pos.x += this.velocity.x * dt;
            pos.y += this.velocity.y * dt;
            pos.z += this.velocity.z * dt;
            this.newPosition.copy(this.el.object3D.position);
            this.checkGroundCollision();
            this.checkObstacleCollisions();
            this.checkBoundaries();
            if (this.isMoving() && this.isOnGround) {
                this.footstepTime += dt;
                if (this.footstepTime >= this.footstepInterval) {
                    this.footstepTime = 0;
                }
            }
        } catch (error) {
            console.error('Error updating movement:', error);
        }
    },
    isMoving: function() {
        return this.keys.KeyW || this.keys.KeyA || this.keys.KeyS || this.keys.KeyD;
    },
    checkGroundCollision: function() {
        try {
            this.groundRaycaster.ray.origin.copy(this.el.object3D.position);
            if (this.el.object3D.position.y <= this.data.height) {
                this.el.object3D.position.y = this.data.height;
                this.velocity.y = 0;
                this.isOnGround = true;
                return;
            }
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
                    const dx = playerPos.x - obstaclePos.x;
                    const dz = playerPos.z - obstaclePos.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    const minDistance = this.collisionRadius + Math.max(obstacleWidth, obstacleDepth) / 2;
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
            const boundaries = { minX: -24, maxX: 24, minZ: -24, maxZ: 24 };
            const pos = this.el.object3D.position;
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
            if (this.isDead) return;
            const now = performance.now();
            this.health -= amount;
            this.createDamageEffect();
            if (this.health <= 0) {
                this.health = 0;
                this.die();
            }
            this.updateHealthUI();
            this.lastDamageTime = now;
        } catch (error) {
            console.error('Error taking damage:', error);
        }
    },
    createDamageEffect: function() {
        try {
            const damageOverlay = document.getElementById('damage-overlay');
            if (damageOverlay) {
                damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                setTimeout(() => {
                    damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
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
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (this.camera) {
                this.camera.setAttribute('look-controls', 'enabled', false);
            }
            this.el.setAttribute('animation', { property: 'position.y', to: '0.5', dur: 1000, easing: 'easeInQuad' });
            if (this.camera) {
                this.camera.setAttribute('animation', { property: 'rotation.z', to: '90', dur: 1000, easing: 'easeInQuad' });
            }
            this.el.emit('player-died', {});
        } catch (error) {
            console.error('Error handling player death:', error);
        }
    },
    tick: function(time, delta) {
        try {
            const dt = delta / 1000;
            if (document.pointerLockElement) {
                this.updateMovement(dt);
                const now = performance.now();
                if (this.health < this.maxHealth && now - this.lastDamageTime > 5000) {
                    this.health += 5 * dt;
                    if (this.health > this.maxHealth) {
                        this.health = this.maxHealth;
                    }
                    this.updateHealthUI();
                }
            }
        } catch (error) {
            console.error('Error in player tick:', error);
        }
    },
    remove: function() {
        try {
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        } catch (error) {
            console.error('Error removing player component:', error);
        }
    }
});