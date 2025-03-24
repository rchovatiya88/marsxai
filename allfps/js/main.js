// Draco Loader Component: Configures a custom GLTFLoader with DRACOLoader
AFRAME.registerComponent('draco-loader', {
    init: function() {
        const sceneEl = this.el;
        const customLoader = new THREE.GLTFLoader();
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        customLoader.setDRACOLoader(dracoLoader);

        // Override A-Frame's default GLTF loader for all gltf-model components
        sceneEl.addEventListener('loaded', () => {
            AFRAME.components['gltf-model'].Component.prototype.load = function(src) {
                return new Promise((resolve, reject) => {
                    customLoader.load(
                        src,
                        (gltf) => {
                            this.model = gltf.scene || gltf.scenes[0];
                            resolve(this.model);
                        },
                        undefined,
                        (error) => reject(error)
                    );
                });
            };
        });
    }
});

// Custom FPS Controls Component: Implements first-person camera and movement
AFRAME.registerComponent('custom-fps-controls', {
    dependencies: ['position', 'rotation'],
    init: function() {
        this.camera = this.el.querySelector('#camera');
        this.controls = new THREE.PointerLockControls(this.camera.object3D, document.body);
        this.velocity = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveSpeed = 10.0;

        // Lock controls on click
        document.addEventListener('click', () => {
            this.controls.lock();
        });

        // Keyboard event listeners
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
    },
    tick: function(time, delta) {
        delta /= 1000; // Convert to seconds
        const velocity = this.velocity;
        const moveSpeed = this.moveSpeed;

        // Smooth deceleration
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        // Apply movement
        if (this.moveForward) velocity.z -= moveSpeed * delta;
        if (this.moveBackward) velocity.z += moveSpeed * delta;
        if (this.moveLeft) velocity.x -= moveSpeed * delta;
        if (this.moveRight) velocity.x += moveSpeed * delta;

        // Update position
        this.controls.moveRight(velocity.x * delta);
        this.controls.moveForward(-velocity.z * delta);
    },
    onKeyDown: function(event) {
        switch (event.keyCode) {
            case 87: // W
                this.moveForward = true;
                break;
            case 83: // S
                this.moveBackward = true;
                break;
            case 65: // A
                this.moveLeft = true;
                break;
            case 68: // D
                this.moveRight = true;
                break;
        }
    },
    onKeyUp: function(event) {
        switch (event.keyCode) {
            case 87: // W
                this.moveForward = false;
                break;
            case 83: // S
                this.moveBackward = false;
                break;
            case 65: // A
                this.moveLeft = false;
                break;
            case 68: // D
                this.moveRight = false;
                break;
        }
    }
});

// Shoot Component: Handles bullet spawning on click
AFRAME.registerComponent('shoot', {
    init: function() {
        this.el.addEventListener('click', () => {
            this.shoot();
        });
    },
    shoot: function() {
        const scene = this.el.sceneEl;
        const bullet = document.createElement('a-sphere');
        bullet.setAttribute('radius', '0.05');
        bullet.setAttribute('color', 'blue');
        const gun = this.el.querySelector('#gun');
        const gunWorldPos = new THREE.Vector3();
        gun.object3D.getWorldPosition(gunWorldPos);
        bullet.setAttribute('position', gunWorldPos);
        const camera = this.el.querySelector('#camera');
        const direction = new THREE.Vector3();
        camera.object3D.getWorldDirection(direction);
        const speed = 20;
        bullet.setAttribute('bullet', { velocity: direction.multiplyScalar(speed) });
        scene.appendChild(bullet);
    }
});

// Bullet Component: Moves bullets and checks collisions
AFRAME.registerComponent('bullet', {
    schema: {
        velocity: { type: 'vec3' }
    },
    init: function() {
        this.velocity = new THREE.Vector3(this.data.velocity.x, this.data.velocity.y, this.data.velocity.z);
        this.lifetime = 2;
        this.timer = 0;
    },
    tick: function(time, delta) {
        delta = delta / 1000;
        this.timer += delta;
        if (this.timer > this.lifetime) {
            this.el.parentNode.removeChild(this.el);
            return;
        }
        const pos = this.el.object3D.position;
        const newPos = pos.clone().add(this.velocity.clone().multiplyScalar(delta));
        this.el.object3D.position.copy(newPos);
        const enemies = document.querySelectorAll('.enemy');
        for (let enemy of enemies) {
            if (enemy.parentNode) {
                const enemyPos = enemy.object3D.position;
                const distance = newPos.distanceTo(enemyPos);
                if (distance < 0.5) {
                    enemy.parentNode.removeChild(enemy);
                    this.el.parentNode.removeChild(this.el);
                    this.el.sceneEl.emit('enemy-killed');
                    break;
                }
            }
        }
    }
});

// YUKA Behavior Component: Controls enemy AI
AFRAME.registerComponent('yuka-behavior', {
    init: function() {
        this.vehicle = new YUKA.Vehicle();
        this.vehicle.position.copy(this.el.object3D.position);
        this.vehicle.maxSpeed = 3;

        // Add seek behavior
        this.seekBehavior = new YUKA.SeekBehavior();
        this.seekBehavior.target = new YUKA.Vector3(); // Initialize target
        this.vehicle.steering.add(this.seekBehavior);

        // Add wander behavior
        this.wanderBehavior = new YUKA.WanderBehavior();
        this.wanderBehavior.weight = 0.5;
        this.vehicle.steering.add(this.wanderBehavior);

        // Add obstacle avoidance behavior
        this.obstacleAvoidanceBehavior = new YUKA.ObstacleAvoidanceBehavior();
        this.obstacleAvoidanceBehavior.target = new YUKA.Vector3(); // Initialize target
        this.obstacleAvoidanceBehavior.weight = 1;
        this.vehicle.steering.add(this.obstacleAvoidanceBehavior);

        this.player = document.querySelector('#player');
    },
    tick: function(time, delta) {
        if (this.player) {
            this.seekBehavior.target.copy(this.player.object3D.position);
            this.obstacleAvoidanceBehavior.target.copy(this.player.object3D.position);
        }
        this.vehicle.update(delta / 1000);
        this.el.object3D.position.copy(this.vehicle.position);
    }
});