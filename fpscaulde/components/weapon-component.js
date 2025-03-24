AFRAME.registerComponent('weapon-component', {
    schema: {
        damage: { type: 'number', default: 25 },
        cooldown: { type: 'number', default: 0.5 },
        range: { type: 'number', default: 50 },
        fireRate: { type: 'number', default: 0.1 }, // Time between shots for automatic weapons
        automatic: { type: 'boolean', default: false }, // Whether weapon fires continuously when mouse is held
        ammo: { type: 'number', default: -1 }, // -1 means infinite ammo
        clipSize: { type: 'number', default: 30 }, // Bullets before reload
        reloadTime: { type: 'number', default: 2 } // Time to reload in seconds
    },

    init: function() {
        try {
            // Weapon state
            this.lastShot = 0;
            this.ammoInClip = this.data.clipSize;
            this.totalAmmo = this.data.ammo;
            this.isReloading = false;
            this.isFiring = false;
            
            // Setup raycaster for shooting
            this.raycaster = new THREE.Raycaster();
            
            // Create weapon model
            this.createWeaponModel();
            
            // Add event listeners
            this.addEventListeners();
            
            // Create muzzle flash light
            this.createMuzzleFlashLight();
        } catch (error) {
            console.error('Error initializing weapon component:', error);
        }
    },
    
    createWeaponModel: function() {
        try {
            // Simple gun model
            const gun = document.createElement('a-entity');
            gun.setAttribute('id', 'gun-model');
            
            // Gun body
            const body = document.createElement('a-box');
            body.setAttribute('color', '#333');
            body.setAttribute('width', '0.1');
            body.setAttribute('height', '0.1');
            body.setAttribute('depth', '0.3');
            body.setAttribute('position', '0 0 -0.15');
            gun.appendChild(body);
            
            // Gun barrel
            const barrel = document.createElement('a-cylinder');
            barrel.setAttribute('color', '#222');
            barrel.setAttribute('radius', '0.03');
            barrel.setAttribute('height', '0.4');
            barrel.setAttribute('position', '0 0 -0.4');
            barrel.setAttribute('rotation', '90 0 0');
            gun.appendChild(barrel);
            
            // Gun grip
            const grip = document.createElement('a-box');
            grip.setAttribute('color', '#222');
            grip.setAttribute('width', '0.08');
            grip.setAttribute('height', '0.2');
            grip.setAttribute('depth', '0.1');
            grip.setAttribute('position', '0 -0.15 -0.1');
            grip.setAttribute('rotation', '20 0 0');
            gun.appendChild(grip);
            
            // Muzzle position (for effects)
            this.muzzlePos = document.createElement('a-entity');
            this.muzzlePos.setAttribute('id', 'muzzle-pos');
            this.muzzlePos.setAttribute('position', '0 0 -0.6');
            gun.appendChild(this.muzzlePos);
            
            this.el.appendChild(gun);
        } catch (error) {
            console.error('Error creating weapon model:', error);
        }
    },
    
    createMuzzleFlashLight: function() {
        try {
            // Create a light for muzzle flash
            this.muzzleLight = document.createElement('a-light');
            this.muzzleLight.setAttribute('type', 'point');
            this.muzzleLight.setAttribute('color', '#ff9');
            this.muzzleLight.setAttribute('intensity', '0');
            this.muzzleLight.setAttribute('distance', '3');
            this.muzzleLight.setAttribute('position', '0 0 -0.6');
            this.el.appendChild(this.muzzleLight);
        } catch (error) {
            console.error('Error creating muzzle flash light:', error);
        }
    },
    
    addEventListeners: function() {
        try {
            // Add mousedown/mouseup listeners for shooting
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            document.addEventListener('mousedown', this.onMouseDown);
            document.addEventListener('mouseup', this.onMouseUp);
            
            // Add reload key listener
            this.onKeyDown = this.onKeyDown.bind(this);
            document.addEventListener('keydown', this.onKeyDown);
        } catch (error) {
            console.error('Error adding event listeners:', error);
        }
    },
    
    onMouseDown: function(event) {
        // Only handle left mouse button
        if (event.button !== 0) return;
        
        // Only if pointer is locked
        if (!document.pointerLockElement) return;
        
        this.isFiring = true;
        
        if (this.data.automatic) {
            this.startAutoFire();
        } else {
            this.shoot();
        }
    },
    
    onMouseUp: function(event) {
        // Only handle left mouse button
        if (event.button !== 0) return;
        
        this.isFiring = false;
        
        if (this.data.automatic) {
            this.stopAutoFire();
        }
    },
    
    onKeyDown: function(event) {
        // R key for reload
        if (event.code === 'KeyR' && document.pointerLockElement) {
            this.reload();
        }
    },
    
    startAutoFire: function() {
        if (this.autoFireInterval) return;
        
        // Create interval for automatic fire
        this.autoFireInterval = setInterval(() => {
            if (this.isFiring && document.pointerLockElement) {
                this.shoot();
            } else if (!document.pointerLockElement) {
                this.stopAutoFire();
            }
        }, this.data.fireRate * 1000);
    },
    
    stopAutoFire: function() {
        if (this.autoFireInterval) {
            clearInterval(this.autoFireInterval);
            this.autoFireInterval = null;
        }
    },

    shoot: function() {
        try {
            const now = performance.now();
            
            // Check if reloading
            if (this.isReloading) return;
            
            // Check ammo
            if (this.ammoInClip <= 0) {
                this.reload();
                return;
            }
            
            // Check cooldown
            if (now - this.lastShot < this.data.cooldown * 1000) {
                return;
            }
            
            this.lastShot = now;
            this.ammoInClip--;
            this.updateAmmoDisplay();
            
            // Apply recoil effect
            this.applyRecoil();
            
            // Create muzzle flash effect
            this.createMuzzleFlash();
            
            // Set up raycaster from camera
            const camera = document.querySelector('a-camera').object3D;
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            
            this.raycaster.set(
                camera.position,
                direction
            );
            
            // Get all enemy entities
            const enemies = document.querySelectorAll('[enemy-component]');
            let hit = false;
            
            // Check for hits
            enemies.forEach(enemy => {
                if (enemy.object3D) {
                    const intersects = this.raycaster.intersectObject(enemy.object3D, true);
                    if (intersects.length > 0 && intersects[0].distance <= this.data.range) {
                        hit = true;
                        
                        // Apply damage to enemy
                        enemy.components['enemy-component'].takeDamage(this.data.damage);
                        
                        // Create hit effect
                        this.createHitEffect(intersects[0].point);
                    }
                }
            });
            
            // If no enemy hit, check for environment hit
            if (!hit) {
                const obstacles = document.querySelectorAll('.obstacle, [ground]');
                obstacles.forEach(obstacle => {
                    if (obstacle.object3D) {
                        const intersects = this.raycaster.intersectObject(obstacle.object3D, true);
                        if (intersects.length > 0 && intersects[0].distance <= this.data.range) {
                            // Create impact effect on obstacle
                            this.createImpactEffect(intersects[0].point, intersects[0].face.normal);
                        }
                    }
                });
            }
            
            // Emit shot event
            this.el.emit('weapon-shot', {
                damage: this.data.damage
            });
            
            // Auto reload if out of ammo
            if (this.ammoInClip <= 0) {
                this.reload();
            }
        } catch (error) {
            console.error('Error shooting weapon:', error);
        }
    },
    
    reload: function() {
        try {
            if (this.isReloading) return;
            if (this.ammoInClip === this.data.clipSize) return; // Already full
            if (this.data.ammo === 0) return; // No ammo left
            
            this.isReloading = true;
            
            // Update ammo display to show reloading
            const ammoDisplay = document.getElementById('ammo-display');
            if (ammoDisplay) {
                ammoDisplay.textContent = 'RELOADING...';
                ammoDisplay.style.color = 'yellow';
            }
            
            // Start reload animation
            const gunModel = document.getElementById('gun-model');
            if (gunModel) {
                gunModel.setAttribute('animation', {
                    property: 'rotation',
                    from: '0 0 0',
                    to: '-30 0 0',
                    dur: this.data.reloadTime * 500,
                    easing: 'easeOutQuad',
                    loop: 2,
                    dir: 'alternate'
                });
            }
            
            // Set timeout for reload completion
            setTimeout(() => {
                // Calculate new ammo count
                if (this.data.ammo === -1) {
                    // Infinite ammo
                    this.ammoInClip = this.data.clipSize;
                } else {
                    // Limited ammo
                    const ammoNeeded = this.data.clipSize - this.ammoInClip;
                    const ammoAvailable = Math.min(this.totalAmmo, ammoNeeded);
                    
                    this.ammoInClip += ammoAvailable;
                    this.totalAmmo -= ammoAvailable;
                }
                
                this.isReloading = false;
                this.updateAmmoDisplay();
            }, this.data.reloadTime * 1000);
        } catch (error) {
            console.error('Error reloading weapon:', error);
        }
    },
    
    updateAmmoDisplay: function() {
        try {
            const ammoDisplay = document.getElementById('ammo-display');
            if (ammoDisplay) {
                if (this.data.ammo === -1) {
                    // Infinite ammo
                    ammoDisplay.textContent = `${this.ammoInClip} / ∞`;
                } else {
                    ammoDisplay.textContent = `${this.ammoInClip} / ${this.totalAmmo}`;
                }
                
                // Change color when low on ammo
                if (this.ammoInClip === 0) {
                    ammoDisplay.style.color = 'red';
                } else if (this.ammoInClip <= this.data.clipSize * 0.25) {
                    ammoDisplay.style.color = 'orange';
                } else {
                    ammoDisplay.style.color = 'white';
                }
            }
        } catch (error) {
            console.error('Error updating ammo display:', error);
        }
    },
    
    applyRecoil: function() {
        try {
            // Apply a recoil effect to the weapon
            const gunModel = document.getElementById('gun-model');
            if (gunModel) {
                gunModel.setAttribute('animation__recoil', {
                    property: 'position',
                    from: '0 0 0',
                    to: '0 0.05 0.1',
                    dur: 50,
                    easing: 'easeOutQuad',
                    loop: 1,
                    dir: 'alternate'
                });
            }
        } catch (error) {
            console.error('Error applying recoil:', error);
        }
    },
    
    createMuzzleFlash: function() {
        try {
            // Flash the muzzle light
            this.muzzleLight.setAttribute('intensity', '2');
            setTimeout(() => {
                this.muzzleLight.setAttribute('intensity', '0');
            }, 50);
            
            // Create visual muzzle flash
            const flash = document.createElement('a-entity');
            flash.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
            flash.setAttribute('material', 'color: #ff6; emissive: #ff6; emissiveIntensity: 2; transparent: true; opacity: 0.7');
            flash.setAttribute('position', '0 0 -0.6');
            this.el.appendChild(flash);
            
            // Animate and remove
            flash.setAttribute('animation', {
                property: 'scale',
                from: '1 1 1',
                to: '0.1 0.1 0.1',
                dur: 100,
                easing: 'easeOutQuad'
            });
            
            setTimeout(() => {
                if (flash.parentNode) {
                    flash.parentNode.removeChild(flash);
                }
            }, 100);
        } catch (error) {
            console.error('Error creating muzzle flash:', error);
        }
    },
    
    createHitEffect: function(position) {
        try {
            // Create a hit marker at impact point
            const hit = document.createElement('a-entity');
            const scene = document.querySelector('a-scene');
            
            hit.setAttribute('position', position);
            
            // Blood splatter effect
            const blood = document.createElement('a-entity');
            blood.setAttribute('geometry', 'primitive: plane; width: 0.5; height: 0.5');
            blood.setAttribute('material', 'color: #900; src: #blood-texture; transparent: true; opacity: 0.9');
            blood.setAttribute('look-at', '[camera]');
            blood.setAttribute('animation', {
                property: 'scale',
                from: '1 1 1',
                to: '2 2 2',
                dur: 500,
                easing: 'easeOutQuad'
            });
            blood.setAttribute('animation__fade', {
                property: 'material.opacity',
                from: '0.9',
                to: '0',
                dur: 1000,
                easing: 'easeInQuad'
            });
            hit.appendChild(blood);
            
            scene.appendChild(hit);
            
            // Remove after duration
            setTimeout(() => {
                if (hit.parentNode) {
                    hit.parentNode.removeChild(hit);
                }
            }, 1000);
        } catch (error) {
            console.error('Error creating hit effect:', error);
        }
    },
    
    createImpactEffect: function(position, normal) {
        try {
            // Create impact effect on environment
            const impact = document.createElement('a-entity');
            const scene = document.querySelector('a-scene');
            
            impact.setAttribute('position', position);
            
            // Orient to face normal
            const lookAt = new THREE.Vector3().copy(position).add(normal);
            impact.setAttribute('look-at', `${lookAt.x} ${lookAt.y} ${lookAt.z}`);
            
            // Bullet hole
            const bulletHole = document.createElement('a-circle');
            bulletHole.setAttribute('radius', '0.05');
            bulletHole.setAttribute('material', 'color: #222; opacity: 0.9');
            bulletHole.setAttribute('position', '0 0 0.01'); // Slight offset to avoid z-fighting
            impact.appendChild(bulletHole);
            
            // Sparks effect
            const sparks = document.createElement('a-entity');
            sparks.setAttribute('position', '0 0 0');
            sparks.setAttribute('particle-system', {
                preset: 'dust',
                particleCount: 20,
                color: '#ff9',
                size: 0.1,
                duration: 0.5,
                direction: 'normal',
                velocity: 1
            });
            impact.appendChild(sparks);
            
            scene.appendChild(impact);
            
            // Remove after duration
            setTimeout(() => {
                if (impact.parentNode) {
                    impact.parentNode.removeChild(impact);
                }
            }, 3000);
        } catch (error) {
            console.error('Error creating impact effect:', error);
        }
    },

    tick: function(time, delta) {
        try {
            // Add weapon sway based on camera movement
            if (!this.isReloading && document.pointerLockElement) {
                const camera = document.querySelector('a-camera');
                if (camera && camera.components['look-controls']) {
                    const yawObject = camera.components['look-controls'].yawObject;
                    const pitchObject = camera.components['look-controls'].pitchObject;
                    
                    if (yawObject && pitchObject) {
                        // Get rotation velocities
                        const yawVelocity = (yawObject.rotation.y - (this.lastYaw || 0)) * 0.1;
                        const pitchVelocity = (pitchObject.rotation.x - (this.lastPitch || 0)) * 0.1;
                        
                        // Apply subtle weapon sway based on look movement
                        const gunModel = document.getElementById('gun-model');
                        if (gunModel) {
                            const currentPos = gunModel.getAttribute('position') || {x: 0, y: 0, z: 0};
                            
                            gunModel.setAttribute('position', {
                                x: currentPos.x - yawVelocity * 0.02,
                                y: currentPos.y + pitchVelocity * 0.02,
                                z: currentPos.z
                            });
                            
                            // Ease back to center if moved significantly
                            if (Math.abs(currentPos.x) > 0.05 || Math.abs(currentPos.y) > 0.05) {
                                gunModel.setAttribute('animation__sway', {
                                    property: 'position',
                                    to: '0 0 0',
                                    dur: 300,
                                    easing: 'easeOutQuad'
                                });
                            }
                        }
                        
                        // Store last values
                        this.lastYaw = yawObject.rotation.y;
                        this.lastPitch = pitchObject.rotation.x;
                    }
                }
            }
        } catch (error) {
            console.error('Error in weapon tick:', error);
        }
    },

    remove: function() {
        try {
            // Clean up event listeners
            document.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('keydown', this.onKeyDown);
            
            // Stop auto fire interval
            this.stopAutoFire();
        } catch (error) {
            console.error('Error removing weapon component:', error);
        }
    }
});
