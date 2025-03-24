AFRAME.registerComponent('enemy-component', {
    schema: {
        health: { type: 'number', default: 100 },
        speed: { type: 'number', default: 2 },
        attackPower: { type: 'number', default: 10 },
        attackRate: { type: 'number', default: 1 },
        detectionRange: { type: 'number', default: 20 },
        attackRange: { type: 'number', default: 2 }
    },
    init: function() {
        try {
            this.health = this.data.health;
            this.isDead = false;
            this.lastAttack = 0;
            this.currentState = 'idle';
            this.playerEntity = document.getElementById('player');
            this.obstacleCheckInterval = 100;
            this.lastObstacleCheck = 0;
            this.stuckTime = 0;
            this.stuckThreshold = 2000;
            this.lastPosition = new THREE.Vector3();
            this.createEnemyModel();
            this.setupYukaAI();
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].registerEnemy(this);
            }
        } catch (error) {
            console.error('Error initializing enemy component:', error);
        }
    },
    createEnemyModel: function() {
        try {
            const body = document.createElement('a-box');
            body.setAttribute('color', 'red');
            body.setAttribute('width', '0.8');
            body.setAttribute('height', '1.6');
            body.setAttribute('depth', '0.8');
            body.setAttribute('position', '0 0.8 0');
            this.el.appendChild(body);
            const head = document.createElement('a-sphere');
            head.setAttribute('color', 'darkred');
            head.setAttribute('radius', '0.3');
            head.setAttribute('position', '0 1.8 0');
            this.el.appendChild(head);
            const leftEye = document.createElement('a-sphere');
            leftEye.setAttribute('color', 'black');
            leftEye.setAttribute('radius', '0.05');
            leftEye.setAttribute('position', '-0.15 1.85 0.25');
            this.el.appendChild(leftEye);
            const rightEye = document.createElement('a-sphere');
            rightEye.setAttribute('color', 'black');
            rightEye.setAttribute('radius', '0.05');
            rightEye.setAttribute('position', '0.15 1.85 0.25');
            this.el.appendChild(rightEye);
        } catch (error) {
            console.error('Error creating enemy model:', error);
        }
    },
    setupYukaAI: function() {
        try {
            this.vehicle = new YUKA.Vehicle();
            const position = this.el.getAttribute('position');
            this.vehicle.position.set(position.x, position.y, position.z);
            this.lastPosition.copy(this.vehicle.position);
            this.vehicle.maxSpeed = this.data.speed;
            this.vehicle.maxForce = 10;
            this.vehicle.mass = 1;
            this.seekBehavior = new YUKA.SeekBehavior();
            this.seekBehavior.active = false;
            this.vehicle.steering.add(this.seekBehavior);
            this.separationBehavior = new YUKA.SeparationBehavior();
            this.separationBehavior.active = false;
            this.vehicle.steering.add(this.separationBehavior);
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].entityManager.add(this.vehicle);
            }
        } catch (error) {
            console.error('Error setting up Yuka AI:', error);
        }
    },
    updateAI: function(dt) {
        try {
            if (this.isDead) return;
            if (!this.playerEntity || !this.playerEntity.object3D) return;
            const playerPos = this.playerEntity.object3D.position;
            const enemyPos = this.el.object3D.position;
            const distance = new THREE.Vector3(playerPos.x - enemyPos.x, 0, playerPos.z - enemyPos.z).length();
            if (distance <= this.data.detectionRange) {
                if (distance <= this.data.attackRange) {
                    if (this.currentState !== 'attack') {
                        this.setState('attack');
                    }
                    this.attackPlayer();
                    this.seekBehavior.active = false;
                    this.separationBehavior.active = false;
                } else {
                    if (this.currentState !== 'chase') {
                        this.setState('chase');
                    }
                    this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
                    this.seekBehavior.active = true;
                    this.separationBehavior.active = true;
                }
            } else {
                if (this.currentState !== 'idle') {
                    this.setState('idle');
                }
                this.seekBehavior.active = false;
                this.separationBehavior.active = false;
            }
            this.el.object3D.position.x = this.vehicle.position.x;
            this.el.object3D.position.z = this.vehicle.position.z;
            if ((this.currentState === 'chase' || this.currentState === 'attack') && distance > 0.1) {
                const lookAt = new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z);
                this.el.object3D.lookAt(lookAt);
            }
            const now = performance.now();
            if (now - this.lastObstacleCheck > this.obstacleCheckInterval) {
                this.checkIfStuck(now);
                this.lastObstacleCheck = now;
            }
        } catch (error) {
            console.error('Error updating AI:', error);
        }
    },
    checkIfStuck: function(now) {
        try {
            if (this.currentState !== 'chase') {
                this.stuckTime = 0;
                this.lastPosition.copy(this.vehicle.position);
                return;
            }
            const distanceMoved = this.lastPosition.distanceTo(new THREE.Vector3(this.vehicle.position.x, this.vehicle.position.y, this.vehicle.position.z));
            if (distanceMoved < 0.05) {
                this.stuckTime += this.obstacleCheckInterval;
                if (this.stuckTime > this.stuckThreshold) {
                    this.tryToUnstick();
                    this.stuckTime = 0;
                }
            } else {
                this.stuckTime = 0;
            }
            this.lastPosition.copy(this.vehicle.position);
        } catch (error) {
            console.error('Error checking if stuck:', error);
        }
    },
    tryToUnstick: function() {
        try {
            const jitterAmount = 0.5;
            this.vehicle.position.x += (Math.random() * 2 - 1) * jitterAmount;
            this.vehicle.position.z += (Math.random() * 2 - 1) * jitterAmount;
            const originalSpeed = this.vehicle.maxSpeed;
            this.vehicle.maxSpeed *= 1.5;
            setTimeout(() => {
                this.vehicle.maxSpeed = originalSpeed;
            }, 500);
        } catch (error) {
            console.error('Error trying to unstick:', error);
        }
    },
    setState: function(state) {
        try {
            if (this.currentState === state) return;
            this.currentState = state;
            if (state === 'idle') {
                this.el.querySelector('a-box').setAttribute('color', 'red');
            } else if (state === 'chase') {
                this.el.querySelector('a-box').setAttribute('color', 'orange');
            } else if (state === 'attack') {
                this.el.querySelector('a-box').setAttribute('color', 'darkred');
            }
        } catch (error) {
            console.error('Error setting state:', error);
        }
    },
    attackPlayer: function() {
        try {
            const now = performance.now();
            if (now - this.lastAttack < this.data.attackRate * 1000) {
                return;
            }
            this.lastAttack = now;
            if (this.playerEntity && this.playerEntity.components['player-component']) {
                this.playerEntity.components['player-component'].takeDamage(this.data.attackPower);
            }
            this.flashColor('darkred', 'red', 200);
        } catch (error) {
            console.error('Error attacking player:', error);
        }
    },
    takeDamage: function(amount) {
        try {
            if (this.isDead) return;
            this.health -= amount;
            this.flashColor('yellow', this.currentState === 'idle' ? 'red' : 'orange', 100);
            if (this.health <= 0) {
                this.die();
            } else {
                this.setState('chase');
                if (this.playerEntity && this.playerEntity.object3D) {
                    const playerPos = this.playerEntity.object3D.position;
                    this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
                    this.seekBehavior.active = true;
                    this.separationBehavior.active = true;
                }
            }
        } catch (error) {
            console.error('Error taking damage:', error);
        }
    },
    flashColor: function(flashColor, returnColor, duration) {
        try {
            const body = this.el.querySelector('a-box');
            if (!body) return;
            const originalColor = body.getAttribute('color');
            body.setAttribute('color', flashColor);
            setTimeout(() => {
                if (!this.isDead && body.parentNode) {
                    body.setAttribute('color', returnColor || originalColor);
                }
            }, duration);
        } catch (error) {
            console.error('Error flashing color:', error);
        }
    },
    die: function() {
        try {
            if (this.isDead) return;
            this.isDead = true;
            const bodyEl = this.el.querySelector('a-box');
            const headEl = this.el.querySelector('a-sphere');
            if (bodyEl) bodyEl.setAttribute('color', 'black');
            if (headEl) headEl.setAttribute('color', 'black');
            if (this.seekBehavior) this.seekBehavior.active = false;
            if (this.separationBehavior) this.separationBehavior.active = false;
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager']) {
                gameManager.components['game-manager'].entityManager.remove(this.vehicle);
                gameManager.components['game-manager'].enemyKilled(this);
            }
            this.el.setAttribute('animation__fall', { property: 'rotation.z', to: 90, dur: 1000, easing: 'easeOutQuad' });
            setTimeout(() => {
                this.el.setAttribute('animation__fade', { property: 'scale', to: '0 0 0', dur: 1000, easing: 'easeInQuad' });
                setTimeout(() => {
                    if (this.el.parentNode) {
                        this.el.parentNode.removeChild(this.el);
                    }
                }, 1000);
            }, 1500);
        } catch (error) {
            console.error('Error handling enemy death:', error);
        }
    },
    tick: function(time, delta) {
        try {
            const dt = delta / 1000;
            this.updateAI(dt);
        } catch (error) {
            console.error('Error in enemy tick:', error);
        }
    },
    remove: function() {
        try {
            const gameManager = document.querySelector('[game-manager]');
            if (gameManager && gameManager.components['game-manager'] && this.vehicle) {
                gameManager.components['game-manager'].entityManager.remove(this.vehicle);
                gameManager.components['game-manager'].unregisterEnemy(this);
            }
        } catch (error) {
            console.error('Error removing enemy component:', error);
        }
    }
});