export function renderLogin(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <h1>Login Page</h1>
      <a href="/">Go to Home</a> |
      <a href="/game">Go to Game</a>
    `;
  }
}