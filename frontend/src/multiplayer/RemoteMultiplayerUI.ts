import { AdvancedDynamicTexture, Button, TextBlock, Control } from '@babylonjs/gui';
import { state } from '@/state.js';
import { t } from '@/locales/Translations.js';
import { remoteMultiplayerManager } from './RemoteMultiplayerManager.js';
import { websocketService } from '@/services/websocketService.js';
import { RemoteGameRoom } from './types.js';
import '@/components/_templates/AuthFormLayout.js';

export class RemoteMultiplayerUI {
  private advancedTexture: AdvancedDynamicTexture;
  private guiConstants: any;
  private currentUsername: string;
  private selectedDifficulty: string;
  private babylonGUI: any;
  private currentElements: any[] = [];
  private isActive: boolean = false;
  private listenersAttached: boolean = false;

  // bound handlers for add/remove symmetry
  private onRoomStateChanged?: (e: CustomEvent) => void;
  private onGuestJoined?: (e: CustomEvent) => void;
  private onPlayerReadyStatus?: (e: CustomEvent) => void;
  private onAvailableRoomsList?: (e: CustomEvent) => void;
  private onConnectionLost?: (e: CustomEvent) => void;
  private onInviteAccepted?: (e: CustomEvent) => void;
  private onGameStart?: () => void;
  private onHideMultiplayerUI?: () => void;

  constructor(advancedTexture: AdvancedDynamicTexture, guiConstants: any, difficulty?: string, babylonGUI?: any) {
    this.advancedTexture = advancedTexture;
    this.guiConstants = guiConstants;
    this.currentUsername = state.userData?.username || 'Player';
    this.selectedDifficulty = difficulty || 'MEDIUM';
    this.babylonGUI = babylonGUI;
  }

  public show() {
    this.isActive = true;
    this.setupSignalListeners();

    if (remoteMultiplayerManager.isInRoom()) {
      const room = remoteMultiplayerManager.getCurrentRoom();
      if (room) {
        const state = remoteMultiplayerManager.getState();
        if (state && state.isHost === false && room.id) {
          remoteMultiplayerManager.joinRoom(room.id);
        }
        this.renderGameRoom(room);
        return;
      }
    }
    this.renderMainMenu();
  }

  private renderMainMenu() {
    this.clearAllElements();

    if (remoteMultiplayerManager.isInRoom()) {
      const room = remoteMultiplayerManager.getCurrentRoom();
      if (room) {
        this.renderGameRoom(room);
        return;
      }
    }

    const createButton = this.createButton(t("game.newGame"), "createButton");
    this.babylonGUI.setButtonStyle(createButton, 0, 2);
    createButton.onPointerUpObservable.add(() => {
      this.createGame();
    });
    this.addElement(createButton);

    const listGamesButton = this.createButton(t("game.listGames"), "listGamesButton");
    this.babylonGUI.setButtonStyle(listGamesButton, 1, 2);
    listGamesButton.onPointerUpObservable.add(() => {
      this.showGamesModal();
    });
    this.addElement(listGamesButton);

    remoteMultiplayerManager.connect(this.currentUsername);
  }

