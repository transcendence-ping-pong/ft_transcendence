import { GameLevel, GameScore } from '@/utils/gameUtils/GameConstants.js';
import { createMatch } from '@/services/matchService';
import { updateMatch } from '@/services/matchService';
import { state } from '@/state';

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
  private winner: string;
  public tempnumber: number;
  private scoreMax: number = Number(GameScore.SCORE_MAX); // max score to win the game
  private matchId: number | null = null;
  
  async startGame(onFinish?: () => void) { 
    this.isStarted = true; 
    this.isGameOver = false;
	this.tempnumber = 0;
	const match = await createMatch(state.UserData.userId, this.tempnumber, this.tempnumber, state.Players.p1, state.Players.p2);
	this.matchId = match.id;
    this.reset();
    this._onFinish = onFinish;
  }
  private _onFinish?: () => void;

  endGame()
  { 
    this.isStarted = false; 
    this.isGameOver = true;
     if (this._onFinish) this._onFinish();
  }

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

  public getWinner(): 'LEFT' | 'RIGHT' | null {
    if (!this.isGameOver) return null;
    return this.score.LEFT > this.score.RIGHT ? 'LEFT' : 'RIGHT';
  }

  checkIsGameOver(player: GameScore): boolean {
      Object.values(this.score).forEach((score) => {
        if (this.checkTwoPointsRule()) this.scoreMax++;
        if (score == this.scoreMax) {
          this.endGame();
          if (this.getWinner() == 'LEFT')
            this.winner = state.Players.p1;
          else
            this.winner = state.Players.p2;
          // Save match result if matchId
          updateMatch(this.matchId, this.winner, this.score.LEFT, this.score.RIGHT);
        }
      });
      return this.isGameOver;
    } 

  addScore(player: GameScore): void {
    this.score[player] += 1;
    if (this.checkIsGameOver(player)) return;
  }

  setMatchId(id: number) {
    this.matchId = id;
  }

  saveMatchResult(player: GameScore) {
  if (this.matchId) {
    fetch(`/api/matches/${this.matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ winner: player }),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

  reset() {
    this.score = { [GameScore.LEFT]: 0, [GameScore.RIGHT]: 0 };
  }

  //reset() { }
}
