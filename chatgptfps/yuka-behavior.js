// Custom YUKA steering behaviors (as before)
class CustomPursueBehavior extends YUKA.SteeringBehavior {
    constructor(target) {
        super();
        this.target = target;
        this.predictTime = 1;
    }
    calculate(vehicle, force) {
        if (!this.target) return force;
        const direction = this.target.position.clone().sub(vehicle.position);
        const distance = direction.length();
        const speed = vehicle.getSpeed();
        let prediction = speed > 0 ? Math.min(distance / speed, this.predictTime) : this.predictTime;
        const predictedPosition = this.target.position.clone();
        if (this.target.velocity) {
            predictedPosition.add(this.target.velocity.clone().multiplyScalar(prediction));
        }
        force.add(this._seek(vehicle, predictedPosition));
        return force;
    }
    _seek(vehicle, targetPosition) {
        const desiredVelocity = targetPosition.clone().sub(vehicle.position).normalize().multiplyScalar(vehicle.maxSpeed);
        return desiredVelocity.sub(vehicle.velocity);
    }
}

class CustomFleeBehavior extends YUKA.SteeringBehavior {
    constructor(target) {
        super();
        this.target = target;
        this.panicDistance = 10;
    }
    calculate(vehicle, force) {
        if (!this.target) return force;
        const desiredVelocity = vehicle.position.clone().sub(this.target).normalize();
        const distance = vehicle.position.distanceTo(this.target);
        if (distance <= this.panicDistance) {
            const scale = YUKA.MathUtils.clamp(1.0 - distance / this.panicDistance, 0, 1);
            desiredVelocity.multiplyScalar(vehicle.maxSpeed * scale);
            force.add(desiredVelocity.sub(vehicle.velocity));
        }
        return force;
    }
}

AFRAME.registerComponent('yuka-behavior', {
    schema: { team: { type: 'string', default: 'red' } },
    init: function() {
        // Initialize YUKA vehicle and steering behaviors
        this.vehicle = new YUKA.Vehicle();
        this.vehicle.position.copy(this.el.object3D.position);
        this.vehicle.maxSpeed = 3;
        this.opponentsTeam = this.data.team === 'red' ? 'blue' : 'red';
        this.mood = Math.random() < 0.5 ? 'aggressive' : 'scared';

        this.pursueBehavior = new CustomPursueBehavior(new YUKA.Vehicle());
        this.fleeBehavior = new CustomFleeBehavior(new YUKA.Vector3());
        this.vehicle.steering.add(this.pursueBehavior);
        this.vehicle.steering.add(this.fleeBehavior);
        this.updateWeights();

        this.targetUpdateTime = 0.5;
        this.moodUpdateTime = 5;
        this.targetTimer = 0;
        this.moodTimer = 0;
    },
    tick: function(time, delta) {
        let deltaS = delta / 1000;
        this.targetTimer += deltaS;
        this.moodTimer += deltaS;
        if (this.targetTimer >= this.targetUpdateTime) {
            this.updateTarget();
            this.targetTimer = 0;
        }
        if (this.moodTimer >= this.moodUpdateTime) {
            if (Math.random() < 0.5) {
                this.mood = (this.mood === 'aggressive') ? 'scared' : 'aggressive';
                this.updateWeights();
            }
            this.moodTimer = 0;
        }
        this.vehicle.update(deltaS);
        // Keep enemy on the plane by clamping y-position.
        this.vehicle.position.y = 0.5;
        this.el.object3D.position.copy(this.vehicle.position);

        // Simple obstacle avoidance: if too close to any obstacle, nudge away.
        const obstacles = document.querySelectorAll('.obstacle');
        obstacles.forEach(obstacle => {
            const obsPos = obstacle.object3D.position;
            const enemyPos = this.vehicle.position;
            const dist = enemyPos.distanceTo(obsPos);
            if (dist < 1.5) {
                // Compute a push vector away from the obstacle.
                const push = enemyPos.clone().sub(obsPos).normalize().multiplyScalar(0.05);
                this.vehicle.position.add(push);
            }
        });
    },
    updateTarget: function() {
        // Find nearest opponent entity with yuka-behavior and matching team.
        let opponents = document.querySelectorAll(`[yuka-behavior][team="${this.opponentsTeam}"]`);
        if (!opponents.length) return;
        let minDist = Infinity,
            nearest = null;
        let myPos = this.vehicle.position;
        opponents.forEach(opponent => {
            let oppPos = opponent.object3D.position;
            let dist = myPos.distanceTo(oppPos);
            if (dist < minDist) {
                minDist = dist;
                nearest = opponent;
            }
        });
        if (nearest) {
            const oppComp = nearest.components['yuka-behavior'];
            if (oppComp && oppComp.vehicle) {
                this.pursueBehavior.target = oppComp.vehicle;
            }
            this.fleeBehavior.target = nearest.object3D.position;
        }
    },
    updateWeights: function() {
        if (this.mood === 'aggressive') {
            this.pursueBehavior.weight = 1;
            this.fleeBehavior.weight = 0;
        } else {
            this.pursueBehavior.weight = 0;
            this.fleeBehavior.weight = 1;
        }
    }
});