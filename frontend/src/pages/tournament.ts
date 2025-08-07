// FRONTEND: torneiobracket + botão iniciar partida
import { state } from "@/state";
import { GameManager } from '@/game/GameManager';
import { GameLevel, GameScore } from '@/utils/gameUtils/GameConstants.js';

export async function renderBracket(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <h2 class="text-xl mb-4">Criar Torneio</h2>
    <form id="tournamentForm" class="flex flex-col gap-2">
      ${Array.from({ length: 8 }, (_, i) => `
        <input name="player${i}" placeholder="Jogador ${i + 1}" required class="input" />
      `).join('')}
      <button type="submit" class="btn btn-primary mt-2">Iniciar Torneio</button>
    </form>
    <div id="bracket"></div>
  `;

  const form = container.querySelector('#tournamentForm') as HTMLFormElement;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const players = Array.from({ length: 8 }, (_, i) => formData.get(`player${i}`)?.toString().trim()).filter(Boolean);

    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        //creatorId: state.loggedInUser?.id,
        creatorId: 1,
        players,
      })
    });

    const data = await res.json();
    if (res.ok) {
      state.tournamentId = data.tournamentId;
      renderTournamentBracket(data.tournamentId, container.querySelector('#bracket'));
    } else {
      alert(data.error || 'Erro ao criar torneio');
    }
  };
}

export async function renderTournamentBracket(tournamentId: number, bracketContainer: HTMLElement | null) {
  if (!bracketContainer) return;

  const res = await fetch(`/api/${tournamentId}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : { matches: [] };

  // Filtra apenas os jogos das quartas de final (primeiros 4 jogos)
  const quarterfinals = data.matches.slice(0, 4);

  // Encontra o próximo jogo das quartas sem vencedor
  const nextMatch = quarterfinals.find(m => !m.winnerDisplayName || m.winnerDisplayName.trim() === '');

  bracketContainer.innerHTML = `
    <h3 class="text-lg font-bold mb-2">Quartas de Final</h3>
    ${quarterfinals.map((match, idx) => `
      <div class="border p-2 my-1 rounded shadow">
        <strong>Jogo ${idx + 1}:</strong>
        <span>${match.player1DisplayName}</span> vs <span>${match.player2DisplayName}</span>
        ${match.winnerDisplayName && match.winnerDisplayName.trim() !== ''
          ? `<p class="mt-1 text-green-600">🏆 Vencedor: ${match.winnerDisplayName}</p>`
          : nextMatch && match.matchId === nextMatch.matchId
            ? `<button class="btn btn-primary start-match-btn mt-2" data-matchid="${match.matchId}">Iniciar Partida</button>`
            : ''
        }
      </div>
    `).join('')}
    ${quarterfinals.every(m => m.winnerDisplayName && m.winnerDisplayName.trim() !== '')
      ? `<p class="mt-4 font-semibold">Quartas de final concluídas!</p>`
      : ''}
  `;

  // Adiciona evento ao botão "Iniciar Partida" do próximo jogo pendente
  bracketContainer.querySelectorAll('.start-match-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const matchId = Number((e.target as HTMLButtonElement).dataset.matchid);
      window.location.href = `/game?matchId=${matchId}&tournament=1`;
      //startTournamentGame(matchId, tournamentId, bracketContainer);
    });
  });
}

// Função para iniciar o jogo e voltar para a página das quartas ao terminar
function startTournamentGame(matchId: number, tournamentId: number, bracketContainer: HTMLElement) {
  const gm = new GameManager(matchId);
  gm.setLevel(GameLevel.MEDIUM);
  gm.startGame(() => {
    // Callback ao terminar o jogo: re-renderiza os jogos das quartas
    renderTournamentBracket(tournamentId, bracketContainer);
  });
}
