AFRAME.registerComponent('weapon-component', {
    schema: {
        type: { type: 'string', default: 'RayGun' },
        power: { type: 'number', default: 1000000 },
        cooldown: { type: 'number', default: 0.5 }
    },

    init: function() {
        // References
        this.camera = document.getElementById('camera');
        this.el.setAttribute('gltf-model', '#raygun-model');

        // Weapon state
        this.lastShot = 0;
        this.power = this.data.power;
        this.isReady = false;

        // Setup raycaster for shooting
        this.shootRaycaster = new THREE.Raycaster();

        // Listen for model loaded event
        this.el.addEventListener('model-loaded', () => {
            this.isReady = true;
            this.setupWeaponEffects();
        });
    },

    setupWeaponEffects: function() {
        // Need to set up animation mixers and actions similar to the original code
        // This would require access to the loaded model's animation clips

        // Get the 3D object
        const model = this.el.getObject3D('mesh');
        if (!model) return;

        // Create animation mixer
        this.mixer = new THREE.AnimationMixer(model);

        // We would need to create animation actions for:
        // - shot action for rotation
        // - shot position action
        // - color change action
        // - explosion animation

        // For demonstration, we'll just create a simple position animation
        const times = [0, 0.1, 0.3];
        const values = [0, 0, 0, 0, 0, 0.1, 0, 0, 0];

        const positionTrack = new THREE.VectorKeyframeTrack('.position', times, values);
        this.shotAction = new THREE.AnimationClip('shot', -1, [positionTrack]);

        // Create the animation action
        this.shotActionMixer = this.mixer.clipAction(this.shotAction);
        this.shotActionMixer.loop = THREE.LoopOnce;
        this.shotActionMixer.clampWhenFinished = true;
    },

    shoot: function() {
        const now = performance.now();

        // Check cooldown
        if (now - this.lastShot < this.data.cooldown * 1000) {
            return;
        }

        this.lastShot = now;

        // Play shot animation if available
        if (this.shotActionMixer) {
            this.shotActionMixer.stop();
            this.shotActionMixer.play();
        }

        // Play sound effect
        const audio = document.querySelector('#shot-sound');
        if (audio) {
            if (audio.paused === false) {
                audio.pause();
                audio.currentTime = 0;
            }
            audio.play();
        }

        // Set up raycaster from camera
        const cameraEl = this.camera;
        const direction = new THREE.Vector3(0, 0, -1);
        direction.unproject(cameraEl.object3D);

        this.shootRaycaster.set(
            cameraEl.object3D.position,
            direction.sub(cameraEl.object3D.position).normalize()
        );

        // Get all zombie entities
        const zombies = document.querySelectorAll('[zombie-component]');
        let hitZombies = [];

        // Check for intersections with zombies
        zombies.forEach(zombie => {
            if (zombie.object3D) {
                const intersects = this.shootRaycaster.intersectObject(zombie.object3D, true);
                if (intersects.length > 0) {
                    hitZombies.push({
                        zombie: zombie,
                        distance: intersects[0].distance
                    });
                }
            }
        });

        // Sort hit zombies by distance
        hitZombies.sort((a, b) => a.distance - b.distance);

        // Apply damage to hit zombies (with falloff for secondary targets)
        if (hitZombies.length > 0) {
            // First zombie takes full damage
            hitZombies[0].zombie.components['zombie-component'].takeDamage(this.power);

            // Second zombie takes half damage
            if (hitZombies.length > 1) {
                hitZombies[1].zombie.components['zombie-component'].takeDamage(this.power * 0.5);
            }

            // Third zombie takes small damage
            if (hitZombies.length > 2) {
                hitZombies[2].zombie.components['zombie-component'].takeDamage(this.power * 0.1);
            }
        }

        // Emit shot event for other components to react to
        this.el.emit('weapon-shot', { power: this.power });
    },

    tick: function(time, delta) {
        // Update animation mixer if available
        if (this.mixer) {
            this.mixer.update(delta / 1000);
        }
    }
});