  private setupSignalListeners() {
    if (this.listenersAttached) return;

    // room state changed (any room update)
    this.onRoomStateChanged = (e: CustomEvent) => {
      if (!this.isActive) return;
      if (e.detail.currentRoom) {
        this.renderGameRoom(e.detail.currentRoom);
      }
    };
    window.addEventListener('roomStateChanged', this.onRoomStateChanged as EventListener);

    // guest joined (host sees guest)
    this.onGuestJoined = (e: CustomEvent) => {
      if (!this.isActive) return;
      this.renderGameRoom(e.detail.room);
    };
    window.addEventListener('guestJoined', this.onGuestJoined as EventListener);

    // player ready status (someone clicked ready)
    this.onPlayerReadyStatus = (e: CustomEvent) => {
      if (!this.isActive) return;
      if (e.detail.room) {
        const readyPlayer = e.detail.readyPlayer;
        const isHostReady = e.detail.isHostReady;

        if (isHostReady) {
          e.detail.room.hostReady = true;
        } else {
          e.detail.room.guestReady = true;
        }

        const currentRoom = remoteMultiplayerManager.getCurrentRoom();
        if (currentRoom) {
          if (isHostReady) {
            currentRoom.hostReady = true;
          } else {
            currentRoom.guestReady = true;
          }
        }
      }
      this.renderGameRoom(e.detail.room);
    };
    window.addEventListener('playerReadyStatus', this.onPlayerReadyStatus as EventListener);

    // available rooms list
    this.onAvailableRoomsList = (e: CustomEvent) => {
      if (!this.isActive) return;
      this.updateGamesListInModal(e.detail);
    };
    window.addEventListener('availableRoomsList', this.onAvailableRoomsList as EventListener);

    // connection lost
    this.onConnectionLost = (_e: CustomEvent) => {
      if (!this.isActive) return;
      this.renderMainMenu();
    };
    window.addEventListener('connectionLost', this.onConnectionLost as EventListener);

    // invite accepted
    this.onInviteAccepted = (_e: CustomEvent) => {
      if (!this.isActive) return;
      if (!remoteMultiplayerManager.isInRoom()) {
        // connect to websocket if not already connected
        remoteMultiplayerManager.connect(this.currentUsername);
      }
    };
    window.addEventListener('inviteAccepted', this.onInviteAccepted as EventListener);

    this.onGameStart = () => {
      this.isActive = false;
      this.clearAllElements();
      this.detachSignalListeners();
    };
    window.addEventListener('gameStart', this.onGameStart as EventListener);

    this.onHideMultiplayerUI = () => {
      this.isActive = false;
      this.clearAllElements();
      this.detachSignalListeners();
    };
    window.addEventListener('hideMultiplayerUI', this.onHideMultiplayerUI as EventListener);

    this.listenersAttached = true;
  }

  private createGame() {
    this.clearAllElements();
    const creatingText = new TextBlock("creatingText");
    creatingText.text = "Creating game...";
    creatingText.color = "white";
    creatingText.fontSize = (this.guiConstants.BUTTON_FONT_SIZE * 1.5 * state.scaleFactor.scaleY) + 'px';
    creatingText.top = "0%";
    creatingText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    creatingText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.addElement(creatingText);

    const settings = {
      difficulty: this.selectedDifficulty,
      gameType: 'ONE MATCH',
      playerMode: 'TWO PLAYERS'
    };

    websocketService.sendBrowserLog('info', 'Creating remote game with settings', settings);
    remoteMultiplayerManager.createRoom(settings);
  }

  private showGamesModal() {
    window.dispatchEvent(new CustomEvent('openRemoteGamesModal', {
      detail: {}
    }));
    remoteMultiplayerManager.requestAvailableRooms();
    const modal = document.querySelector('generic-modal');
    const container = document.querySelector('#remote-games-modal-content');
    if (modal && container) {
      container.innerHTML = `
        <auth-form-layout>
          <h3 slot="header">${t("game.listGames")}</h3>
          <div slot="content" class="w-full max-w-3xl">
            <div class="grid grid-cols-1 gap-3">
              ${Array.from({ length: 4 }).map(() => `
                <div class=\"animate-pulse bg-gray-800/60 border border-gray-700 rounded-lg h-20\"></div>
              `).join('')}
            </div>
          </div>
        <auth-form-layout>
      `;
    }
  }

