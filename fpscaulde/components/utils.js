/**
 * Utility functions for the FPS game
 */

(function() {
    // Register particle system component (simple version)
    if (!AFRAME.components['particle-system']) {
        AFRAME.registerComponent('particle-system', {
            schema: {
                preset: { type: 'string', default: 'dust' },
                particleCount: { type: 'number', default: 20 },
                color: { type: 'string', default: '#fff' },
                size: { type: 'number', default: 0.1 },
                duration: { type: 'number', default: 1 },
                direction: { type: 'string', default: 'random' },
                velocity: { type: 'number', default: 1 }
            },
            
            init: function() {
                try {
                    // Create particle group
                    const system = this.createParticles();
                    this.el.setObject3D('particle-system', system);
                    
                    // Auto-remove after duration
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
                const size = this.data.size;
                const colors = this.data.color.split(',').map(c => c.trim());
                
                // Create particles
                for (let i = 0; i < count; i++) {
                    // Create particle geometry
                    const geometry = new THREE.SphereGeometry(size * Math.random() * 0.5, 4, 4);
                    
                    // Create material with random color from the color list
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const material = new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: Math.random() * 0.5 + 0.5
                    });
                    
                    // Create mesh and add to group
                    const particle = new THREE.Mesh(geometry, material);
                    
                    // Set random initial position based on preset
                    if (this.data.preset === 'dust') {
                        particle.position.set(
                            (Math.random() - 0.5) * size * 2,
                            (Math.random() - 0.5) * size * 2,
                            (Math.random() - 0.5) * size * 2
                        );
                    } else if (this.data.preset === 'explosion') {
                        // Start from center for explosion
                        particle.position.set(0, 0, 0);
                    }
                    
                    // Set random velocity
                    const velocity = this.data.velocity;
                    let vx, vy, vz;
                    
                    if (this.data.direction === 'random') {
                        // Random direction
                        vx = (Math.random() - 0.5) * velocity;
                        vy = (Math.random() - 0.5) * velocity;
                        vz = (Math.random() - 0.5) * velocity;
                    } else if (this.data.direction === 'normal') {
                        // Directional along normal (assumed to be +Z)
                        vx = (Math.random() - 0.5) * velocity * 0.3;
                        vy = (Math.random() - 0.5) * velocity * 0.3;
                        vz = Math.random() * velocity;
                    }
                    
                    // Store velocity in the particle userData
                    particle.userData.velocity = new THREE.Vector3(vx, vy, vz);
                    
                    // Store initial opacity and size for animations
                    particle.userData.initialOpacity = material.opacity;
                    particle.userData.initialScale = particle.scale.x;
                    
                    group.add(particle);
                }
                
                // Create animation function
                const duration = this.data.duration;
                const startTime = performance.now();
                
                const animateParticles = () => {
                    try {
                        const elapsedTime = (performance.now() - startTime) / 1000;
                        const progress = Math.min(elapsedTime / duration, 1);
                        
                        // Update all particles
                        group.children.forEach(particle => {
                            // Update position based on velocity
                            particle.position.x += particle.userData.velocity.x * 0.016;
                            particle.position.y += particle.userData.velocity.y * 0.016;
                            particle.position.z += particle.userData.velocity.z * 0.016;
                            
                            // Fade out
                            particle.material.opacity = particle.userData.initialOpacity * (1 - progress);
                            
                            // Scale down
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
                
                // Start animation
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
    
    // Helper functions
    window.GAME_UTILS = {
        /**
         * Create a random vector within a specified range
         */
        randomVector: function(min, max) {
            return new THREE.Vector3(
                min.x + Math.random() * (max.x - min.x),
                min.y + Math.random() * (max.y - min.y),
                min.z + Math.random() * (max.z - min.z)
            );
        },
        
        /**
         * Calculate distance between two entities
         */
        distanceBetween: function(entity1, entity2) {
            if (!entity1 || !entity2 || !entity1.object3D || !entity2.object3D) {
                return Infinity;
            }
            const pos1 = entity1.object3D.position;
            const pos2 = entity2.object3D.position;
            return pos1.distanceTo(pos2);
        },
        
        /**
         * Format number with commas for thousands
         */
        formatNumber: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        /**
         * Check if object is in view of camera
         */
        isInView: function(camera, object, fov) {
            if (!camera || !object) return false;
            
            const cameraPos = camera.object3D.position;
            const objPos = object.object3D.position;
            
            const dirToObj = new THREE.Vector3().subVectors(objPos, cameraPos).normalize();
            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.object3D.quaternion).normalize();
            
            const dot = dirToObj.dot(camForward);
            return dot > Math.cos(fov * Math.PI / 180); // Convert FOV to radians
        }
    };
})();
