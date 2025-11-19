export class CollisionSystem {
    /**
     * Check if two bounding boxes intersect
     */
    static checkAABB(box1, box2) {
        return (box1.x < box2.x + box2.width &&
            box1.x + box1.width > box2.x &&
            box1.y < box2.y + box2.height &&
            box1.y + box1.height > box2.y);
    }
    /**
     * Get collision response - pushes entity out of obstacle
     * Returns the new position and whether collision occurred
     */
    static resolveCollision(entityBounds, obstacleBounds) {
        const result = {
            x: entityBounds.x,
            y: entityBounds.y,
            collisionX: false,
            collisionY: false
        };
        // Calculate overlaps
        const overlapLeft = (entityBounds.x + entityBounds.width) - obstacleBounds.x;
        const overlapRight = (obstacleBounds.x + obstacleBounds.width) - entityBounds.x;
        const overlapTop = (entityBounds.y + entityBounds.height) - obstacleBounds.y;
        const overlapBottom = (obstacleBounds.y + obstacleBounds.height) - entityBounds.y;
        // Find minimum overlap for each axis
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);
        // Resolve X collision
        if (minOverlapX < minOverlapY) {
            if (overlapLeft < overlapRight) {
                result.x = obstacleBounds.x - entityBounds.width;
            }
            else {
                result.x = obstacleBounds.x + obstacleBounds.width;
            }
            result.collisionX = true;
        }
        else {
            // Resolve Y collision
            if (overlapTop < overlapBottom) {
                result.y = obstacleBounds.y - entityBounds.height;
            }
            else {
                result.y = obstacleBounds.y + obstacleBounds.height;
            }
            result.collisionY = true;
        }
        return result;
    }
    /**
     * Check if entity would collide if moved to new position
     */
    static checkCollisionAtPosition(entityBounds, newX, newY, obstacles, ignoreTypes = ['gap']) {
        const testBounds = {
            x: newX,
            y: newY,
            width: entityBounds.width,
            height: entityBounds.height
        };
        for (const obstacle of obstacles) {
            if (ignoreTypes.includes(obstacle.type))
                continue;
            const obstacleBounds = {
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
            };
            if (this.checkAABB(testBounds, obstacleBounds)) {
                return { collided: true, obstacle };
            }
        }
        return { collided: false, obstacle: null };
    }
    /**
     * Move entity with collision detection (separate X and Y)
     */
    static moveWithCollision(currentX, currentY, deltaX, deltaY, width, height, obstacles, ignoreTypes = ['gap']) {
        let newX = currentX + deltaX;
        let newY = currentY + deltaY;
        let hitX = false;
        let hitY = false;
        const entityBounds = { x: currentX, y: currentY, width, height };
        // Check X movement first
        if (deltaX !== 0) {
            const testBounds = { x: newX, y: currentY, width, height };
            for (const obstacle of obstacles) {
                if (ignoreTypes.includes(obstacle.type))
                    continue;
                const obstacleBounds = {
                    x: obstacle.x,
                    y: obstacle.y,
                    width: obstacle.width,
                    height: obstacle.height
                };
                if (this.checkAABB(testBounds, obstacleBounds)) {
                    // Resolve X collision
                    const overlapLeft = (testBounds.x + testBounds.width) - obstacleBounds.x;
                    const overlapRight = (obstacleBounds.x + obstacleBounds.width) - testBounds.x;
                    if (overlapLeft < overlapRight) {
                        newX = obstacleBounds.x - width;
                    }
                    else {
                        newX = obstacleBounds.x + obstacleBounds.width;
                    }
                    hitX = true;
                    break;
                }
            }
        }
        // Check Y movement
        if (deltaY !== 0) {
            const testBounds = { x: newX, y: newY, width, height };
            for (const obstacle of obstacles) {
                if (ignoreTypes.includes(obstacle.type))
                    continue;
                const obstacleBounds = {
                    x: obstacle.x,
                    y: obstacle.y,
                    width: obstacle.width,
                    height: obstacle.height
                };
                if (this.checkAABB(testBounds, obstacleBounds)) {
                    // Resolve Y collision
                    const overlapTop = (testBounds.y + testBounds.height) - obstacleBounds.y;
                    const overlapBottom = (obstacleBounds.y + obstacleBounds.height) - testBounds.y;
                    if (overlapTop < overlapBottom) {
                        newY = obstacleBounds.y - height;
                    }
                    else {
                        newY = obstacleBounds.y + obstacleBounds.height;
                    }
                    hitY = true;
                    break;
                }
            }
        }
        return { x: newX, y: newY, hitX, hitY };
    }
}
//# sourceMappingURL=CollisionSystem.js.map