export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <h1>Home Page</h1>
      <a href="/login">Go to Login</a> |
      <a href="/game">Go to Game</a>
    `;
  }
}