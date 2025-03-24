AFRAME.registerComponent('weapon-component', {
    schema: {
        damage: { type: 'number', default: 25 },
        cooldown: { type: 'number', default: 0.5 },
        range: { type: 'number', default: 50 },
        fireRate: { type: 'number', default: 0.1 },
        automatic: { type: 'boolean', default: false },
        ammo: { type: 'number', default: -1 },
        clipSize: { type: 'number', default: 30 },
        reloadTime: { type: 'number', default: 2 }
    },

    init: function() {
        try {
            this.lastShot = 0;
            this.ammoInClip = this.data.clipSize;
            this.totalAmmo = this.data.ammo;
            this.isReloading = false;
            this.isFiring = false;
            this.raycaster = new THREE.Raycaster();
            this.createWeaponModel();
            this.addEventListeners();
            this.createMuzzleFlashLight();
        } catch (error) {
            console.error('Error initializing weapon component:', error);
        }
    },

    createWeaponModel: function() {
        try {
            const gun = document.createElement('a-entity');
            gun.setAttribute('id', 'gun-model');
            const body = document.createElement('a-box');
            body.setAttribute('color', '#333');
            body.setAttribute('width', '0.1');
            body.setAttribute('height', '0.1');
            body.setAttribute('depth', '0.3');
            body.setAttribute('position', '0 0 -0.15');
            gun.appendChild(body);
            const barrel = document.createElement('a-cylinder');
            barrel.setAttribute('color', '#222');
            barrel.setAttribute('radius', '0.03');
            barrel.setAttribute('height', '0.4');
            barrel.setAttribute('position', '0 0 -0.4');
            barrel.setAttribute('rotation', '90 0 0');
            gun.appendChild(barrel);
            const grip = document.createElement('a-box');
            grip.setAttribute('color', '#222');
            grip.setAttribute('width', '0.08');
            grip.setAttribute('height', '0.2');
            grip.setAttribute('depth', '0.1');
            grip.setAttribute('position', '0 -0.15 -0.1');
            grip.setAttribute('rotation', '20 0 0');
            gun.appendChild(grip);
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
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            document.addEventListener('mousedown', this.onMouseDown);
            document.addEventListener('mouseup', this.onMouseUp);
            this.onKeyDown = this.onKeyDown.bind(this);
            document.addEventListener('keydown', this.onKeyDown);
        } catch (error) {
            console.error('Error adding event listeners:', error);
        }
    },

    onMouseDown: function(event) {
        if (event.button !== 0) return;
        if (!document.pointerLockElement) return;
        this.isFiring = true;
        if (this.data.automatic) {
            this.startAutoFire();
        } else {
            this.shoot();
        }
    },

    onMouseUp: function(event) {
        if (event.button !== 0) return;
        this.isFiring = false;
        if (this.data.automatic) {
            this.stopAutoFire();
        }
    },

    onKeyDown: function(event) {
        if (event.code === 'KeyR' && document.pointerLockElement) {
            this.reload();
        }
    },

    startAutoFire: function() {
        if (this.autoFireInterval) return;
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
            if (this.isReloading || this.ammoInClip <= 0 || now - this.lastShot < this.data.cooldown * 1000) {
                if (this.ammoInClip <= 0) this.reload();
                return;
            }
            this.lastShot = now;
            this.ammoInClip--;
            this.updateAmmoDisplay();
            this.applyRecoil();
            this.createMuzzleFlash();

            const camera = document.querySelector('a-camera').object3D;
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            this.raycaster.set(camera.position, direction);

            // Collect all hittable targets
            const allTargets = [];
            const enemies = document.querySelectorAll('[enemy-component]');
            enemies.forEach(enemy => {
                if (enemy.object3D) allTargets.push(enemy.object3D);
            });
            const obstacles = document.querySelectorAll('.obstacle, [ground]');
            obstacles.forEach(obstacle => {
                if (obstacle.object3D) allTargets.push(obstacle.object3D);
            });

            // Perform raycast against all targets
            const intersects = this.raycaster.intersectObjects(allTargets, true);
            if (intersects.length > 0) {
                const closestHit = intersects[0];
                const hitPoint = closestHit.point;
                let hitEntity = closestHit.object.el;
                while (!hitEntity && closestHit.object.parent) {
                    closestHit.object = closestHit.object.parent;
                    hitEntity = closestHit.object.el;
                }
                if (hitEntity && closestHit.distance <= this.data.range) {
                    if (hitEntity.hasAttribute('enemy-component')) {
                        hitEntity.components['enemy-component'].takeDamage(this.data.damage);
                        this.createHitEffect(hitPoint);
                    } else {
                        this.createImpactEffect(hitPoint, closestHit.face.normal);
                    }
                }
                this.createTracer(camera.position, hitPoint);
            } else {
                const endPoint = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(this.data.range));
                this.createTracer(camera.position, endPoint);
            }

            this.el.emit('weapon-shot', { damage: this.data.damage });
            if (this.ammoInClip <= 0) this.reload();
        } catch (error) {
            console.error('Error shooting weapon:', error);
        }
    },

    createTracer: function(start, end) {
        try {
            const tracer = document.createElement('a-box');
            const direction = new THREE.Vector3().subVectors(end, start);
            const distance = direction.length();
            direction.normalize();
            tracer.setAttribute('position', start);
            tracer.setAttribute('width', '0.02');
            tracer.setAttribute('height', distance);
            tracer.setAttribute('depth', '0.02');
            tracer.setAttribute('color', '#ff0');
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            tracer.object3D.quaternion.copy(quaternion);
            const scene = document.querySelector('a-scene');
            scene.appendChild(tracer);
            setTimeout(() => {
                if (tracer.parentNode) tracer.parentNode.removeChild(tracer);
            }, 100);
        } catch (error) {
            console.error('Error creating tracer:', error);
        }
    },

    createMuzzleFlash: function() {
        try {
            this.muzzleLight.setAttribute('intensity', '2');
            setTimeout(() => {
                this.muzzleLight.setAttribute('intensity', '0');
            }, 50);
            const muzzlePos = this.el.querySelector('#muzzle-pos');
            if (muzzlePos) {
                const particles = document.createElement('a-entity');
                particles.setAttribute('particle-system', {
                    preset: 'dust',
                    particleCount: 100, // Increased for more intensity
                    color: '#ff9,#f90', // Yellow and orange mix
                    size: '0.02,0.03',
                    duration: 0.2,
                    direction: 'random',
                    velocity: 15,
                    directionVector: { x: 0, y: 0, z: -20 },
                    spread: 5
                });
                particles.setAttribute('position', muzzlePos.getAttribute('position'));
                this.el.appendChild(particles);
                setTimeout(() => {
                    if (particles.parentNode) particles.parentNode.removeChild(particles);
                }, 200);
            }
        } catch (error) {
            console.error('Error creating muzzle flash:', error);
        }
    },

    reload: function() {
        try {
            if (this.isReloading || this.ammoInClip === this.data.clipSize || this.data.ammo === 0) return;
            this.isReloading = true;
            const ammoDisplay = document.getElementById('ammo-display');
            if (ammoDisplay) {
                ammoDisplay.textContent = 'RELOADING...';
                ammoDisplay.style.color = 'yellow';
            }
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
            setTimeout(() => {
                if (this.data.ammo === -1) {
                    this.ammoInClip = this.data.clipSize;
                } else {
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
                    ammoDisplay.textContent = `${this.ammoInClip} / ∞`;
                } else {
                    ammoDisplay.textContent = `${this.ammoInClip} / ${this.totalAmmo}`;
                }
                ammoDisplay.style.color = this.ammoInClip === 0 ? 'red' : this.ammoInClip <= this.data.clipSize * 0.25 ? 'orange' : 'white';
            }
        } catch (error) {
            console.error('Error updating ammo display:', error);
        }
    },

    applyRecoil: function() {
        try {
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

    createHitEffect: function(position) {
        try {
            const hit = document.createElement('a-entity');
            hit.setAttribute('position', position);
            const blood = document.createElement('a-entity');
            blood.setAttribute('geometry', 'primitive: plane; width: 0.5; height: 0.5');
            blood.setAttribute('material', 'color: #900; transparent: true; opacity: 0.9');
            blood.setAttribute('look-at', '[camera]');
            blood.setAttribute('animation', { property: 'scale', from: '1 1 1', to: '2 2 2', dur: 500, easing: 'easeOutQuad' });
            blood.setAttribute('animation__fade', { property: 'material.opacity', from: '0.9', to: '0', dur: 1000, easing: 'easeInQuad' });
            hit.appendChild(blood);
            const scene = document.querySelector('a-scene');
            scene.appendChild(hit);
            setTimeout(() => {
                if (hit.parentNode) hit.parentNode.removeChild(hit);
            }, 1000);
        } catch (error) {
            console.error('Error creating hit effect:', error);
        }
    },

    createImpactEffect: function(position, normal) {
        try {
            const impact = document.createElement('a-entity');
            impact.setAttribute('position', position);
            const lookAt = new THREE.Vector3().copy(position).add(normal);
            impact.setAttribute('look-at', `${lookAt.x} ${lookAt.y} ${lookAt.z}`);
            const bulletHole = document.createElement('a-circle');
            bulletHole.setAttribute('radius', '0.05');
            bulletHole.setAttribute('material', 'color: #222; opacity: 0.9');
            bulletHole.setAttribute('position', '0 0 0.01');
            impact.appendChild(bulletHole);
            const sparks = document.createElement('a-entity');
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
            const scene = document.querySelector('a-scene');
            scene.appendChild(impact);
            setTimeout(() => {
                if (impact.parentNode) impact.parentNode.removeChild(impact);
            }, 3000);
        } catch (error) {
            console.error('Error creating impact effect:', error);
        }
    },

    tick: function(time, delta) {
        try {
            if (!this.isReloading && document.pointerLockElement) {
                const camera = document.querySelector('a-camera');
                if (camera && camera.components['look-controls']) {
                    const yawObject = camera.components['look-controls'].yawObject;
                    const pitchObject = camera.components['look-controls'].pitchObject;
                    if (yawObject && pitchObject) {
                        const yawVelocity = (yawObject.rotation.y - (this.lastYaw || 0)) * 0.1;
                        const pitchVelocity = (pitchObject.rotation.x - (this.lastPitch || 0)) * 0.1;
                        const gunModel = document.getElementById('gun-model');
                        if (gunModel) {
                            const currentPos = gunModel.getAttribute('position') || { x: 0, y: 0, z: 0 };
                            gunModel.setAttribute('position', {
                                x: currentPos.x - yawVelocity * 0.02,
                                y: currentPos.y + pitchVelocity * 0.02,
                                z: currentPos.z
                            });
                            if (Math.abs(currentPos.x) > 0.05 || Math.abs(currentPos.y) > 0.05) {
                                gunModel.setAttribute('animation__sway', {
                                    property: 'position',
                                    to: '0 0 0',
                                    dur: 300,
                                    easing: 'easeOutQuad'
                                });
                            }
                        }
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
            document.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('keydown', this.onKeyDown);
            this.stopAutoFire();
        } catch (error) {
            console.error('Error removing weapon component:', error);
        }
    }
});