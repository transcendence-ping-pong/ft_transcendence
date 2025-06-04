import { GameLevel } from '../../utils/gameUtils/types.js';

export class GameManager {
  public score: [number, number] = [0, 0];
  public isStarted = false;
  public isGameOver = false;
  public level: GameLevel = GameLevel.EASY;

  startGame() { this.isStarted = true; this.isGameOver = false; this.reset(); }
  endGame() { this.isStarted = false; this.isGameOver = true; }
  setLevel(level: GameLevel) {
    this.level = level;
    this.reset(); // reset game state when changing Level
  }
  getLevel() {
    return this.level;
  }
  addScore(player: number) { }
  reset() { }
}