  private updateGamesListInModal(rooms: RemoteGameRoom[]) {
    // updates games list in the dom modal
    const gamesListContainer = document.querySelector('#remote-games-modal-content');
    if (!gamesListContainer) return;

    if (!rooms || rooms.length === 0) {
      gamesListContainer.innerHTML = `
      <auth-form-layout>
        <h3 slot="header">${t("game.listTitle")}</h3>
        <div slot="content" class="w-full max-w-xl text-center text-gray-300">
          <h3 style="color: var(--text); font-weight: 600; margin-bottom: 0.25rem; font-size: 1.125rem;">
            ${t("game.noGames")}
          </h3>
          <p class="mb-4" style="color: var(--border); font-size: var(--main-text-size)">
            ${t("game.beFirstToCreateRoom")}
          </p>
        </div>
        <span slot="footer">
          <style>
            .template__primary-button {
              padding: 1rem 0;
              border: none;
              background: var(--accent-secondary);
              color: var(--body);
              font-size: calc(var(--main-font-size) * 1.25);
              font-weight: bold;
              min-height: var(--button-height, 59px);
              width: 100%;
              cursor: pointer;
              transition: background 0.2s, color 0.2s;
            }
            .template__primary-button:hover, .template__primary-button:focus {
              background: var(--accent);
              color: var(--text);
            }
          </style>
          <button id="create-game-btn" class="template__primary-button">
            ${t("game.createGame")}
          </button>
        </span>
      </auth-form-layout>
    `;


      const createBtn = document.querySelector('#create-game-btn') as HTMLButtonElement | null;
      if (createBtn) {
        createBtn.onclick = () => {
          const modal = document.querySelector('generic-modal');
          if (modal) modal.remove();
          this.createGame();
        };
      }
      return;
    }

    // clear previous content and show games
    this.showStructuredGamesListInModal(rooms);
  }

  private showStructuredGamesListInModal(rooms: RemoteGameRoom[]) {
    // displays structured list of games in dom modal with join buttons
    const gamesListContainer = document.querySelector('#remote-games-modal-content');
    if (!gamesListContainer) return;

    // clear container
    gamesListContainer.innerHTML = '';

    // show available games
    rooms.forEach((room: RemoteGameRoom, index: number) => {
      const gameItem = document.createElement('div');
      gameItem.className = 'flex items-center justify-between p-4 mb-3 rounded-lg border border-gray-700 bg-gray-800/70 hover:bg-gray-800/90 transition';

      const roomInfo = document.createElement('div');
      roomInfo.className = 'text-white flex items-center gap-4';

      const badge = document.createElement('div');
      badge.className = 'text-xs px-2 py-1 rounded-full border';
      const diff = (room.difficulty || 'MEDIUM').toUpperCase();
      const badgeMap: Record<string, string> = {
        'EASY': 'bg-green-900/40 border-green-700 text-green-300',
        'MEDIUM': 'bg-blue-900/40 border-blue-700 text-blue-300',
        'HARD': 'bg-red-900/40 border-red-700 text-red-300'
      };
      badge.className += ' ' + (badgeMap[diff] || badgeMap['MEDIUM']);
      badge.textContent = diff;

      const infoText = document.createElement('div');
      infoText.innerHTML = `
        <div class="font-semibold">Room ${room.id.slice(-6)}</div>
        <div class="text-sm text-gray-300">Host: <span class="text-white">${room.hostUsername}</span> · Players: ${room.currentPlayers}/2</div>
      `;

      roomInfo.appendChild(badge);
      roomInfo.appendChild(infoText);

      const joinButton = document.createElement('button');
      joinButton.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow';
      joinButton.textContent = 'Join';
      joinButton.onclick = () => {
        this.joinRoom(room.id);
        // close modal
        const modal = document.querySelector('generic-modal');
        if (modal) modal.remove();
      };

      gameItem.appendChild(roomInfo);
      gameItem.appendChild(joinButton);
      gamesListContainer.appendChild(gameItem);
    });
  }

  private joinRoom(roomId: string) {
    // completely clear everything and show joining state
    this.clearAllElements();

    const joiningText = new TextBlock("joiningText");
    joiningText.text = "Joining game...";
    joiningText.color = "white";
    joiningText.fontSize = (this.guiConstants.BUTTON_FONT_SIZE * 1.5 * state.scaleFactor.scaleY) + 'px';
    joiningText.top = "0%";
    joiningText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    joiningText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.addElement(joiningText);

    // join the room
    websocketService.sendBrowserLog('info', 'Joining room', { roomId });
    remoteMultiplayerManager.joinRoom(roomId);
  }

