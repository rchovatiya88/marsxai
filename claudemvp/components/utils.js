(function() {
    // Register particle system component if not already registered
    if (!AFRAME.components['particle-system']) {
        AFRAME.registerComponent('particle-system', {
            schema: {
                preset: { type: 'string', default: 'dust' },
                particleCount: { type: 'number', default: 20 },
                color: { type: 'string', default: '#fff' },
                size: { type: 'string', default: '0.1' }, // Changed to string to support comma-separated ranges
                duration: { type: 'number', default: 1 },
                direction: { type: 'string', default: 'random' },
                velocity: { type: 'number', default: 1 },
                directionVector: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
                spread: { type: 'number', default: 1 },
                gravity: { type: 'number', default: 0 }
            },
            init: function() {
                try {
                    const system = this.createParticles();
                    this.el.setObject3D('particle-system', system);
                    setTimeout(() => {
                        if (this.el && this.el.parentNode) {
                            this.el.parentNode.removeChild(this.el);
                        }
                    }, this.data.duration * 1000 + 100);
                } catch (error) {
                    console.error('Error initializing particle system:', error);
                }
            },
            createParticles: function() {
                const group = new THREE.Group();
                const count = this.data.particleCount;
                
                // Support size ranges like '0.1,0.2'
                const sizes = this.data.size.split(',').map(s => parseFloat(s.trim()));
                const minSize = sizes[0];
                const maxSize = sizes.length > 1 ? sizes[1] : sizes[0];
                
                const colors = this.data.color.split(',').map(c => c.trim());
                const directionVector = new THREE.Vector3(
                    this.data.directionVector.x, 
                    this.data.directionVector.y, 
                    this.data.directionVector.z
                );
                const spread = this.data.spread;
                const gravity = this.data.gravity;
                
                for (let i = 0; i < count; i++) {
                    const size = minSize + Math.random() * (maxSize - minSize);
                    const geometry = new THREE.SphereGeometry(size * 0.5, 4, 4);
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const material = new THREE.MeshBasicMaterial({ 
                        color: color, 
                        transparent: true, 
                        opacity: Math.random() * 0.5 + 0.5 
                    });
                    const particle = new THREE.Mesh(geometry, material);
                    
                    // Initial position with slight offset for variation
                    particle.position.set(
                        (Math.random() - 0.5) * size * 2,
                        (Math.random() - 0.5) * size * 2,
                        (Math.random() - 0.5) * size * 2
                    );
                    
                    // Set velocity based on direction
                    let vx, vy, vz;
                    if (this.data.direction === 'random') {
                        // Random direction in all dimensions
                        vx = directionVector.x + (Math.random() - 0.5) * this.data.velocity;
                        vy = directionVector.y + (Math.random() - 0.5) * this.data.velocity;
                        vz = directionVector.z + (Math.random() - 0.5) * this.data.velocity;
                    } else if (this.data.direction === 'normal') {
                        // Mostly following the normal with small variations
                        vx = directionVector.x + (Math.random() - 0.5) * this.data.velocity * 0.3;
                        vy = directionVector.y + (Math.random() - 0.5) * this.data.velocity * 0.3;
                        vz = directionVector.z + Math.random() * this.data.velocity;
                    }
                    
                    // Add spread for more variation
                    vx += (Math.random() - 0.5) * spread;
                    vy += (Math.random() - 0.5) * spread;
                    vz += (Math.random() - 0.5) * spread;
                    
                    // Store initial values for animation
                    particle.userData.velocity = new THREE.Vector3(vx, vy, vz);
                    particle.userData.initialOpacity = material.opacity;
                    particle.userData.initialScale = particle.scale.x;
                    group.add(particle);
                }
                
                // Animation loop
                const duration = this.data.duration;
                const startTime = performance.now();
                
                const animateParticles = () => {
                    try {
                        const elapsedTime = (performance.now() - startTime) / 1000;
                        const progress = Math.min(elapsedTime / duration, 1);
                        
                        // Update each particle's position, opacity, and scale
                        group.children.forEach(particle => {
                            // Apply gravity
                            particle.userData.velocity.y -= gravity * 0.016;
                            
                            // Move particle
                            particle.position.x += particle.userData.velocity.x * 0.016;
                            particle.position.y += particle.userData.velocity.y * 0.016;
                            particle.position.z += particle.userData.velocity.z * 0.016;
                            
                            // Fade out
                            particle.material.opacity = particle.userData.initialOpacity * (1 - progress);
                            
                            // Shrink slightly
                            const scale = particle.userData.initialScale * (1 - progress * 0.5);
                            particle.scale.set(scale, scale, scale);
                        });
                        
                        // Continue animation if not complete
                        if (progress < 1 && this.el && this.el.parentNode) {
                            requestAnimationFrame(animateParticles);
                        }
                    } catch (error) {
                        console.error('Error animating particles:', error);
                    }
                };
                
                requestAnimationFrame(animateParticles);
                return group;
            },
            remove: function() {
                try {
                    if (this.el) {
                        this.el.removeObject3D('particle-system');
                    }
                } catch (error) {
                    console.error('Error removing particle system:', error);
                }
            }
        });
    }
    
    // Utility functions accessible globally
    window.GAME_UTILS = {
        // Generate a random vector within a min/max range
        randomVector: function(min, max) {
            return new THREE.Vector3(
                min.x + Math.random() * (max.x - min.x),
                min.y + Math.random() * (max.y - min.y),
                min.z + Math.random() * (max.z - min.z)
            );
        },
        
        // Calculate distance between two entities
        distanceBetween: function(entity1, entity2) {
            if (!entity1 || !entity2 || !entity1.object3D || !entity2.object3D) {
                return Infinity;
            }
            const pos1 = entity1.object3D.position;
            const pos2 = entity2.object3D.position;
            return pos1.distanceTo(pos2);
        },
        
        // Format numbers with commas
        formatNumber: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        // Check if an object is in the camera's field of view
        isInView: function(camera, object, fov) {
            if (!camera || !object) return false;
            const cameraPos = camera.object3D.position;
            const objPos = object.object3D.position;
            const dirToObj = new THREE.Vector3().subVectors(objPos, cameraPos).normalize();
            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.object3D.quaternion).normalize();
            const dot = dirToObj.dot(camForward);
            return dot > Math.cos((fov || 45) * Math.PI / 180);
        },
        
        // Create visual effects for hits and impacts
        createEffect: function(type, position, options = {}) {
            const scene = document.querySelector('a-scene');
            if (!scene) return null;
            
            const effect = document.createElement('a-entity');
            effect.setAttribute('position', position);
            
            switch(type) {
                case 'hit':
                    // Blood splatter effect for enemy hits
                    const bloodSplatter = document.createElement('a-entity');
                    bloodSplatter.setAttribute('particle-system', {
                        preset: 'dust',
                        particleCount: options.particleCount || 30,
                        color: options.color || '#900,#700',
                        size: options.size || '0.05,0.1',
                        duration: options.duration || 1,
                        direction: 'normal',
                        velocity: options.velocity || 3,
                        gravity: 5,
                        spread: options.spread || 2
                    });
                    effect.appendChild(bloodSplatter);
                    
                    // Blood decal
                    const blood = document.createElement('a-circle');
                    blood.setAttribute('radius', options.radius || 0.2);
                    blood.setAttribute('material', {
                        color: '#700',
                        transparent: true,
                        opacity: 0.9,
                        shader: 'flat'
                    });
                    blood.setAttribute('look-at', '[camera]');
                    blood.setAttribute('animation', {
                        property: 'scale',
                        from: '0.5 0.5 0.5',
                        to: '1 1 1',
                        dur: 200,
                        easing: 'easeOutQuad'
                    });
                    blood.setAttribute('animation__fade', {
                        property: 'material.opacity',
                        from: 0.9,
                        to: 0,
                        delay: 1000,
                        dur: 1000,
                        easing: 'easeInQuad'
                    });
                    effect.appendChild(blood);
                    break;
                    
                case 'impact':
                    // Bullet impact on wall/environment
                    const impactParticles = document.createElement('a-entity');
                    impactParticles.setAttribute('particle-system', {
                        preset: 'dust',
                        particleCount: options.particleCount || 20,
                        color: options.color || '#aaa,#888',
                        size: options.size || '0.03,0.08',
                        duration: options.duration || 0.5,
                        direction: 'normal',
                        velocity: options.velocity || 2,
                        spread: options.spread || 1
                    });
                    effect.appendChild(impactParticles);
                    
                    // Bullet hole
                    const bulletHole = document.createElement('a-circle');
                    bulletHole.setAttribute('radius', options.radius || 0.05);
                    bulletHole.setAttribute('material', {
                        color: '#222',
                        transparent: true,
                        opacity: 0.9,
                        shader: 'flat'
                    });
                    if (options.normal) {
                        const lookAt = new THREE.Vector3().copy(position).add(options.normal);
                        bulletHole.setAttribute('look-at', `${lookAt.x} ${lookAt.y} ${lookAt.z}`);
                    } else {
                        bulletHole.setAttribute('look-at', '[camera]');
                    }
                    bulletHole.setAttribute('animation__fade', {
                        property: 'material.opacity',
                        from: 0.9,
                        to: 0.5,
                        delay: 5000,
                        dur: 2000,
                        easing: 'easeInQuad'
                    });
                    effect.appendChild(bulletHole);
                    break;
                    
                case 'explosion':
                    // Explosion particles
                    const explosionCore = document.createElement('a-entity');
                    explosionCore.setAttribute('particle-system', {
                        preset: 'dust',
                        particleCount: options.particleCount || 50,
                        color: '#ff9,#f60,#d40',
                        size: options.size || '0.2,0.5',
                        duration: options.duration || 1,
                        direction: 'random',
                        velocity: options.velocity || 5,
                        spread: options.spread || 3
                    });
                    effect.appendChild(explosionCore);
                    
                    // Smoke after explosion
                    const smoke = document.createElement('a-entity');
                    smoke.setAttribute('particle-system', {
                        preset: 'dust',
                        particleCount: 30,
                        color: '#888,#666,#444',
                        size: '0.3,0.7',
                        duration: 2,
                        direction: 'random',
                        velocity: 2,
                        spread: 2
                    });
                    smoke.setAttribute('position', '0 0.5 0');
                    effect.appendChild(smoke);
                    
                    // Light flash
                    const light = document.createElement('a-light');
                    light.setAttribute('type', 'point');
                    light.setAttribute('color', '#ff9');
                    light.setAttribute('intensity', 2);
                    light.setAttribute('distance', 10);
                    light.setAttribute('animation', {
                        property: 'intensity',
                        from: 2,
                        to: 0,
                        dur: 500,
                        easing: 'easeOutQuad'
                    });
                    effect.appendChild(light);
                    break;
            }
            
            scene.appendChild(effect);
            
            // Self-destruct after duration
            const duration = options.duration || 2;
            setTimeout(() => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            }, duration * 1000 + 5000);
            
            return effect;
        },
        
        // Play sound with variations
        playSound: function(name, position, options = {}) {
            try {
                const scene = document.querySelector('a-scene');
                if (!scene) return null;
                
                const sound = document.createElement('a-entity');
                sound.setAttribute('position', position);
                sound.setAttribute('sound', {
                    src: options.src || `#sound-${name}`,
                    volume: options.volume !== undefined ? options.volume : 1,
                    poolSize: options.poolSize || 5,
                    autoplay: true,
                    loop: !!options.loop,
                    maxDistance: options.maxDistance || 100,
                    refDistance: options.refDistance || 1,
                    rolloffFactor: options.rolloffFactor || 1
                });
                
                // Apply pitch variation if specified
                if (options.pitchVariation) {
                    const variation = (Math.random() * 2 - 1) * options.pitchVariation;
                    sound.setAttribute('sound', 'playbackRate', 1 + variation);
                }
                
                scene.appendChild(sound);
                
                // Remove sound entity after it's done playing
                if (!options.loop) {
                    const duration = options.duration || 2;
                    setTimeout(() => {
                        if (sound.parentNode) {
                            sound.parentNode.removeChild(sound);
                        }
                    }, duration * 1000 + 100);
                }
                
                return sound;
            } catch (error) {
                console.error('Error playing sound:', error);
                return null;
            }
        }
    };
})();