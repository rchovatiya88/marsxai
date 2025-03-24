AFRAME.registerComponent('bomb-projectile', {
    schema: {
        initialVelocity: { type: 'vec3', default: { x: 0, y: 2, z: -15 } },
        gravity: { type: 'number', default: 9.8 },
        lifetime: { type: 'number', default: 10 }, // Seconds before self-destruct
        damage: { type: 'number', default: 75 },
        radius: { type: 'number', default: 5 }, // Explosion radius
        color: { type: 'color', default: '#ff0000' }
    },

    init: function() {
        try {
            // Create the bomb model
            this.createBombModel();

            // Set up physics properties
            this.velocity = new THREE.Vector3(
                this.data.initialVelocity.x,
                this.data.initialVelocity.y,
                this.data.initialVelocity.z
            );
            this.startTime = performance.now();
            this.lastGroundCheck = performance.now();
            this.groundCheckInterval = 50; // ms between ground checks

            // Set up collision detection
            this.collisionRadius = 0.2;
            this.hasExploded = false;

            // Add blinking effect for countdown
            this.setupBlinkingEffect();
        } catch (error) {
            console.error('Error initializing bomb projectile:', error);
        }
    },

    createBombModel: function() {
        try {
            // Create the bomb sphere
            const bomb = document.createElement('a-sphere');
            bomb.setAttribute('radius', '0.2');
            bomb.setAttribute('material', {
                color: '#333',
                metalness: 0.8,
                roughness: 0.2
            });
            this.el.appendChild(bomb);
            this.bombMesh = bomb;

            // Add a blinking light
            const light = document.createElement('a-light');
            light.setAttribute('type', 'point');
            light.setAttribute('color', this.data.color);
            light.setAttribute('intensity', '0.5');
            light.setAttribute('distance', '1');
            this.el.appendChild(light);
            this.blinkLight = light;

            // Add a small flame/fuse effect
            const fuse = document.createElement('a-entity');
            fuse.setAttribute('position', '0 0.25 0');
            fuse.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 10,
                color: 'orange, yellow',
                size: 0.05,
                duration: 0.2,
                maxAge: 0.2,
                direction: 'normal',
                velocity: 0.1
            });
            this.el.appendChild(fuse);
        } catch (error) {
            console.error('Error creating bomb model:', error);
        }
    },

    setupBlinkingEffect: function() {
        try {
            // Increase blink frequency as bomb gets closer to exploding
            this.blinkInterval = setInterval(() => {
                if (this.hasExploded) {
                    clearInterval(this.blinkInterval);
                    return;
                }

                // Calculate blink frequency based on time passed
                const timeElapsed = (performance.now() - this.startTime) / 1000;
                const timeRemaining = this.data.lifetime - timeElapsed;
                let blinkDuration;

                if (timeRemaining < 1) {
                    blinkDuration = 50; // Very fast blinking near the end
                } else if (timeRemaining < 3) {
                    blinkDuration = 200; // Fast blinking
                } else {
                    blinkDuration = 500; // Slow blinking
                }

                // Toggle light
                if (this.blinkLight) {
                    const currentIntensity = this.blinkLight.getAttribute('intensity');
                    this.blinkLight.setAttribute('intensity', currentIntensity > 0 ? 0 : 0.5);
                }
            }, 500);
        } catch (error) {
            console.error('Error setting up blinking effect:', error);
        }
    },

    tick: function(time, delta) {
        try {
            // Convert to seconds
            const dt = delta / 1000;

            // Skip if already exploded
            if (this.hasExploded) return;

            // Check lifetime
            if (performance.now() - this.startTime > this.data.lifetime * 1000) {
                this.explode();
                return;
            }

            // Apply gravity
            this.velocity.y -= this.data.gravity * dt;

            // Update position
            this.el.object3D.position.x += this.velocity.x * dt;
            this.el.object3D.position.y += this.velocity.y * dt;
            this.el.object3D.position.z += this.velocity.z * dt;

            // Check for ground and obstacle collisions
            if (performance.now() - this.lastGroundCheck > this.groundCheckInterval) {
                this.checkCollisions();
                this.lastGroundCheck = performance.now();
            }

            // Add rotation to make it look more dynamic
            this.el.object3D.rotation.x += dt * 2;
            this.el.object3D.rotation.y += dt * 1.5;
        } catch (error) {
            console.error('Error in bomb projectile tick:', error);
        }
    },

    checkCollisions: function() {
        try {
            // Check for ground collision
            if (this.el.object3D.position.y <= 0.2) {
                this.explode();
                return;
            }

            // Check for obstacles
            const obstacles = document.querySelectorAll('.obstacle, [ground]');
            const position = this.el.object3D.position;

            obstacles.forEach(obstacle => {
                if (obstacle.object3D) {
                    const obstaclePos = obstacle.object3D.position;
                    const obstacleSize = obstacle.getAttribute('width') || 1;

                    // Simple collision check
                    const dx = position.x - obstaclePos.x;
                    const dy = position.y - obstaclePos.y;
                    const dz = position.z - obstaclePos.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (distance < this.collisionRadius + obstacleSize / 2) {
                        this.explode();
                        return;
                    }
                }
            });

            // Check for enemies
            const enemies = document.querySelectorAll('[enemy-component]');

            enemies.forEach(enemy => {
                if (enemy.object3D) {
                    const enemyPos = enemy.object3D.position;

                    // Simple collision check
                    const dx = position.x - enemyPos.x;
                    const dy = position.y - enemyPos.y;
                    const dz = position.z - enemyPos.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (distance < this.collisionRadius + 0.8) { // Assuming enemy radius of 0.8
                        this.explode();
                        return;
                    }
                }
            });
        } catch (error) {
            console.error('Error checking collisions:', error);
        }
    },

    explode: function() {
        try {
            // Prevent multiple explosions
            if (this.hasExploded) return;
            this.hasExploded = true;

            // Clear blink interval
            if (this.blinkInterval) {
                clearInterval(this.blinkInterval);
            }

            // Get current position
            const position = this.el.object3D.position.clone();

            // Create explosion effect
            this.createExplosionEffect(position);

            // Apply damage to enemies in radius
            this.applyAreaDamage(position);

            // Play explosion sound
            // GAME_AUDIO.playExplosion();

            // Remove bomb after explosion
            setTimeout(() => {
                if (this.el.parentNode) {
                    this.el.parentNode.removeChild(this.el);
                }
            }, 100);
        } catch (error) {
            console.error('Error creating explosion:', error);
        }
    },

    createExplosionEffect: function(position) {
        try {
            const scene = document.querySelector('a-scene');

            // Create explosion entity
            const explosion = document.createElement('a-entity');
            explosion.setAttribute('position', position);

            // Add flash sphere
            const flash = document.createElement('a-sphere');
            flash.setAttribute('radius', '0.5');
            flash.setAttribute('material', {
                color: '#ff9',
                emissive: '#ff9',
                emissiveIntensity: 5,
                shader: 'standard',
                opacity: 0.9,
                transparent: true
            });
            flash.setAttribute('animation', {
                property: 'scale',
                from: '1 1 1',
                to: '10 10 10',
                dur: 500,
                easing: 'linear'
            });
            flash.setAttribute('animation__fade', {
                property: 'material.opacity',
                from: '0.9',
                to: '0',
                dur: 500,
                easing: 'linear'
            });
            explosion.appendChild(flash);

            // Add shock wave ring
            const ring = document.createElement('a-torus');
            ring.setAttribute('radius', '0.5');
            ring.setAttribute('radius-tubular', '0.1');
            ring.setAttribute('material', {
                color: this.data.color,
                emissive: this.data.color,
                emissiveIntensity: 3,
                shader: 'standard',
                opacity: 0.7,
                transparent: true
            });
            ring.setAttribute('animation', {
                property: 'scale',
                from: '1 1 1',
                to: `${this.data.radius * 2} ${this.data.radius * 2} ${this.data.radius * 2}`,
                dur: 700,
                easing: 'easeOutQuad'
            });
            ring.setAttribute('animation__fade', {
                property: 'material.opacity',
                from: '0.7',
                to: '0',
                dur: 700,
                easing: 'easeOutQuad'
            });
            explosion.appendChild(ring);

            // Add particles
            const particles = document.createElement('a-entity');
            particles.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 200,
                color: 'orange, yellow, red',
                size: 0.5,
                duration: 1,
                maxAge: 1,
                direction: 'random',
                velocity: 10
            });
            explosion.appendChild(particles);

            // Add bright light
            const light = document.createElement('a-light');
            light.setAttribute('type', 'point');
            light.setAttribute('color', '#ff9');
            light.setAttribute('intensity', '3');
            light.setAttribute('distance', this.data.radius * 2);
            light.setAttribute('animation', {
                property: 'intensity',
                from: '3',
                to: '0',
                dur: 700,
                easing: 'easeOutQuad'
            });
            explosion.appendChild(light);

            // Add to scene
            scene.appendChild(explosion);

            // Remove after animation completes
            setTimeout(() => {
                if (explosion.parentNode) {
                    explosion.parentNode.removeChild(explosion);
                }
            }, 1000);
        } catch (error) {
            console.error('Error creating explosion effect:', error);
        }
    },

    applyAreaDamage: function(position) {
        try {
            // Apply damage to enemies within radius
            const enemies = document.querySelectorAll('[enemy-component]');

            enemies.forEach(enemy => {
                if (enemy.object3D) {
                    const enemyPos = enemy.object3D.position;

                    // Calculate distance
                    const dx = position.x - enemyPos.x;
                    const dy = position.y - enemyPos.y;
                    const dz = position.z - enemyPos.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // Apply damage with falloff based on distance
                    if (distance <= this.data.radius) {
                        const damageMultiplier = 1 - (distance / this.data.radius);
                        const damage = this.data.damage * damageMultiplier;
                        enemy.components['enemy-component'].takeDamage(damage);
                    }
                }
            });

            // Apply damage to player if within radius
            const player = document.getElementById('player');
            if (player && player.components['player-component']) {
                const playerPos = player.object3D.position;

                // Calculate distance
                const dx = position.x - playerPos.x;
                const dy = position.y - playerPos.y;
                const dz = position.z - playerPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // Apply damage with falloff based on distance
                if (distance <= this.data.radius) {
                    const damageMultiplier = 1 - (distance / this.data.radius);
                    const damage = (this.data.damage / 3) * damageMultiplier; // Reduced self-damage
                    player.components['player-component'].takeDamage(damage);
                }
            }
        } catch (error) {
            console.error('Error applying area damage:', error);
        }
    },

    remove: function() {
        try {
            // Clean up timers
            if (this.blinkInterval) {
                clearInterval(this.blinkInterval);
            }
        } catch (error) {
            console.error('Error removing bomb projectile:', error);
        }
    }
});