  private renderGameRoom(room: RemoteGameRoom) {
    console.log('UI: renderGameRoom called with room:', room);
    // completely clear everything and render game room
    this.clearAllElements();

    const currentState = remoteMultiplayerManager.getState();
    const isHost = currentState.isHost;

    const hostName = room.hostUsername;

    const hasGuest = room.currentPlayers > 1;
    let guestName: string;

    if (isHost) {
      if (hasGuest) {
        guestName = room.guestUsername || 'Guest';
      } else {
        guestName = t("game.waiting");
      }
    } else {
      guestName = this.currentUsername;
    }

    const hostStatus = room.hostReady ? "✅" : "⏳";
    const guestStatus = room.guestReady ? "✅" : "⏳";

    // players list
    const playersList = new TextBlock("playersList");
    playersList.text = `👑 ${hostName} ${hostStatus}\n👤 ${guestName} ${guestStatus}`;
    playersList.color = this.guiConstants.BUTTON_FONT_COLOR;
    playersList.fontSize = (this.guiConstants.BUTTON_FONT_SIZE * 1.5 * state.scaleFactor.scaleY) + 'px';
    playersList.top = "-20%";
    playersList.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    playersList.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.addElement(playersList);

    // ready button
    const readyButton = this.createButton(t("game.ready"), "readyButton");
    this.babylonGUI.setButtonStyle(readyButton, 0, 2);
    readyButton.top = "10%";
    readyButton.onPointerUpObservable.add(() => {
      this.setReady();
    });
    this.addElement(readyButton);
  }

  private setReady() {
    websocketService.sendBrowserLog('info', 'Setting player ready', {
      username: this.currentUsername,
      roomId: remoteMultiplayerManager.getCurrentRoom()?.id
    });
    remoteMultiplayerManager.setReady();
  }

  private leaveRoom() {
    websocketService.sendBrowserLog('info', 'Leaving room', {
      username: this.currentUsername,
      roomId: remoteMultiplayerManager.getCurrentRoom()?.id
    });

    remoteMultiplayerManager.leaveRoom();
    try {
      localStorage.removeItem('inviteRoom');
      localStorage.removeItem('inviteRoomId');
    } catch { }
    this.renderMainMenu();
  }

  private clearAllElements() {
    this.currentElements.forEach(element => {
      this.advancedTexture.removeControl(element);
    });
    this.currentElements = [];
  }

  private createButton(text: string, name: string): Button {
    const button = Button.CreateSimpleButton(name, text);
    button.name = name;
    return button;
  }

  private addElement(element: any) {
    this.advancedTexture.addControl(element);
    this.currentElements.push(element);
  }

  public destroy() {
    this.clearAllElements();
    this.detachSignalListeners();
  }

  private detachSignalListeners() {
    if (!this.listenersAttached) return;
    if (this.onRoomStateChanged) window.removeEventListener('roomStateChanged', this.onRoomStateChanged as EventListener);
    if (this.onGuestJoined) window.removeEventListener('guestJoined', this.onGuestJoined as EventListener);
    if (this.onPlayerReadyStatus) window.removeEventListener('playerReadyStatus', this.onPlayerReadyStatus as EventListener);
    if (this.onAvailableRoomsList) window.removeEventListener('availableRoomsList', this.onAvailableRoomsList as EventListener);
    if (this.onConnectionLost) window.removeEventListener('connectionLost', this.onConnectionLost as EventListener);
    if (this.onInviteAccepted) window.removeEventListener('inviteAccepted', this.onInviteAccepted as EventListener);
    if (this.onGameStart) window.removeEventListener('gameStart', this.onGameStart as EventListener);
    if (this.onHideMultiplayerUI) window.removeEventListener('hideMultiplayerUI', this.onHideMultiplayerUI as EventListener);

    this.onRoomStateChanged = undefined;
    this.onGuestJoined = undefined;
    this.onPlayerReadyStatus = undefined;
    this.onAvailableRoomsList = undefined;
    this.onConnectionLost = undefined;
    this.onInviteAccepted = undefined;
    this.onGameStart = undefined;
    this.onHideMultiplayerUI = undefined;
    this.listenersAttached = false;
  }
}
