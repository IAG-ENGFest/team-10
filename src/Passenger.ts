import { Vector2, SuperPower, BoundingBox } from './types.js';
import { CollisionSystem } from './CollisionSystem.js';

export class Passenger {
  public position: Vector2;
  public velocity: Vector2;
  public width = 24;
  public height = 32;
  public superPower: SuperPower;
  public isActive = true;
  public hasReachedGate = false;
  public isFalling = false;
  public direction: -1 | 1 = 1; // -1 for left, 1 for right
  public color: string;
  public isUsingPower = false;
  public powerCooldown = 0;
  public id: string;

  constructor(
    startPosition: Vector2,
    superPower: SuperPower = null,
    id: string
  ) {
    this.position = { ...startPosition };
    this.velocity = { x: 0, y: 0 };
    this.superPower = superPower;
    this.id = id;
    this.color = this.getColorForPower(superPower);
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

  public update(
    deltaTime: number, 
    platforms: Array<{ x: number; y: number; width: number; height: number }>,
    walls: Array<{ x: number; y: number; width: number; height: number }>,
    targetX?: number, 
    targetY?: number
  ): void {
    if (!this.isActive || this.hasReachedGate) return;

    // Always apply gravity
    this.velocity.y += 500 * deltaTime; // Gravity

    // Horizontal movement - try to move toward bottom right
    const speed = 50; // pixels per second
    
    // If we have a target, try to navigate toward it
    if (targetX !== undefined && targetY !== undefined) {
      const dx = targetX - this.position.x;
      
      // Prefer moving right and down
      if (Math.abs(dx) > 10) {
        this.direction = dx > 0 ? 1 : -1;
      }
    }
    
    this.velocity.x = this.direction * speed;

    // Calculate movement
    const deltaX = this.velocity.x * deltaTime;
    const deltaY = this.velocity.y * deltaTime;

    // Move horizontally first, check wall collisions
    let newX = this.position.x + deltaX;
    const testBoundsX: BoundingBox = {
      x: newX,
      y: this.position.y,
      width: this.width,
      height: this.height
    };

    // Check wall collisions (horizontal)
    for (const wall of walls) {
      const wallBounds: BoundingBox = {
        x: wall.x,
        y: wall.y,
        width: wall.width,
        height: wall.height
      };
      
      if (CollisionSystem.checkAABB(testBoundsX, wallBounds)) {
        // Hit wall - reverse direction
        this.reverseDirection();
        this.velocity.x = this.direction * speed;
        newX = this.position.x; // Don't move
        break;
      }
    }

    this.position.x = newX;

    // Move vertically (gravity)
    let newY = this.position.y + deltaY;
    
    // Check if standing on a platform
    let onPlatform = false;
    const feetY = this.position.y + this.height;
    const testBoundsY: BoundingBox = {
      x: this.position.x,
      y: newY,
      width: this.width,
      height: this.height
    };

    // Check platform collisions (vertical - standing on top)
    for (const platform of platforms) {
      const platformBounds: BoundingBox = {
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height
      };
      
      // Check if standing on top of platform
      if (
        this.position.x + this.width > platform.x &&
        this.position.x < platform.x + platform.width &&
        feetY >= platform.y - 2 &&
        feetY <= platform.y + 5 &&
        this.velocity.y >= 0 // Only when falling or stationary
      ) {
        newY = platform.y - this.height;
        this.velocity.y = 0;
        this.isFalling = false;
        onPlatform = true;
        break;
      }
      
      // Check collision from sides/bottom (wall collision)
      if (CollisionSystem.checkAABB(testBoundsY, platformBounds)) {
        const overlapTop = (testBoundsY.y + testBoundsY.height) - platformBounds.y;
        const overlapBottom = (platformBounds.y + platformBounds.height) - testBoundsY.y;
        
        if (overlapTop < overlapBottom && this.velocity.y < 0) {
          // Hit platform from below
          newY = platformBounds.y + platformBounds.height;
          this.velocity.y = 0;
        }
      }
    }

    // Check wall collisions (vertical)
    for (const wall of walls) {
      const wallBounds: BoundingBox = {
        x: wall.x,
        y: wall.y,
        width: wall.width,
        height: wall.height
      };
      
      if (CollisionSystem.checkAABB(testBoundsY, wallBounds)) {
        const overlapTop = (testBoundsY.y + testBoundsY.height) - wallBounds.y;
        const overlapBottom = (wallBounds.y + wallBounds.height) - testBoundsY.y;
        
        if (overlapTop < overlapBottom) {
          newY = wallBounds.y - this.height;
          this.velocity.y = 0;
          onPlatform = true;
        } else {
          newY = wallBounds.y + wallBounds.height;
          this.velocity.y = 0;
        }
      }
    }

    this.position.y = newY;

    // Update falling state
    if (!onPlatform && this.velocity.y > 0) {
      this.isFalling = true;
    }

    // Update power cooldown
    if (this.powerCooldown > 0) {
      this.powerCooldown -= deltaTime;
    }
  }

  public getBounds(): BoundingBox {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height
    };
  }

  public activateSuperPower(): boolean {
    if (!this.superPower || this.powerCooldown > 0 || this.isUsingPower) {
      return false;
    }

    this.isUsingPower = true;
    this.powerCooldown = 2.0; // 2 second cooldown
    return true;
  }

  public stopUsingPower(): void {
    this.isUsingPower = false;
  }

  public checkReachedGate(gatePosition: Vector2, gateWidth: number): boolean {
    if (this.hasReachedGate) return false; // Already reached, don't trigger again
    
    const bounds = this.getBounds();
    const gateLeft = gatePosition.x;
    const gateRight = gatePosition.x + gateWidth;
    const gateTop = gatePosition.y;
    const gateBottom = gatePosition.y + 50;

    if (
      bounds.x + bounds.width >= gateLeft &&
      bounds.x <= gateRight &&
      bounds.y + bounds.height >= gateTop &&
      bounds.y <= gateBottom
    ) {
      this.hasReachedGate = true;
      this.isActive = false;
      return true;
    }
    return false;
  }

  public reverseDirection(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }
}

