AFRAME.registerComponent('ui-component', {
    init: function() {
        // Create UI elements if not already existing
        this.createUIElements();

        // Listen for game events
        this.el.sceneEl.addEventListener('game-over', this.onGameOver.bind(this));
        this.el.sceneEl.addEventListener('level-change', this.onLevelChange.bind(this));

        // Setup listeners for UI interaction
        this.setupEventListeners();
    },

    createUIElements: function() {
        // Check if UI elements already exist
        if (document.getElementById('game-ui')) return;

        // Create out-of-bounds warning element if not exists
        if (!document.getElementById('outOfBounce')) {
            const outOfBounce = document.createElement('div');
            outOfBounce.id = 'outOfBounce';
            outOfBounce.classList.add('blinking');
            outOfBounce.textContent = '👻 OUT of BOUNDARY = HEALTH DOWN 👻';
            outOfBounce.style.position = 'absolute';
            outOfBounce.style.top = '20%';
            outOfBounce.style.left = '50%';
            outOfBounce.style.transform = 'translateX(-50%)';
            outOfBounce.style.padding = '10px';
            outOfBounce.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
            outOfBounce.style.color = 'white';
            outOfBounce.style.borderRadius = '5px';
            outOfBounce.style.display = 'none';

            document.body.appendChild(outOfBounce);
        }

        // Create level transition element if not exists
        if (!document.getElementById('level-transition')) {
            const levelTransition = document.createElement('div');
            levelTransition.id = 'level-transition';
            levelTransition.style.position = 'absolute';
            levelTransition.style.top = '50%';
            levelTransition.style.left = '50%';
            levelTransition.style.transform = 'translate(-50%, -50%)';
            levelTransition.style.fontSize = '5em';
            levelTransition.style.color = '#ADD8E6';
            levelTransition.style.textShadow = '1px 1px 2px rgb(193, 17, 17), 0 0 1em blue, 0 0 0.2em rgb(193, 17, 17)';
            levelTransition.style.display = 'none';

            document.body.appendChild(levelTransition);
        }
    },

    setupEventListeners: function() {
        // Restart button for game over screen
        const restartButton = document.querySelector('#intro button');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    },

    onGameOver: function(event) {
        // Show game over screen with stats
        const introEl = document.getElementById('intro');
        if (introEl) {
            const heading = introEl.querySelector('h1');
            if (heading) heading.textContent = 'Game Over';

            introEl.classList.remove('hidden');
        }
    },

    onLevelChange: function(event) {
        // Update level display
        const levelValue = document.getElementById('level-value');
        if (levelValue && event.detail && event.detail.level) {
            levelValue.textContent = event.detail.level;
        }
    },

    updateHealthUI: function(health) {
        const healthValue = document.getElementById('health-value');
        if (healthValue) {
            healthValue.textContent = Math.floor(health);
        }
    },

    updateHitsUI: function(hits) {
        const hitsValue = document.getElementById('hits-value');
        if (hitsValue) {
            hitsValue.textContent = hits;
        }
    }
});