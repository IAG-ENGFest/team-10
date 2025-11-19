import { GameEngine } from './GameEngine.js';
import { GameState } from './types.js';

class Game {
  private canvas: HTMLCanvasElement;
  private gameEngine: GameEngine;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 700;

    this.canvas = canvas;
    this.gameEngine = new GameEngine(canvas);

    this.setupEventListeners();
    this.gameLoop(0);
  }

  private setupEventListeners(): void {
    // Handle canvas clicks
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.gameEngine.handleClick(x, y);
    });

    // Handle keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        this.gameEngine.pause();
      }
    });
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap deltaTime to prevent large jumps
    const clampedDelta = Math.min(deltaTime, 0.1);

    this.gameEngine.update(clampedDelta);
    this.gameEngine.render();

    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
} else {
  new Game();
}

