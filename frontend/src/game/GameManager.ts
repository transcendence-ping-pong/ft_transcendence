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
  private matchId: number | null = null; // <- ID da partida atual
  

  constructor(matchId?: number) {
    this.matchId = matchId || null;
  }

  startGame(onFinish?: () => void) { 
    this.isStarted = true; 
    this.isGameOver = false; 
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

    private async saveMatchResult(winner: GameScore) {
    const winnerName = winner === GameScore.LEFT ? 'Jogador 1' : 'Jogador 2';
    const payload = {
      winnerDisplayName: winnerName,
      scorePlayer1: this.score[GameScore.LEFT],
      scorePlayer2: this.score[GameScore.RIGHT],
    };

    if (!this.matchId) {
      console.warn('⚠️ Nenhum matchId definido — resultado não será salvo.');
      return;
    }

    try {
      const res = await fetch(`/api/matches/${this.matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error('Erro ao salvar partida:', await res.text());
      } else {
        console.log('✅ Resultado salvo com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao conectar à API:', err);
    }
  }

 checkIsGameOver(player: GameScore): boolean {
    Object.values(this.score).forEach((score) => {
      if (this.checkTwoPointsRule()) this.scoreMax++;
      if (score == this.scoreMax) {
        // TODO: UI output for winning/losing
        console.log(`Game Over! Player ${player} wins!`);
        this.endGame();

        // Enviar os dados para a API aqui:
        this.saveMatchResult(player);
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

  reset() {
    this.score = { [GameScore.LEFT]: 0, [GameScore.RIGHT]: 0 };
  }

  //reset() { }
}
