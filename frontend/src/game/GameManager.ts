import { GameLevel, GameScore } from '@/utils/gameUtils/GameConstants.js';

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
  private scoreMax: number = Number(GameScore.SCORE_MAX); // max score to win the game

  startGame() { this.isStarted = true; this.isGameOver = false; this.reset(); }
  endGame() { this.isStarted = false; this.isGameOver = true; }
  setLevel(level: GameLevel) {
    this.level = level;
    this.reset(); // reset game state when changing Level
  }
  getLevel() {
    return this.level;
  }

  // if both players reached score (SCORE_MAX -1), add one more point to the match
  // difference between scores should be at least 2 to end the game
  checkTwoPointsRule(): boolean {
    return (this.score[GameScore.LEFT] == this.scoreMax - 1 &&
      this.score[GameScore.RIGHT] == this.scoreMax - 1);
  }

  checkIsGameOver(player: GameScore): boolean {
    Object.values(this.score).forEach((score) => {
      if (this.checkTwoPointsRule()) this.scoreMax++;
      if (score == this.scoreMax) {
        // TODO: UI output for winning/losing
        console.log(`Game Over! Player ${player} wins!`);
        this.endGame();
      }
    });
    return this.isGameOver;
  }

  addScore(player: GameScore): void {
    this.score[player] += 1;
    if (this.checkIsGameOver(player)) return;
  }

  reset() { }
}
