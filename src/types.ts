export type SuperPower = 'bridge' | 'doorBreaker' | 'securityBriber' | null;

export type BaddieType = 'ryanair' | 'flybe' | 'virgin';

export interface Vector2 {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LEVEL_COMPLETE = 'level_complete',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

export interface LevelConfig {
  levelNumber: number;
  obstacles: Obstacle[];
  spawnPoint: Vector2;
  checkInGate: Vector2;
  baddies: BaddieSpawn[];
  difficulty: number;
}

export interface Obstacle {
  type: 'wall' | 'door' | 'gap' | 'security' | 'securityGuard';
  position: Vector2;
  width: number;
  height: number;
  id: string;
}

export interface BaddieSpawn {
  type: BaddieType;
  position: Vector2;
  patrolPath?: Vector2[];
}

