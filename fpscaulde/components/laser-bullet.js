AFRAME.registerComponent('laser-bullet', {
    schema: {
        color: { type: 'color', default: '#ff0000' },
        speed: { type: 'number', default: 50 },
        length: { type: 'number', default: 2 },
        lifetime: { type: 'number', default: 1.5 }, // Seconds before disappearing
        damage: { type: 'number', default: 25 }
    },

    init: function() {
        try {
            // Create the laser beam
            this.createLaserBeam();
            
            // Set up physics
            this.velocity = new THREE.Vector3(0, 0, -this.data.speed);
            this.direction = new THREE.Vector3(0, 0, -1);
            this.startPosition = new THREE.Vector3();
            this.startPosition.copy(this.el.object3D.position);
            this.startTime = performance.now();
            
            // Set up raycaster for hit detection
            this.raycaster = new THREE.Raycaster();
            this.raycaster.far = this.data.length;
        } catch (error) {
            console.error('Error initializing laser bullet:', error);
        }
    },
    
    createLaserBeam: function() {
        try {
            // Create the laser cylinder
            const laserBeam = document.createElement('a-entity');
            laserBeam.setAttribute('geometry', {
                primitive: 'cylinder',
                radius: 0.05,
                height: this.data.length,
                segmentsHeight: 1,
                segmentsRadial: 8
            });
            
            // Create a glowing material for the laser
            laserBeam.setAttribute('material', {
                color: this.data.color,
                emissive: this.data.color,
                emissiveIntensity: 2,
                shader: 'standard',
                metalness: 0.2,
                roughness: 0.3,
                opacity: 0.8,
                transparent: true
            });
            
            // Position it so its back end is at the entity origin
            // and it extends forward along the negative z-axis
            laserBeam.setAttribute('position', `0 0 ${-this.data.length/2}`);
            laserBeam.setAttribute('rotation', '90 0 0');
            
            this.el.appendChild(laserBeam);
            this.laserBeam = laserBeam;
            
            // Add a glow effect at the front
            const glow = document.createElement('a-entity');
            glow.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
            glow.setAttribute('material', {
                color: this.data.color,
                emissive: this.data.color,
                emissiveIntensity: 3,
                shader: 'standard',
                opacity: 0.7,
                transparent: true
            });
            glow.setAttribute('position', `0 0 ${-this.data.length}`);
            this.el.appendChild(glow);
            this.glow = glow;
            
            // Add a light to make it glow
            const light = document.createElement('a-light');
            light.setAttribute('type', 'point');
            light.setAttribute('color', this.data.color);
            light.setAttribute('intensity', '0.5');
            light.setAttribute('distance', '2');
            light.setAttribute('position', `0 0 ${-this.data.length}`);
            this.el.appendChild(light);
            this.light = light;
            
            // Add a particle trail
            const particles = document.createElement('a-entity');
            particles.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 50,
                color: this.data.color,
                size: 0.05,
                duration: 0.5,
                direction: 'random',
                velocity: 0.1
            });
            particles.setAttribute('position', `0 0 ${-this.data.length/2}`);
            this.el.appendChild(particles);
        } catch (error) {
            console.error('Error creating laser beam:', error);
        }
    },
    
    update: function(oldData) {
        // Update laser properties if data changes
        if (this.laserBeam && oldData.color !== this.data.color) {
            this.laserBeam.setAttribute('material', 'color', this.data.color);
            this.laserBeam.setAttribute('material', 'emissive', this.data.color);
            if (this.glow) {
                this.glow.setAttribute('material', 'color', this.data.color);
                this.glow.setAttribute('material', 'emissive', this.data.color);
            }
            if (this.light) {
                this.light.setAttribute('color', this.data.color);
            }
        }
    },
    
    tick: function(time, delta) {
        try {
            // Convert to seconds
            const dt = delta / 1000;
            
            // Check lifetime
            if (performance.now() - this.startTime > this.data.lifetime * 1000) {
                this.remove();
                return;
            }
            
            // Update position
            this.el.object3D.position.x += this.velocity.x * dt;
            this.el.object3D.position.y += this.velocity.y * dt;
            this.el.object3D.position.z += this.velocity.z * dt;
            
            // Check for hits
            this.checkCollisions();
            
            // Check if too far from start
            const distance = this.el.object3D.position.distanceTo(this.startPosition);
            if (distance > 100) {
                this.remove();
            }
        } catch (error) {
            console.error('Error in laser bullet tick:', error);
        }
    },
    
    checkCollisions: function() {
        try {
            // Set up raycaster
            const position = this.el.object3D.position;
            this.raycaster.set(position, this.direction);
            
            // Check for enemy hits first
            const enemies = document.querySelectorAll('[enemy-component]');
            let hitEnemy = false;
            
            enemies.forEach(enemy => {
                if (enemy.object3D && !hitEnemy) {
                    const intersects = this.raycaster.intersectObject(enemy.object3D, true);
                    if (intersects.length > 0 && intersects[0].distance <= this.data.length) {
                        // Hit an enemy
                        this.hitEntity(enemy, intersects[0].point);
                        enemy.components['enemy-component'].takeDamage(this.data.damage);
                        hitEnemy = true;
                    }
                }
            });
            
            // If no enemy was hit, check for environment hits
            if (!hitEnemy) {
                const obstacles = document.querySelectorAll('.obstacle, [ground]');
                obstacles.forEach(obstacle => {
                    if (obstacle.object3D) {
                        const intersects = this.raycaster.intersectObject(obstacle.object3D, true);
                        if (intersects.length > 0 && intersects[0].distance <= this.data.length) {
                            // Hit an obstacle
                            this.hitEntity(obstacle, intersects[0].point);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error checking collisions:', error);
        }
    },
    
    hitEntity: function(entity, point) {
        try {
            // Create hit effect
            const hitEffect = document.createElement('a-entity');
            hitEffect.setAttribute('position', point);
            
            // Create glow at hit point
            const glow = document.createElement('a-entity');
            glow.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
            glow.setAttribute('material', {
                color: this.data.color,
                emissive: this.data.color,
                emissiveIntensity: 2,
                shader: 'standard',
                opacity: 0.7,
                transparent: true
            });
            hitEffect.appendChild(glow);
            
            // Add particle explosion
            const particles = document.createElement('a-entity');
            particles.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 20,
                color: this.data.color,
                size: 0.1,
                duration: 0.5,
                direction: 'normal',
                velocity: 1
            });
            hitEffect.appendChild(particles);
            
            // Add to scene
            document.querySelector('a-scene').appendChild(hitEffect);
            
            // Remove after duration
            setTimeout(() => {
                if (hitEffect.parentNode) {
                    hitEffect.parentNode.removeChild(hitEffect);
                }
            }, 500);
            
            // Remove the bullet
            this.remove();
        } catch (error) {
            console.error('Error creating hit effect:', error);
        }
    },
    
    remove: function() {
        try {
            if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        } catch (error) {
            console.error('Error removing laser bullet:', error);
        }
    }
});
