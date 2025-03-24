AFRAME.registerComponent('player-component', {
    schema: {
        speed: { type: 'number', default: 5 },
        jumpForce: { type: 'number', default: 15 },
        health: { type: 'number', default: 100 },
        gravity: { type: 'number', default: 30 }
    },

    init: function() {
        // References
        this.camera = this.el.querySelector('#camera');
        this.cameraEl = this.camera;

        // Player state
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.isOnGround = true;
        this.health = this.data.health;
        this.hits = 0;
        this.gameStarted = false;
        this.gameOver = false;

        // Raycaster for ground detection
        this.groundRaycaster = new THREE.Raycaster(
            new THREE.Vector3(),
            new THREE.Vector3(0, -1, 0),
            0,
            2
        );

        // Collision capsule (similar to original code)
        this.capsule = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.35, 1.0, 4, 8),
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                visible: false
            })
        );
        this.el.object3D.add(this.capsule);

        // Setup controls
        this.setupControls();

        // Event listeners
        this.el.addEventListener('start-game', this.startGame.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    },

    startGame: function() {
        this.gameStarted = true;
        this.lockControls();

        // Play background audio
        const audioEl = document.querySelector('#background-sound');
        audioEl.play();
    },

    lockControls: function() {
        document.body.requestPointerLock();
        this.controlsLocked = true;
    },

    setupControls: function() {
        this.keys = {
            KeyW: false,
            KeyA: false,
            KeyS: false,
            KeyD: false,
            Space: false
        };

        // Add click listener for shooting
        document.addEventListener('click', () => {
            if (!this.gameStarted || this.gameOver) return;

            // Trigger weapon shooting
            const weaponEl = document.getElementById('weapon');
            if (weaponEl) {
                weaponEl.components['weapon-component'].shoot();
            }
        });

        // Handle pointer lock
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                this.controlsLocked = true;
            } else {
                this.controlsLocked = false;
                if (this.gameStarted && !this.gameOver) {
                    document.getElementById('intro').classList.remove('hidden');
                }
            }
        });
    },

    onKeyDown: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = true;
        }
    },

    onKeyUp: function(event) {
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = false;
        }
    },

    updateMovement: function(dt) {
        const { speed, jumpForce, gravity } = this.data;

        // Reset velocity
        this.direction.set(0, 0, 0);

        // Get camera direction
        const rotation = this.cameraEl.getAttribute('rotation');
        const rotationRad = THREE.MathUtils.degToRad(rotation.y);

        // Forward/backward movement
        if (this.keys.KeyW) {
            this.direction.z = -Math.cos(rotationRad);
            this.direction.x = -Math.sin(rotationRad);
        } else if (this.keys.KeyS) {
            this.direction.z = Math.cos(rotationRad);
            this.direction.x = Math.sin(rotationRad);
        }

        // Left/right movement
        if (this.keys.KeyA) {
            this.direction.x = -Math.cos(rotationRad);
            this.direction.z = Math.sin(rotationRad);
        } else if (this.keys.KeyD) {
            this.direction.x = Math.cos(rotationRad);
            this.direction.z = -Math.sin(rotationRad);
        }

        // Normalize direction if moving
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }

        // Apply movement to velocity
        this.velocity.x = this.direction.x * speed;
        this.velocity.z = this.direction.z * speed;

        // Apply gravity
        if (!this.isOnGround) {
            this.velocity.y -= gravity * dt;
        } else if (this.keys.Space) {
            this.velocity.y = jumpForce;
            this.isOnGround = false;
        }

        // Update position
        const pos = this.el.object3D.position;
        pos.x += this.velocity.x * dt;
        pos.y += this.velocity.y * dt;
        pos.z += this.velocity.z * dt;

        // Check ground collision
        this.checkGroundCollision();

        // Check world boundaries
        this.checkWorldBoundaries();

        // Update health UI
        document.getElementById('health-value').textContent = Math.floor(this.health);
    },

    checkGroundCollision: function() {
        // Set raycaster origin to player position
        this.groundRaycaster.ray.origin.copy(this.el.object3D.position);

        // Raycast against world
        const worldEl = document.getElementById('world');
        if (worldEl && worldEl.object3D) {
            const intersects = this.groundRaycaster.intersectObject(worldEl.object3D, true);

            if (intersects.length > 0 && intersects[0].distance <= 1.8) {
                this.isOnGround = true;
                this.velocity.y = 0;
                this.el.object3D.position.y = intersects[0].point.y + 1.8;
            } else {
                this.isOnGround = false;
            }
        }
    },

    checkWorldBoundaries: function() {
        // Check if player is out of bounds
        const navmeshEl = document.getElementById('navmesh');
        if (navmeshEl && navmeshEl.components['navmesh-component']) {
            const isOutOfBounds = navmeshEl.components['navmesh-component'].isOutOfBounds(this.el.object3D.position);

            if (isOutOfBounds) {
                // Reduce health if out of bounds
                this.health -= 10 * (1 / 60); // Assuming 60fps
                document.getElementById('outOfBounce').style.display = 'block';
            } else {
                document.getElementById('outOfBounce').style.display = 'none';
            }
        }

        // Check if player fell off the map
        if (this.el.object3D.position.y < -20) {
            this.gameOver = true;
            this.el.emit('game-over', {});
        }
    },

    takeDamage: function(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.gameOver = true;
            this.el.emit('game-over', {});
        }
    },

    addHit: function() {
        this.hits++;
        document.getElementById('hits-value').textContent = this.hits;
    },

    tick: function(time, delta) {
        // Convert to seconds
        const dt = delta / 1000;

        if (this.gameStarted && !this.gameOver && this.controlsLocked) {
            this.updateMovement(dt);

            // Natural health regeneration
            if (this.health < 100) {
                this.health += dt; // Regenerate 1 health per second
                if (this.health > 100) this.health = 100;
            }
        }
    },

    remove: function() {
        // Clean up event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.exitPointerLock();
    }
});