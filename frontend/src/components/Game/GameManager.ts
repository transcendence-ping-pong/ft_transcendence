export class GameManager {
  public score: [number, number] = [0, 0];
  public isStarted = false;
  public isGameOver = false;

  startGame() { this.isStarted = true; this.isGameOver = false; this.reset(); }
  endGame() { this.isStarted = false; this.isGameOver = true; }
  addScore(player: number) { /* ... */ }
  reset() { /* ... */ }
  // tournament logic, etc.
}