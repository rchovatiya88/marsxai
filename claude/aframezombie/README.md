# A-Frame Zombie Robot FPS

This is an A-Frame adaptation of the Zombie Robot FPS game that was originally developed using Three.js and Yuka.js directly. This version leverages A-Frame's entity-component-system architecture for better modularity and code organization while still using Yuka.js for AI and navigation.

## About The Project

This FPS game puts you against robotic zombies. Each level has more difficult enemies. Your goal is to survive as long as possible and defeat all enemies.

### Built With

- [A-Frame](https://aframe.io/) - Web framework for building VR experiences
- [Yuka](https://mugen87.github.io/yuka/) - JavaScript library for game AI
- [Three.js](https://threejs.org/) - JavaScript 3D library (used by A-Frame)

## Getting Started

To get a local copy up and running, follow these steps:

```sh
# Clone the repository
git clone https://github.com/yourusername/aframe-zombie-fps.git
cd aframe-zombie-fps

# Install dependencies
npm install

# Start the development server
npm start
```

## Game Controls

- **WASD**: Move
- **SPACE**: Jump
- **MOUSE**: Look around
- **LEFT CLICK**: Shoot

## Game Features

- First-person shooter mechanics
- Zombie robots with AI pathfinding
- Weapon system with raycast shooting
- Level progression with increasing difficulty
- Health system with regeneration
- Out-of-bounds detection
- UI displays for health, level, and score

## Project Structure

- `index.html`: Main game page
- `components/`: A-Frame components 
  - `player-component.js`: Player movement, physics, health
  - `weapon-component.js`: Weapon systems
  - `zombie-component.js`: Enemy AI and behavior
  - `world-component.js`: Game world management 
  - `level-component.js`: Level progression
  - `navmesh-component.js`: Navigation mesh for AI
  - `ui-component.js`: UI elements

## Roadmap

- Add mobile joystick controls
- Add more weapon types
- Add more enemy types
- Add power-ups and collectibles
- Improve performance for more enemies
- Add sound effects and music

## License

Distributed under the MIT License.

## Acknowledgments

- Original Zombie Robot game by [Mugen87](https://github.com/Mugen87)
- A-Frame documentation and community
- Three.js documentation and examples