import { Vector2, BaddieType, BoundingBox } from './types.js';
import { CollisionSystem } from './CollisionSystem.js';

export class Baddie {
  public position: Vector2;
  public velocity: Vector2;
  public width = 25;
  public height = 25;
  public type: BaddieType;
  public isActive = true;
  public patrolPath: Vector2[];
  public currentPatrolIndex = 0;
  public patrolSpeed = 30;
  public color: string;
  public id: string;

  constructor(
    startPosition: Vector2,
    type: BaddieType,
    patrolPath: Vector2[] = [],
    id: string
  ) {
    this.position = { ...startPosition };
    this.velocity = { x: 0, y: 0 };
    this.type = type;
    this.patrolPath = patrolPath;
    this.id = id;
    this.color = this.getColorForType(type);
  }

  private getColorForType(type: BaddieType): string {
    switch (type) {
      case 'ryanair':
        return '#003366'; // Dark blue
      case 'flybe':
        return '#FF6B6B'; // Red
      case 'virgin':
        return '#FF1493'; // Deep pink
      default:
        return '#666666';
    }
  }

  public isFalling = false;
  public direction: -1 | 1 = 1; // -1 for left, 1 for right

  public update(
    deltaTime: number, 
    platforms: Array<{ x: number; y: number; width: number; height: number }>,
    walls: Array<{ x: number; y: number; width: number; height: number }>
  ): void {
    if (!this.isActive) return;

    // Always apply gravity
    this.velocity.y += 500 * deltaTime;

    // Simple patrol behavior
    if (this.patrolPath.length > 0) {
      const target = this.patrolPath[this.currentPatrolIndex];
      const dx = target.x - this.position.x;

      if (Math.abs(dx) < 5) {
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
      } else {
        // Only move horizontally when patrolling
        if (Math.abs(dx) > 0) {
          this.velocity.x = (dx / Math.abs(dx)) * this.patrolSpeed;
          this.direction = dx > 0 ? 1 : -1;
        }
      }
    } else {
      // Simple back and forth movement
      this.velocity.x = this.patrolSpeed * this.direction;
    }

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
        this.direction = this.direction === 1 ? -1 : 1;
        this.velocity.x = this.patrolSpeed * this.direction;
        newX = this.position.x; // Don't move
        break;
      }
    }

    this.position.x = newX;

    // Move vertically (gravity)
    let newY = this.position.y + deltaY;
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
        this.velocity.y >= 0
      ) {
        newY = platform.y - this.height;
        this.velocity.y = 0;
        this.isFalling = false;
        onPlatform = true;
        break;
      }
      
      // Check collision from sides/bottom
      if (CollisionSystem.checkAABB(testBoundsY, platformBounds)) {
        const overlapTop = (testBoundsY.y + testBoundsY.height) - platformBounds.y;
        if (overlapTop < (platformBounds.y + platformBounds.height) - testBoundsY.y && this.velocity.y < 0) {
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
        if (overlapTop < (wallBounds.y + wallBounds.height) - testBoundsY.y) {
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
  }



  public setVelocity(x: number, y: number): void {
    this.velocity.x = x;
    this.velocity.y = y;
  }

  public getBounds(): BoundingBox {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height
    };
  }

  public checkCollisionWithPassenger(passengerBounds: BoundingBox): boolean {
    const baddieBounds = this.getBounds();
    return (
      baddieBounds.x < passengerBounds.x + passengerBounds.width &&
      baddieBounds.x + baddieBounds.width > passengerBounds.x &&
      baddieBounds.y < passengerBounds.y + passengerBounds.height &&
      baddieBounds.y + baddieBounds.height > passengerBounds.y
    );
  }
}

