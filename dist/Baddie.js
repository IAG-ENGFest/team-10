import { CollisionSystem } from './CollisionSystem.js';
export class Baddie {
    constructor(startPosition, type, patrolPath = [], id) {
        this.width = 25;
        this.height = 25;
        this.isActive = true;
        this.currentPatrolIndex = 0;
        this.patrolSpeed = 30;
        this.isFalling = false;
        this.direction = 1; // -1 for left, 1 for right
        this.position = { ...startPosition };
        this.velocity = { x: 0, y: 0 };
        this.type = type;
        this.patrolPath = patrolPath;
        this.id = id;
        this.color = this.getColorForType(type);
    }
    getColorForType(type) {
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
    update(deltaTime, platforms, walls) {
        if (!this.isActive)
            return;
        // Always apply gravity
        this.velocity.y += 500 * deltaTime;
        // Simple patrol behavior
        if (this.patrolPath.length > 0) {
            const target = this.patrolPath[this.currentPatrolIndex];
            const dx = target.x - this.position.x;
            if (Math.abs(dx) < 5) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
            }
            else {
                // Only move horizontally when patrolling
                if (Math.abs(dx) > 0) {
                    this.velocity.x = (dx / Math.abs(dx)) * this.patrolSpeed;
                    this.direction = dx > 0 ? 1 : -1;
                }
            }
        }
        else {
            // Simple back and forth movement
            this.velocity.x = this.patrolSpeed * this.direction;
        }
        // Calculate movement
        const deltaX = this.velocity.x * deltaTime;
        const deltaY = this.velocity.y * deltaTime;
        // Move horizontally first, check wall collisions
        let newX = this.position.x + deltaX;
        const testBoundsX = {
            x: newX,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
        // Check wall collisions (horizontal)
        for (const wall of walls) {
            const wallBounds = {
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
        const testBoundsY = {
            x: this.position.x,
            y: newY,
            width: this.width,
            height: this.height
        };
        // Check platform collisions (vertical - standing on top)
        for (const platform of platforms) {
            const platformBounds = {
                x: platform.x,
                y: platform.y,
                width: platform.width,
                height: platform.height
            };
            // Check if standing on top of platform
            if (this.position.x + this.width > platform.x &&
                this.position.x < platform.x + platform.width &&
                feetY >= platform.y - 2 &&
                feetY <= platform.y + 5 &&
                this.velocity.y >= 0) {
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
            const wallBounds = {
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
                }
                else {
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
    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }
    checkCollisionWithPassenger(passengerBounds) {
        const baddieBounds = this.getBounds();
        return (baddieBounds.x < passengerBounds.x + passengerBounds.width &&
            baddieBounds.x + baddieBounds.width > passengerBounds.x &&
            baddieBounds.y < passengerBounds.y + passengerBounds.height &&
            baddieBounds.y + baddieBounds.height > passengerBounds.y);
    }
}
//# sourceMappingURL=Baddie.js.map