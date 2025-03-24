AFRAME.registerComponent('zombie-component', {
    schema: {
        health: { type: 'number', default: 100 },
        speed: { type: 'number', default: 1.0 },
        attackPower: { type: 'number', default: 10 },
        attackRate: { type: 'number', default: 1.0 },
        id: { type: 'string', default: '' }
    },

    init: function() {
        // Set up zombie model
        this.el.setAttribute('gltf-model', '#zombie-model');

        // State
        this.health = this.data.health;
        this.speed = this.data.speed;
        this.isAttacking = false;
        this.isDead = false;
        this.isOut = false;
        this.lastAttack = 0;
        this.currentState = 'idle';
        this.attackDistance = 3;
        this.playerEntity = document.getElementById('player');

        // Set up Yuka vehicle for AI movement
        this.vehicle = new YUKA.Vehicle();
        this.vehicle.maxSpeed = this.data.speed;
        this.vehicle.mass = 0.1;

        // Set up behavior for AI
        this.steering = new YUKA.SteeringBehavior();
        this.seekBehavior = new YUKA.SeekBehavior();
        this.seekBehavior.active = false;
        this.vehicle.steering.add(this.seekBehavior);

        // Set initial position
        const pos = this.el.getAttribute('position');
        this.vehicle.position.set(pos.x, pos.y, pos.z);

        // Listen for model loaded event to setup animations
        this.el.addEventListener('model-loaded', this.setupAnimations.bind(this));

        // Add to the entity manager when the world component is ready
        document.querySelector('[world-manager]').addEventListener('world-ready', () => {
            const worldManager = document.querySelector('[world-manager]').components['world-manager'];
            worldManager.entityManager.add(this.vehicle);
            worldManager.addZombie(this);
        });
    },

    setupAnimations: function() {
        const model = this.el.getObject3D('mesh');
        if (!model) return;

        // Create animation mixer
        this.mixer = new THREE.AnimationMixer(model);

        // Get animation clips from the model
        const animationList = this.el.getObject3D('mesh').animations;
        if (!animationList || animationList.length === 0) return;

        // Store animations in a map
        this.animations = {
            idle: this.mixer.clipAction(animationList.find(a => a.name === 'idle') || animationList[0]),
            walk: this.mixer.clipAction(animationList.find(a => a.name === 'walk') || animationList[0]),
            attack: this.mixer.clipAction(animationList.find(a => a.name === 'attack') || animationList[0]),
            out: this.mixer.clipAction(animationList.find(a => a.name === 'out') || animationList[0])
        };

        // Set up animation properties
        for (const name in this.animations) {
            const animation = this.animations[name];
            animation.enabled = false;
            animation.setEffectiveTimeScale(1);
            animation.setEffectiveWeight(1);
        }

        // Start with idle animation
        this.animations.idle.enabled = true;
        this.animations.idle.play();

        // Change state to idle
        this.setState('idle');
    },

    setState: function(state) {
        if (this.currentState === state) return;

        // Disable current animation
        if (this.animations && this.animations[this.currentState]) {
            const current = this.animations[this.currentState];
            current.enabled = false;
            current.fadeOut(0.5);
        }

        // Enable new animation
        if (this.animations && this.animations[state]) {
            const next = this.animations[state];
            next.enabled = true;
            next.reset().fadeIn(0.5).play();
        }

        this.currentState = state;

        // Update behavior based on state
        if (state === 'walk') {
            this.seekBehavior.active = true;
        } else if (state === 'attack') {
            this.seekBehavior.active = false;
        } else if (state === 'out' || state === 'idle') {
            this.seekBehavior.active = false;
        }
    },

    takeDamage: function(amount) {
        if (this.isDead || this.isOut) return;

        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    },

    die: function() {
        this.isDead = true;
        this.setState('out');

        // Play out sound
        const audio = document.querySelector('#out-sound');
        if (audio) {
            audio.play();
        }

        // Let the player know about the kill
        this.playerEntity.components['player-component'].addHit();

        // Remove from scene after animation
        setTimeout(() => {
            // Remove from entity manager
            const worldManager = document.querySelector('[world-manager]').components['world-manager'];
            worldManager.entityManager.remove(this.vehicle);
            worldManager.removeZombie(this);

            // Remove from scene
            this.el.parentNode.removeChild(this.el);
        }, 1000);
    },

    attack: function() {
        const now = performance.now();

        // Check attack cooldown
        if (now - this.lastAttack < this.data.attackRate * 1000) {
            return;
        }

        this.lastAttack = now;

        // Deal damage to player
        this.playerEntity.components['player-component'].takeDamage(this.data.attackPower);
    },

    updateAI: function(dt) {
        if (this.isDead || this.isOut) return;

        // Get player position
        const playerPos = this.playerEntity.object3D.position;

        // Calculate distance to player
        const zombiePos = this.el.object3D.position;
        const distance = new THREE.Vector3(
            playerPos.x - zombiePos.x,
            0, // Ignore Y axis
            playerPos.z - zombiePos.z
        ).length();

        // Update seek target
        this.seekBehavior.target.copy(playerPos);

        // State transitions based on distance
        if (distance <= this.attackDistance) {
            if (this.currentState !== 'attack') {
                this.setState('attack');
            }
            this.attack();
        } else {
            if (this.currentState !== 'walk') {
                this.setState('walk');
            }
        }

        // Apply Yuka's vehicle movement to A-Frame entity
        this.el.object3D.position.copy(this.vehicle.position);

        // Set rotation to face target
        if (distance > 0.1) {
            const lookAt = new THREE.Vector3(playerPos.x, zombiePos.y, playerPos.z);
            this.el.object3D.lookAt(lookAt);
        }
    },

    tick: function(time, delta) {
        // Convert to seconds
        const dt = delta / 1000;

        // Update animations
        if (this.mixer) {
            this.mixer.update(dt);
        }

        // Update AI
        this.updateAI(dt);
    },

    remove: function() {
        // Clean up Yuka vehicle
        const worldManager = document.querySelector('[world-manager]').components['world-manager'];
        if (worldManager && this.vehicle) {
            worldManager.entityManager.remove(this.vehicle);
            worldManager.removeZombie(this);
        }
    }
});