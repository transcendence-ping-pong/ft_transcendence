import { GameLevel, GameScore } from '@/utils/gameUtils/types.js';

/*
  Game Manager responsabilities:
  - manage game state (start, end, reset)
  - manage game score for both players
  - set and get game level
  - add score for a player (and end game if max score reached)

  Do not:
  - orchestrate game/babylon (it is GameOrchestrator's responsibility)
  - manage rendering/UI
*/

export class GameManager {
  public score = { [GameScore.LEFT]: 0, [GameScore.RIGHT]: 0 };
  public isStarted = false;
  public isGameOver = false;
  public level: GameLevel;

  startGame() { this.isStarted = true; this.isGameOver = false; this.reset(); }
  endGame() { this.isStarted = false; this.isGameOver = true; }
  setLevel(level: GameLevel) {
    this.level = level;
    this.reset(); // reset game state when changing Level
  }
  getLevel() {
    return this.level;
  }
  addScore(player: GameScore): void {
    if (this.score[player] < GameScore.SCORE_MAX) {
      this.score[player] += 1;
    } else {
      this.endGame(); // end game if score reaches max
    }
  }
  reset() { }
}
