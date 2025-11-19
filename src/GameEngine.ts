import { GameState, LevelConfig, Vector2, SuperPower, BaddieType } from './types.js';
import { Passenger } from './Passenger.js';
import { Baddie } from './Baddie.js';
import { CollisionSystem } from './CollisionSystem.js';
import { SoundManager } from './SoundManager.js';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = GameState.MENU;
  private passengers: Passenger[] = [];
  private baddies: Baddie[] = [];
  private bridges: Array<{ x: number; y: number; width: number }> = [];
  private currentLevel: number = 1;
  private levelConfig: LevelConfig | null = null;
  private lastTime: number = 0;
  private levelStartTime: number = 0;
  private levelTimeLimit: number = 300; // 5 minutes in seconds
  private passengersSpawned: number = 0;
  private totalPassengers: number = 100;
  private spawnInterval: number = 0.5; // Spawn every 0.5 seconds
  private spawnTimer: number = 0;
  private groundLevel: number = 0;
  private checkInGate: Vector2 = { x: 0, y: 0 };
  private gateWidth: number = 100;
  private obstacles: Array<{ type: string; x: number; y: number; width: number; height: number; id: string }> = [];
  private platforms: Array<{ x: number; y: number; width: number; height: number }> = [];
  private walls: Array<{ x: number; y: number; width: number; height: number }> = [];
  private selectedPassenger: Passenger | null = null;
  private airportLayout: Array<{ type: string; x: number; y: number; width: number; height: number; label?: string }> = [];
  private selectedPower: SuperPower | null = null;
  private powerCounts: Map<SuperPower, number> = new Map();
  private uiHeight = 120; // Height of UI panel at bottom
  private soundManager: SoundManager;
  private logoImage: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true 
    });
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
    
    // Enable pixelated rendering
    (this.ctx as any).imageSmoothingEnabled = false;
    (this.ctx as any).webkitImageSmoothingEnabled = false;
    (this.ctx as any).mozImageSmoothingEnabled = false;
    (this.ctx as any).msImageSmoothingEnabled = false;
    
    this.groundLevel = canvas.height - this.uiHeight - 20;
    this.initializePowerCounts();
    this.soundManager = new SoundManager();
    this.loadLogo();
  }

  private loadLogo(): void {
    // Try to load logo if it exists
    this.logoImage = new Image();
    this.logoImage.onload = () => {
      // Logo loaded successfully
    };
    this.logoImage.onerror = () => {
      // Logo not found, will use text instead
      this.logoImage = null;
    };
    // Try common logo file names
    this.logoImage.src = 'logo.png';
  }

  private initializePowerCounts(): void {
    this.powerCounts.set('bridge', 10);
    this.powerCounts.set('doorBreaker', 8);
    this.powerCounts.set('securityBriber', 6);
  }

  public startLevel(level: number): void {
    this.currentLevel = level;
    this.gameState = GameState.PLAYING;
    this.passengers = [];
    this.baddies = [];
    this.bridges = [];
    this.passengersSpawned = 0;
    this.spawnTimer = 0;
    this.levelStartTime = Date.now() / 1000;
    this.selectedPower = null;
    this.selectedPassenger = null;
    this.initializePowerCounts();
    this.levelConfig = this.generateLevelConfig(level);
    this.loadLevel(this.levelConfig);
    this.soundManager.playClick();
  }

  private generateLevelConfig(level: number): LevelConfig {
    const difficulty = level;
    const obstacles: LevelConfig['obstacles'] = [];
    const baddies: LevelConfig['baddies'] = [];

    // Spawn platform - passengers MUST start on this!
    const spawnPlatformY = 50;
    const spawnPlatformWidth = 150;
    obstacles.push({
      type: 'wall', // Will be converted to platform
      position: { x: 0, y: spawnPlatformY },
      width: spawnPlatformWidth,
      height: 20,
      id: 'spawn_platform'
    });

    // Generate MANY platforms - classic platformer style
    const platformCount = 15 + level * 5; // Many more platforms!
    const platforms: Array<{ x: number; y: number; width: number }> = [];
    
    // Create a path of platforms from spawn to destination
    let currentX = spawnPlatformWidth + 50;
    let currentY = spawnPlatformY;
    const targetX = this.canvas.width - 200;
    const targetY = this.groundLevel - 30;
    
    // Main path platforms
    while (currentX < targetX - 100) {
      const platformWidth = 80 + Math.random() * 120;
      const nextY = currentY + (Math.random() < 0.3 ? -80 : 0) + (Math.random() < 0.2 ? 100 : 0);
      const clampedY = Math.max(50, Math.min(nextY, this.groundLevel - 100));
      
      platforms.push({
        x: currentX,
        y: clampedY,
        width: platformWidth
      });
      
      obstacles.push({
        type: 'wall',
        position: { x: currentX, y: clampedY },
        width: platformWidth,
        height: 20,
        id: `path_platform_${platforms.length}`
      });
      
      currentX += platformWidth + (30 + Math.random() * 50); // Gap between platforms
      currentY = clampedY;
    }
    
    // Add many additional platforms throughout the level
    for (let i = 0; i < platformCount - platforms.length; i++) {
      const x = 100 + Math.random() * (this.canvas.width - 200);
      const y = 80 + Math.random() * (this.groundLevel - 150);
      const width = 60 + Math.random() * 100;
      
      obstacles.push({
        type: 'wall',
        position: { x, y },
        width: width,
        height: 20,
        id: `platform_${i}`
      });
    }
    
    // Create vertical walls (barriers) - MANY more
    const wallCount = 8 + level * 3;
    for (let i = 0; i < wallCount; i++) {
      const x = 150 + Math.random() * (this.canvas.width - 300);
      const y = 100 + Math.random() * (this.groundLevel - 200);
      const height = 60 + Math.random() * 120;
      
      obstacles.push({
        type: 'wall',
        position: { x, y },
        width: 20,
        height: height,
        id: `wall_${i}`
      });
    }
    
    // Create gaps between platforms (for bridge builders to use)
    const gapCount = 5 + level * 2;
    for (let i = 0; i < gapCount; i++) {
      const x = 200 + (i * 200) + Math.random() * 150;
      const y = this.groundLevel - 30;
      
      obstacles.push({
        type: 'gap',
        position: { x, y },
        width: 50 + Math.random() * 60,
        height: 20,
        id: `gap_${i}`
      });
    }
    
    // Add doors and security checkpoints
    for (let i = 0; i < 3 + level; i++) {
      const x = 300 + (i * 250) + Math.random() * 100;
      const y = 120 + Math.random() * (this.groundLevel - 200);
      
      obstacles.push({
        type: i % 2 === 0 ? 'door' : 'security',
        position: { x, y },
        width: 20,
        height: 60,
        id: `special_${i}`
      });
    }
    
    // Add security guards on platforms
    for (let i = 0; i < 2 + level; i++) {
      const platform = platforms[Math.floor(Math.random() * Math.min(platforms.length, 5))];
      const x = platform ? platform.x + 20 : 400 + (i * 200);
      const y = platform ? platform.y - 50 : this.groundLevel - 30;
      
      obstacles.push({
        type: 'securityGuard',
        position: { x, y },
        width: 20,
        height: 50,
        id: `guard_${i}`
      });
    }

    // No baddies - removed per user request

    // Spawn point is on the spawn platform
    const spawnPoint = { x: 50, y: spawnPlatformY - 32 }; // Above the platform

    return {
      levelNumber: level,
      obstacles,
      spawnPoint,
      checkInGate: { x: this.canvas.width - 150, y: this.groundLevel - 30 },
      baddies,
      difficulty
    };
  }

  private loadLevel(config: LevelConfig): void {
    this.obstacles = config.obstacles.map(obs => ({
      type: obs.type,
      x: obs.position.x,
      y: obs.position.y,
      width: obs.width,
      height: obs.height,
      id: obs.id
    }));

    this.checkInGate = config.checkInGate;
    this.baddies = config.baddies.map((b, i) => 
      new Baddie(b.position, b.type, b.patrolPath, `baddie_${i}`)
    );
    
    // Create platforms and walls from obstacles
    this.buildPlatformsAndWalls();
    
    // Create Heathrow-style airport layout
    this.createAirportLayout();
  }

  private buildPlatformsAndWalls(): void {
    this.platforms = [];
    this.walls = [];

    // Convert obstacles to platforms (horizontal surfaces) and walls (vertical barriers)
    for (const obstacle of this.obstacles) {
      if (obstacle.type === 'wall' || obstacle.type === 'door' || obstacle.type === 'security' || obstacle.type === 'securityGuard') {
        // Check if it's more horizontal (platform) or vertical (wall)
        if (obstacle.width > obstacle.height) {
          // Horizontal platform - walkable on top
          this.platforms.push({
            x: obstacle.x,
            y: obstacle.y,
            width: obstacle.width,
            height: obstacle.height
          });
        } else {
          // Vertical wall - blocks movement
          this.walls.push({
            x: obstacle.x,
            y: obstacle.y,
            width: obstacle.width,
            height: obstacle.height
          });
        }
      }
    }

    // Add main ground platform
    this.platforms.push({
      x: 0,
      y: this.groundLevel,
      width: this.canvas.width,
      height: 20
    });

    // Add bridges as platforms
    for (const bridge of this.bridges) {
      this.platforms.push({
        x: bridge.x,
        y: bridge.y,
        width: bridge.width,
        height: 10
      });
    }
  }

  private createAirportLayout(): void {
    this.airportLayout = [];
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const floorY = this.groundLevel;

    // Terminal building (left side - departure area)
    this.airportLayout.push({
      type: 'terminal',
      x: 0,
      y: floorY - 150,
      width: 200,
      height: 150,
      label: 'TERMINAL 5'
    });

    // Check-in desks (multiple rows)
    for (let i = 0; i < 3; i++) {
      this.airportLayout.push({
        type: 'checkin',
        x: 220 + i * 120,
        y: floorY - 80,
        width: 100,
        height: 80,
        label: `CHECK-IN ${i + 1}`
      });
    }

    // Security checkpoint
    this.airportLayout.push({
      type: 'security',
      x: 600,
      y: floorY - 100,
      width: 80,
      height: 100,
      label: 'SECURITY'
    });

    // Departure lounge area
    this.airportLayout.push({
      type: 'lounge',
      x: 700,
      y: floorY - 120,
      width: 200,
      height: 120,
      label: 'DEPARTURE LOUNGE'
    });

    // Gates area (right side)
    this.airportLayout.push({
      type: 'gates',
      x: canvasWidth - 250,
      y: floorY - 100,
      width: 200,
      height: 100,
      label: 'GATES A1-A10'
    });

    // Walkways/paths
    this.airportLayout.push({
      type: 'walkway',
      x: 200,
      y: floorY - 20,
      width: canvasWidth - 400,
      height: 20
    });

    // Baggage carousel (optional decorative element)
    this.airportLayout.push({
      type: 'baggage',
      x: 300,
      y: floorY - 40,
      width: 150,
      height: 20
    });
  }

  public update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;

      // Check time limit
      const elapsed = (Date.now() / 1000) - this.levelStartTime;
      if (elapsed >= this.levelTimeLimit) {
        this.gameState = GameState.GAME_OVER;
        this.soundManager.playGameOver();
        return;
      }

    // Spawn passengers
    if (this.passengersSpawned < this.totalPassengers) {
      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnPassenger();
        this.spawnTimer = 0;
      }
    }

    // Rebuild platforms (in case bridges were added)
    this.buildPlatformsAndWalls();

    // Update passengers
    this.passengers.forEach(passenger => {
      // Pass platforms and walls for platform-based movement
      passenger.update(deltaTime, this.platforms, this.walls, this.checkInGate.x, this.checkInGate.y);
      
      // Check collisions with obstacles (for special interactions)
      this.handleObstacleCollisions(passenger);
      
      // Check if reached gate
      const justReached = passenger.checkReachedGate(this.checkInGate, this.gateWidth);
      if (justReached) {
        this.soundManager.playReachGate();
      }
    });

    // Baddies removed - no longer updating them

    // Check win condition
    const activePassengers = this.passengers.filter(p => p.isActive && !p.hasReachedGate);
    const reachedGate = this.passengers.filter(p => p.hasReachedGate).length;
    
    if (this.passengersSpawned >= this.totalPassengers && activePassengers.length === 0) {
      if (reachedGate >= 50) { // Need at least 50% to pass
        if (this.currentLevel >= 10) {
          this.gameState = GameState.VICTORY;
          this.soundManager.playLevelComplete();
        } else {
          this.gameState = GameState.LEVEL_COMPLETE;
          this.soundManager.playLevelComplete();
        }
      } else {
        this.gameState = GameState.GAME_OVER;
        this.soundManager.playGameOver();
      }
    }
  }

  private spawnPassenger(): void {
    if (!this.levelConfig) return;

    // Randomly assign superpowers to some passengers
    let superPower: SuperPower = null;
    const rand = Math.random();
    if (rand < 0.15) {
      superPower = 'bridge';
    } else if (rand < 0.25) {
      superPower = 'doorBreaker';
    } else if (rand < 0.32) {
      superPower = 'securityBriber';
    }

    const passenger = new Passenger(
      { ...this.levelConfig.spawnPoint },
      superPower,
      `passenger_${this.passengersSpawned}`
    );
    
    this.passengers.push(passenger);
    this.passengersSpawned++;
    this.soundManager.playSpawn();
  }

  private getBridgeLevel(x: number): number | null {
    for (const bridge of this.bridges) {
      if (x >= bridge.x && x <= bridge.x + bridge.width) {
        return bridge.y;
      }
    }
    return null;
  }

  private handleObstacleCollisions(passenger: Passenger): void {
    const passengerBounds = passenger.getBounds();

    // Check for gap collisions (special handling)
    for (const obstacle of this.obstacles) {
      if (obstacle.type === 'gap') {
        // Check if passenger is about to step into gap
        const gapLeft = obstacle.x;
        const gapRight = obstacle.x + obstacle.width;
        const passengerFeetX = passenger.position.x + (passenger.direction === 1 ? passenger.width : 0);
        const passengerFeetY = passenger.position.y + passenger.height;
        
        // Check if feet are over gap and not on a bridge
        if (
          passengerFeetX >= gapLeft && 
          passengerFeetX <= gapRight &&
          passengerFeetY >= obstacle.y &&
          passengerFeetY <= obstacle.y + obstacle.height
        ) {
          const hasBridge = this.bridges.some(b => 
            b.x <= obstacle.x + obstacle.width && 
            b.x + b.width >= obstacle.x
          );
          
          if (!hasBridge) {
            this.handleObstacleInteraction(passenger, obstacle);
          }
        }
      } else {
        // Check collision with solid obstacles
        const obstacleBounds = {
          x: obstacle.x,
          y: obstacle.y,
          width: obstacle.width,
          height: obstacle.height
        };
        
        if (CollisionSystem.checkAABB(passengerBounds, obstacleBounds)) {
          this.handleObstacleInteraction(passenger, obstacle);
        }
      }
    }
  }

  private handleObstacleInteraction(
    passenger: Passenger,
    obstacle: { type: string; x: number; y: number; width: number; height: number; id: string }
  ): void {
    switch (obstacle.type) {
      case 'wall':
        passenger.reverseDirection();
        this.soundManager.playCollision();
        break;
      
      case 'door':
        if (passenger.superPower === 'doorBreaker' && passenger.activateSuperPower()) {
          // Remove door obstacle
          this.obstacles = this.obstacles.filter(o => o.id !== obstacle.id);
          this.soundManager.playDoorBreak();
        } else {
          passenger.reverseDirection();
          this.soundManager.playCollision();
        }
        break;
      
      case 'gap':
        // Check if there's already a bridge here
        const hasBridge = this.bridges.some(b => 
          b.x <= obstacle.x + obstacle.width && 
          b.x + b.width >= obstacle.x
        );
        
        if (hasBridge) {
          // Passenger can walk on bridge, no action needed
          break;
        }
        
        if (passenger.superPower === 'bridge' && passenger.activateSuperPower()) {
          // Create bridge
          this.bridges.push({
            x: obstacle.x,
            y: obstacle.y + obstacle.height - 10,
            width: obstacle.width
          });
          // Remove gap obstacle
          this.obstacles = this.obstacles.filter(o => o.id !== obstacle.id);
          this.soundManager.playBridgeBuild();
        } else {
          // Fall through gap - reverse direction before falling
          passenger.reverseDirection();
          passenger.isFalling = true;
        }
        break;
      
      case 'security':
        if (passenger.superPower === 'securityBriber' && passenger.activateSuperPower()) {
          // Remove security obstacle
          this.obstacles = this.obstacles.filter(o => o.id !== obstacle.id);
          this.soundManager.playBribe();
        } else {
          passenger.reverseDirection();
          this.soundManager.playCollision();
        }
        break;
      
      case 'securityGuard':
        // Security guards block passengers
        if (passenger.superPower === 'securityBriber' && passenger.activateSuperPower()) {
          // Bribe the guard
          this.obstacles = this.obstacles.filter(o => o.id !== obstacle.id);
          this.soundManager.playBribe();
        } else {
          // Guard stops passenger
          passenger.reverseDirection();
          passenger.velocity.x *= 0.3; // Slow down significantly
          this.soundManager.playCollision();
        }
        break;
    }
  }

  public render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#E3F2FD';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameState === GameState.MENU) {
      this.renderMenu();
      return;
    }

    if (this.gameState === GameState.PLAYING || 
        this.gameState === GameState.LEVEL_COMPLETE ||
        this.gameState === GameState.GAME_OVER ||
        this.gameState === GameState.VICTORY) {
      this.renderGame();
    }
  }

  private renderMenu(): void {
    // Retro 16-bit background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw scanlines effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < this.canvas.height; y += 4) {
      this.ctx.fillRect(0, y, this.canvas.width, 2);
    }
    
    // Draw logo if available, otherwise draw text
    if (this.logoImage && this.logoImage.complete && this.logoImage.naturalWidth > 0) {
      const logoWidth = Math.min(400, this.canvas.width - 100);
      const logoHeight = (this.logoImage.height / this.logoImage.width) * logoWidth;
      const logoX = (this.canvas.width - logoWidth) / 2;
      const logoY = this.canvas.height / 2 - logoHeight / 2 - 50;
      
      this.ctx.drawImage(this.logoImage, logoX, logoY, logoWidth, logoHeight);
    } else {
      // Draw retro 16-bit text logo
      this.ctx.font = 'bold 32px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      
      // Shadow
      this.ctx.fillStyle = '#0a1929';
      this.ctx.fillText('AER LEMMINGS', this.canvas.width / 2 + 4, this.canvas.height / 2 - 46);
      
      // Main text
      this.ctx.fillStyle = '#00ff41';
      this.ctx.fillText('AER LEMMINGS', this.canvas.width / 2, this.canvas.height / 2 - 50);
      
      // Glow effect
      this.ctx.shadowColor = '#00ff41';
      this.ctx.shadowBlur = 10;
      this.ctx.fillText('AER LEMMINGS', this.canvas.width / 2, this.canvas.height / 2 - 50);
      this.ctx.shadowBlur = 0;
    }
    
    // Retro start text
    this.ctx.font = '16px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    
    // Add blinking effect
    const blink = Math.floor(Date.now() / 500) % 2;
    if (blink) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText('CLICK TO START', this.canvas.width / 2, this.canvas.height / 2 + 80);
    }
  }

  private renderGame(): void {
    const uiY = this.canvas.height - this.uiHeight;
    
    // Retro 16-bit background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, uiY);
    
    // Draw scanlines effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < uiY; y += 4) {
      this.ctx.fillRect(0, y, this.canvas.width, 2);
    }
    
    // Draw airport floor (retro style) - but not over UI
    this.ctx.fillStyle = '#2d2d44';
    this.ctx.fillRect(0, this.groundLevel, this.canvas.width, uiY - this.groundLevel);
    
    // Draw floor tiles pattern (pixelated)
    this.ctx.fillStyle = '#3d3d54';
    for (let x = 0; x < this.canvas.width; x += 32) {
      for (let y = this.groundLevel; y < uiY; y += 32) {
        if ((Math.floor(x / 32) + Math.floor((y - this.groundLevel) / 32)) % 2 === 0) {
          this.ctx.fillRect(x, y, 32, 32);
        }
      }
    }

    // Draw airport layout elements
    this.airportLayout.forEach(element => {
      switch (element.type) {
        case 'terminal':
          this.ctx.fillStyle = '#424242';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.font = 'bold 16px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(element.label || '', element.x + element.width / 2, element.y + 30);
          // Windows
          this.ctx.fillStyle = '#81D4FA';
          for (let i = 0; i < 4; i++) {
            this.ctx.fillRect(element.x + 20 + i * 40, element.y + 50, 30, 40);
          }
          break;
        
        case 'checkin':
          this.ctx.fillStyle = '#757575';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.font = '12px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(element.label || '', element.x + element.width / 2, element.y + 40);
          // Desk counter
          this.ctx.fillStyle = '#9E9E9E';
          this.ctx.fillRect(element.x, element.y, element.width, 10);
          break;
        
        case 'security':
          this.ctx.fillStyle = '#FFC107';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          this.ctx.fillStyle = '#000000';
          this.ctx.font = 'bold 12px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(element.label || '', element.x + element.width / 2, element.y + 50);
          // Security scanner
          this.ctx.strokeStyle = '#000000';
          this.ctx.lineWidth = 3;
          this.ctx.strokeRect(element.x + 10, element.y + 20, element.width - 20, element.height - 40);
          break;
        
        case 'lounge':
          this.ctx.fillStyle = '#BBDEFB';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          this.ctx.fillStyle = '#1976D2';
          this.ctx.font = '12px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(element.label || '', element.x + element.width / 2, element.y + 60);
          break;
        
        case 'gates':
          this.ctx.fillStyle = '#4CAF50';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.font = 'bold 14px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(element.label || '', element.x + element.width / 2, element.y + 50);
          // Gate indicators
          this.ctx.fillStyle = '#FFFFFF';
          for (let i = 0; i < 5; i++) {
            this.ctx.fillRect(element.x + 20 + i * 35, element.y + 60, 25, 30);
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`A${i + 1}`, element.x + 32 + i * 35, element.y + 80);
            this.ctx.fillStyle = '#FFFFFF';
          }
          break;
        
        case 'walkway':
          this.ctx.fillStyle = '#9E9E9E';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          // Walkway lines
          this.ctx.strokeStyle = '#FFFFFF';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([10, 10]);
          this.ctx.beginPath();
          this.ctx.moveTo(element.x, element.y + element.height / 2);
          this.ctx.lineTo(element.x + element.width, element.y + element.height / 2);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
          break;
        
        case 'baggage':
          this.ctx.fillStyle = '#FF9800';
          this.ctx.fillRect(element.x, element.y, element.width, element.height);
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.font = '10px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('BAGGAGE', element.x + element.width / 2, element.y + 15);
          break;
      }
    });

    // Draw bridges (over gaps)
    this.ctx.fillStyle = '#795548';
    this.bridges.forEach(bridge => {
      this.ctx.fillRect(bridge.x, bridge.y, bridge.width, 10);
      // Bridge railings
      this.ctx.strokeStyle = '#5D4037';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(bridge.x, bridge.y, bridge.width, 10);
    });

    // Draw platforms (walkable surfaces) - retro 16-bit style
    this.platforms.forEach(platform => {
      // Check if this is the spawn platform
      const isSpawnPlatform = platform.x === 0 && platform.y === 50;
      
      if (isSpawnPlatform) {
        // Spawn platform - retro green
        this.ctx.fillStyle = '#00ff41';
        this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        // Pixelated border
        this.ctx.fillStyle = '#00cc33';
        this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
        this.ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2);
        this.ctx.fillRect(platform.x, platform.y, 2, platform.height);
        this.ctx.fillRect(platform.x + platform.width - 2, platform.y, 2, platform.height);
        
        // Label
        this.ctx.fillStyle = '#0a1929';
        this.ctx.font = '8px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPAWN', platform.x + platform.width / 2, platform.y - 8);
      } else {
        // Regular platform - retro brown
        this.ctx.fillStyle = '#8b6914';
        this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        // Pixelated border
        this.ctx.fillStyle = '#5a4510';
        this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
        this.ctx.fillRect(platform.x, platform.y + platform.height - 2, platform.width, 2);
        // Highlight
        this.ctx.fillStyle = '#b8860b';
        this.ctx.fillRect(platform.x, platform.y, platform.width, 1);
      }
    });

    // Draw walls (vertical barriers) - retro 16-bit style
    this.walls.forEach(wall => {
      // Retro gray wall
      this.ctx.fillStyle = '#4a4a4a';
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      // Pixelated border
      this.ctx.fillStyle = '#2a2a2a';
      this.ctx.fillRect(wall.x, wall.y, wall.width, 2);
      this.ctx.fillRect(wall.x, wall.y + wall.height - 2, wall.width, 2);
      this.ctx.fillRect(wall.x, wall.y, 2, wall.height);
      this.ctx.fillRect(wall.x + wall.width - 2, wall.y, 2, wall.height);
      // Highlight
      this.ctx.fillStyle = '#6a6a6a';
      this.ctx.fillRect(wall.x, wall.y, wall.width, 1);
    });

    // Draw obstacles (airport-themed) - for special interactions
    this.obstacles.forEach(obstacle => {
      switch (obstacle.type) {
        case 'door':
          // Airport door (if not already rendered as wall/platform)
          if (obstacle.width <= obstacle.height) {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            this.ctx.strokeStyle = '#5D4037';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            // Door handle
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(obstacle.x + obstacle.width - 10, obstacle.y + obstacle.height / 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
          }
          break;
        case 'gap':
          // Gap in floor (no visual, but bridges appear over it)
          // Already handled by bridges rendering
          break;
        case 'security':
          // Security checkpoint (if vertical)
          if (obstacle.width <= obstacle.height) {
            this.ctx.fillStyle = '#FFC107';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SEC', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
          }
          break;
        case 'securityGuard':
          // Security guard (if vertical)
          if (obstacle.width <= obstacle.height) {
            this.ctx.fillStyle = '#1976D2';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            // Draw guard icon
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + 10, 6, 0, Math.PI * 2);
            this.ctx.fill();
            // Body
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(obstacle.x + obstacle.width / 2 - 4, obstacle.y + 16, 8, 12);
            // Badge
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(obstacle.x + obstacle.width / 2 - 2, obstacle.y + 20, 4, 4);
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GUARD', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height - 5);
          }
          break;
      }
    });

    // Draw check-in gate (final destination) - retro 16-bit style
    this.ctx.fillStyle = '#00ff41';
    this.ctx.fillRect(this.checkInGate.x, this.checkInGate.y, this.gateWidth, 50);
    // Pixelated border
    this.ctx.fillStyle = '#00cc33';
    this.ctx.fillRect(this.checkInGate.x, this.checkInGate.y, this.gateWidth, 2);
    this.ctx.fillRect(this.checkInGate.x, this.checkInGate.y + 48, this.gateWidth, 2);
    this.ctx.fillRect(this.checkInGate.x, this.checkInGate.y, 2, 50);
    this.ctx.fillRect(this.checkInGate.x + this.gateWidth - 2, this.checkInGate.y, 2, 50);
    
    this.ctx.fillStyle = '#0a1929';
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHECK-IN', this.checkInGate.x + this.gateWidth / 2, this.checkInGate.y + 20);
    this.ctx.fillText('GATE', this.checkInGate.x + this.gateWidth / 2, this.checkInGate.y + 35);

    // Draw passengers
    this.passengers.forEach(passenger => {
      if (passenger.isActive || passenger.hasReachedGate) {
        const isSelected = this.selectedPassenger === passenger;
        const centerX = passenger.position.x + passenger.width / 2;
        const centerY = passenger.position.y + passenger.height / 2;
        
        // Draw selection highlight (pixelated)
        if (isSelected) {
          const selX = Math.floor(passenger.position.x) - 4;
          const selY = Math.floor(passenger.position.y) - 4;
          this.ctx.fillStyle = '#ffd700';
          // Pixelated border
          this.ctx.fillRect(selX, selY, passenger.width + 8, 2);
          this.ctx.fillRect(selX, selY + passenger.height + 6, passenger.width + 8, 2);
          this.ctx.fillRect(selX, selY, 2, passenger.height + 8);
          this.ctx.fillRect(selX + passenger.width + 6, selY, 2, passenger.height + 8);
        }
        
        // Draw front-facing 2D passenger (retro 16-bit pixelated)
        const x = Math.floor(passenger.position.x);
        const y = Math.floor(passenger.position.y);
        const w = passenger.width;
        const h = passenger.height;
        
        // Retro color mapping
        let bodyColor = passenger.color;
        if (passenger.color === '#2196F3') bodyColor = '#00aaff'; // Blue
        else if (passenger.color === '#4CAF50') bodyColor = '#00ff41'; // Green
        else if (passenger.color === '#FF9800') bodyColor = '#ff6b00'; // Orange
        else if (passenger.color === '#9C27B0') bodyColor = '#ff00ff'; // Purple
        
        // Body (pixelated rectangle)
        this.ctx.fillStyle = bodyColor;
        this.ctx.fillRect(x, y + 8, w, h - 8);
        // Pixelated border
        this.ctx.fillStyle = '#0a1929';
        this.ctx.fillRect(x, y + 8, w, 1);
        this.ctx.fillRect(x, y + h - 1, w, 1);
        this.ctx.fillRect(x, y + 8, 1, h - 8);
        this.ctx.fillRect(x + w - 1, y + 8, 1, h - 8);
        
        // Head (pixelated square)
        this.ctx.fillStyle = '#ffdbac';
        this.ctx.fillRect(x + w / 2 - 6, y, 12, 12);
        // Head border
        this.ctx.fillStyle = '#0a1929';
        this.ctx.fillRect(x + w / 2 - 6, y, 12, 1);
        this.ctx.fillRect(x + w / 2 - 6, y + 11, 12, 1);
        this.ctx.fillRect(x + w / 2 - 6, y, 1, 12);
        this.ctx.fillRect(x + w / 2 + 5, y, 1, 12);
        
        // Eyes (pixels)
        this.ctx.fillStyle = '#0a1929';
        if (passenger.direction === 1) {
          // Facing right
          this.ctx.fillRect(x + w / 2 + 2, y + 3, 2, 2);
          this.ctx.fillRect(x + w / 2 + 2, y + 7, 2, 2);
        } else {
          // Facing left
          this.ctx.fillRect(x + w / 2 - 4, y + 3, 2, 2);
          this.ctx.fillRect(x + w / 2 - 4, y + 7, 2, 2);
        }
        
        // Legs (pixelated)
        this.ctx.fillStyle = '#0a1929';
        this.ctx.fillRect(x + 4, y + h - 6, 6, 6);
        this.ctx.fillRect(x + w - 10, y + h - 6, 6, 6);
        
        // Draw superpower indicator (MUCH bigger and more visible)
        if (passenger.superPower) {
          const starY = passenger.position.y - 15;
          const starSize = 12; // Much bigger star
          
          // Draw star background circle for better visibility
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.beginPath();
          this.ctx.arc(centerX, starY, starSize + 2, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = '#FFD700';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          
          // Draw star shape
          this.ctx.fillStyle = '#FFD700';
          this.ctx.beginPath();
          this.drawStar(centerX, starY, 5, starSize, starSize * 0.5);
          this.ctx.fill();
          this.ctx.strokeStyle = '#FFA000';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
          
          // Draw power icon inside star (retro pixelated)
          this.ctx.fillStyle = '#0a1929';
          this.ctx.font = '8px "Press Start 2P", monospace';
          this.ctx.textAlign = 'center';
          let icon = '?';
          if (passenger.superPower === 'bridge') icon = 'B';
          else if (passenger.superPower === 'doorBreaker') icon = 'D';
          else if (passenger.superPower === 'securityBriber') icon = '$';
          this.ctx.fillText(icon, centerX, starY + 4);
        }
        
        // Draw "using power" indicator
        if (passenger.isUsingPower) {
          this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(
            centerX,
            centerY,
            passenger.width + 5,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }
      }
    });

    // Baddies removed - no longer rendering them

    // Draw UI
    this.renderUI();
  }

  private renderUI(): void {
    const uiY = this.canvas.height - this.uiHeight;
    
    // Draw UI background (Lemmings-style dark panel)
    this.ctx.fillStyle = '#2C2C2C';
    this.ctx.fillRect(0, uiY, this.canvas.width, this.uiHeight);
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, uiY, this.canvas.width, this.uiHeight);
    
    // Top stats bar
    const elapsed = (Date.now() / 1000) - this.levelStartTime;
    const remaining = Math.max(0, this.levelTimeLimit - elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    const outCount = this.totalPassengers - this.passengers.filter(p => p.isActive || p.hasReachedGate).length;
    const inCount = this.passengers.filter(p => p.hasReachedGate).length;
    const inPercent = Math.floor((inCount / this.totalPassengers) * 100);
    const targetCount = Math.ceil(this.totalPassengers * 0.5);
    
    // Top stats (OUT, IN%, TIME)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`OUT ${outCount}`, 10, uiY + 20);
    this.ctx.fillText(`IN ${inPercent}%`, 120, uiY + 20);
    this.ctx.fillText(`TIME ${minutes}-${seconds.toString().padStart(2, '0')}`, 220, uiY + 20);
    
    // Target (50/99 style)
    this.ctx.fillText(`${targetCount} ${this.totalPassengers}`, 350, uiY + 20);
    
    // Ability icons bar
    const iconSize = 32;
    const iconSpacing = 40;
    const startX = 10;
    const iconY = uiY + 40;
    
    // Bridge Builder
    this.drawAbilityIcon(startX, iconY, iconSize, 'bridge', '🌉', this.powerCounts.get('bridge') || 0);
    
    // Door Breaker
    this.drawAbilityIcon(startX + iconSpacing, iconY, iconSize, 'doorBreaker', '🚪', this.powerCounts.get('doorBreaker') || 0);
    
    // Security Briber
    this.drawAbilityIcon(startX + iconSpacing * 2, iconY, iconSize, 'securityBriber', '💳', this.powerCounts.get('securityBriber') || 0);
    
    // Nuke button (right side)
    const nukeX = this.canvas.width - 60;
    this.ctx.fillStyle = this.selectedPower === null ? '#FF4444' : '#FF8888';
    this.ctx.fillRect(nukeX, iconY, iconSize, iconSize);
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(nukeX, iconY, iconSize, iconSize);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('💥', nukeX + iconSize / 2, iconY + iconSize / 2 + 7);
    
    // Selected power indicator
    if (this.selectedPower) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Selected: ${this.selectedPower}`, 10, uiY + 100);
    }

    // Game state messages
    if (this.gameState === GameState.LEVEL_COMPLETE) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Level Complete!', this.canvas.width / 2, this.canvas.height / 2);
    } else if (this.gameState === GameState.GAME_OVER) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#F44336';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
    } else if (this.gameState === GameState.VICTORY) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Victory!', this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public nextLevel(): void {
    if (this.currentLevel < 10) {
      this.startLevel(this.currentLevel + 1);
    }
  }

  public pause(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
    }
  }

  public handleClick(x: number, y: number): void {
    if (this.gameState === GameState.MENU) {
      this.soundManager.playClick();
      this.startLevel(1);
      return;
    } else if (this.gameState === GameState.LEVEL_COMPLETE) {
      this.soundManager.playClick();
      this.nextLevel();
      return;
    } else if (this.gameState === GameState.GAME_OVER || this.gameState === GameState.VICTORY) {
      this.soundManager.playClick();
      this.gameState = GameState.MENU;
      return;
    }

    if (this.gameState !== GameState.PLAYING) return;

    const uiY = this.canvas.height - this.uiHeight;
    
    // Check if clicking in UI area
    if (y >= uiY) {
      this.handleUIClick(x, y, uiY);
      return;
    }

    // Check if clicking on a passenger with superpower (including star area)
    for (const passenger of this.passengers) {
      if (!passenger.isActive || passenger.hasReachedGate || !passenger.superPower) continue;
      
      const bounds = passenger.getBounds();
      const centerX = bounds.x + bounds.width / 2;
      const starY = bounds.y - 15;
      const starSize = 14; // Clickable area for star (slightly larger than visual)
      
      // Check if clicking on passenger body
      const clickedBody = (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
      
      // Check if clicking on star (larger clickable area)
      const clickedStar = (
        Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - starY, 2)) <= starSize
      );
      
      if (clickedBody || clickedStar) {
        // Select this passenger
        this.selectedPassenger = passenger;
        
        // If passenger is near an obstacle that matches their power, activate it
        this.tryActivatePowerAtPosition(passenger, x, y);
        return;
      }
    }

    // If we have a selected power, try to assign it to a passenger near the click
    if (this.selectedPower && (this.powerCounts.get(this.selectedPower) || 0) > 0) {
      // Find nearest passenger without a power
      const nearestPassenger = this.passengers.find(p => 
        p.isActive && 
        !p.hasReachedGate && 
        !p.superPower &&
        Math.sqrt(Math.pow(p.position.x - x, 2) + Math.pow(p.position.y - y, 2)) < 50
      );
      
      if (nearestPassenger) {
        nearestPassenger.superPower = this.selectedPower;
        nearestPassenger.color = this.getColorForPower(this.selectedPower);
        const currentCount = this.powerCounts.get(this.selectedPower) || 0;
        this.powerCounts.set(this.selectedPower, Math.max(0, currentCount - 1));
        this.soundManager.playPowerActivate();
        this.selectedPower = null; // Deselect after use
        return;
      }
    }
    
    // If clicking on an obstacle and we have a selected passenger, try to activate power
    if (this.selectedPassenger) {
      this.tryActivatePowerAtPosition(this.selectedPassenger, x, y);
    } else {
      // Deselect if clicking elsewhere
      this.selectedPassenger = null;
    }
  }

  private getColorForPower(power: SuperPower): string {
    switch (power) {
      case 'bridge':
        return '#4CAF50'; // Green
      case 'doorBreaker':
        return '#FF9800'; // Orange
      case 'securityBriber':
        return '#9C27B0'; // Purple
      default:
        return '#2196F3'; // Blue
    }
  }

  private drawAbilityIcon(x: number, y: number, size: number, power: SuperPower, icon: string, count: number): void {
    const isSelected = this.selectedPower === power;
    
    // Draw icon background
    this.ctx.fillStyle = isSelected ? '#FFD700' : '#4A4A4A';
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = isSelected ? '#FFA000' : '#000000';
    this.ctx.lineWidth = isSelected ? 3 : 2;
    this.ctx.strokeRect(x, y, size, size);
    
    // Draw icon
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(icon, x + size / 2, y + size / 2 + 7);
    
    // Draw count
    this.ctx.fillStyle = count > 0 ? '#00FF00' : '#FF0000';
    this.ctx.font = 'bold 10px Arial';
    this.ctx.fillText(count.toString().padStart(2, '0'), x + size - 8, y + size - 2);
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
  }

  private handleUIClick(x: number, y: number, uiY: number): void {
    const iconSize = 32;
    const iconSpacing = 40;
    const iconY = uiY + 40;
    
    // Check ability icon clicks
    if (y >= iconY && y <= iconY + iconSize) {
      // Bridge Builder
      if (x >= 10 && x <= 10 + iconSize) {
        if ((this.powerCounts.get('bridge') || 0) > 0) {
          this.selectedPower = 'bridge';
          this.soundManager.playSelect();
        }
        return;
      }
      // Door Breaker
      if (x >= 10 + iconSpacing && x <= 10 + iconSpacing + iconSize) {
        if ((this.powerCounts.get('doorBreaker') || 0) > 0) {
          this.selectedPower = 'doorBreaker';
          this.soundManager.playSelect();
        }
        return;
      }
      // Security Briber
      if (x >= 10 + iconSpacing * 2 && x <= 10 + iconSpacing * 2 + iconSize) {
        if ((this.powerCounts.get('securityBriber') || 0) > 0) {
          this.selectedPower = 'securityBriber';
          this.soundManager.playSelect();
        }
        return;
      }
      // Nuke button
      if (x >= this.canvas.width - 60 && x <= this.canvas.width - 60 + iconSize) {
        // Release all remaining passengers
        this.selectedPower = null;
        return;
      }
    }
    
    // Clicking elsewhere in UI deselects
    this.selectedPower = null;
  }

  private tryActivatePowerAtPosition(passenger: Passenger, x: number, y: number): void {
    if (!passenger.superPower || passenger.powerCooldown > 0) return;

    // Find nearby obstacle that matches the passenger's power
    for (const obstacle of this.obstacles) {
      const distance = Math.sqrt(
        Math.pow(x - (obstacle.x + obstacle.width / 2), 2) +
        Math.pow(y - (obstacle.y + obstacle.height / 2), 2)
      );

      if (distance < 100) { // Within 100 pixels
        let shouldActivate = false;

        switch (passenger.superPower) {
          case 'bridge':
            if (obstacle.type === 'gap') {
              shouldActivate = true;
            }
            break;
          case 'doorBreaker':
            if (obstacle.type === 'door') {
              shouldActivate = true;
            }
            break;
          case 'securityBriber':
            if (obstacle.type === 'security') {
              shouldActivate = true;
            }
            break;
        }

        if (shouldActivate && passenger.activateSuperPower()) {
          this.handleObstacleInteraction(passenger, obstacle);
          this.selectedPassenger = null; // Deselect after use
          // Power is consumed, remove it from passenger
          passenger.superPower = null;
          passenger.color = '#2196F3'; // Reset to blue
          return;
        }
      }
    }
  }
}

