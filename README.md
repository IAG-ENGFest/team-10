# Aer Lemmings

A web-based game inspired by Lemmings, where you guide passengers through airport levels to reach the check-in gate.

## Game Overview

Guide 100 passengers through increasingly difficult airport levels. Each level has a 5-minute time limit, and you need to get at least 50 passengers to the check-in gate to progress.

## Features

- **10 Levels** with increasing difficulty
- **100 Passengers** per level
- **5-Minute Timer** per level
- **Superpowers**: Some passengers have special abilities:
  - 🟢 **Bridge Builder**: Can create bridges over gaps
  - 🟠 **Door Breaker**: Can break through locked doors
  - 🟣 **Security Briber**: Can bypass security checkpoints
- **Baddies**: Competitor airlines (Ryan Air, Fly Be, Virgin) that will stop your passengers
- **Various Obstacles**: Walls, doors, gaps, and security checkpoints

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start a local server:
```bash
npm run serve
```

4. Open your browser to `http://localhost:8080`

### Development

For development with auto-rebuild:
```bash
npm run dev
```

Then serve the files with any static server.

## Controls

- **Click**: Start game / Advance to next level / Restart
- **Spacebar / Escape**: Pause/Resume game

## Game Mechanics

- Passengers spawn automatically and walk toward the check-in gate
- Passengers with superpowers automatically use them when encountering relevant obstacles
- Baddies patrol the level and will stop any passengers they collide with
- You need at least 50% of passengers to reach the gate to complete a level
- Complete all 10 levels to win!

## Project Structure

```
src/
  ├── index.ts          # Main game entry point
  ├── GameEngine.ts     # Core game engine and logic
  ├── Passenger.ts      # Passenger entity
  ├── Baddie.ts         # Baddie entity
  └── types.ts          # TypeScript type definitions
```

## Technologies

- TypeScript
- HTML5 Canvas
- Modern ES2020 JavaScript

## License

MIT

