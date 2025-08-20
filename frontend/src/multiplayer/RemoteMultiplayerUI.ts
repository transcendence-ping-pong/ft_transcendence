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

  constructor(advancedTexture: AdvancedDynamicTexture, guiConstants: any, difficulty?: string, babylonGUI?: any) {
    this.advancedTexture = advancedTexture;
    this.guiConstants = guiConstants;
    this.currentUsername = state.userData?.username || 'Player';
    this.selectedDifficulty = difficulty || 'MEDIUM';
    this.babylonGUI = babylonGUI;
  }

  public show() {
    this.isActive = true;
    // always attach listeners so UI re-renders on updates
    this.setupSignalListeners();

    // if already in a room (e.g., invite accepted), jump straight to waiting room
    if (remoteMultiplayerManager.isInRoom()) {
      const room = remoteMultiplayerManager.getCurrentRoom();
      if (room) {
        // if we are the guest (not host), auto-join the room on the server
        const state = remoteMultiplayerManager.getState();
        if (state && state.isHost === false && room.id) {
          remoteMultiplayerManager.joinRoom(room.id);
        }
        this.renderGameRoom(room);
        return;
      }
    }
    // otherwise show main remote multiplayer menu
    this.renderMainMenu();
  }

  private renderMainMenu() {
    // completely clear everything and render main menu
    this.clearAllElements();

    // if room exists by the time UI is shown, render it directly
    if (remoteMultiplayerManager.isInRoom()) {
      const room = remoteMultiplayerManager.getCurrentRoom();
      if (room) {
        this.renderGameRoom(room);
        return;
      }
    }

    // Create game button
    const createButton = this.createButton(t("game.newGame"), "createButton");
    this.babylonGUI.setButtonStyle(createButton, 0, 2);
    createButton.onPointerUpObservable.add(() => {
      this.createGame();
    });
    this.addElement(createButton);

    // List games button
    const listGamesButton = this.createButton(t("game.listGames"), "listGamesButton");
    this.babylonGUI.setButtonStyle(listGamesButton, 1, 2);
    listGamesButton.onPointerUpObservable.add(() => {
      this.showGamesModal();
    });
    this.addElement(listGamesButton);

    // Connect and request rooms
    remoteMultiplayerManager.connect(this.currentUsername);

    // Listen for clean signals (already attached in show())
  }

  private setupSignalListeners() {
    // Clean signal system - UI only listens to clean signals from manager

    // Room state changed (any room update) - TRIGGER COMPLETE RE-RENDER
    window.addEventListener('roomStateChanged', (e: CustomEvent) => {
      if (!this.isActive) return;
      console.log('UI: Room state changed - re-rendering page', e.detail);
      if (e.detail.currentRoom) {
        console.log('UI: Rendering game room with players:', e.detail.currentRoom.players);
        this.renderGameRoom(e.detail.currentRoom);
      }
    });

    // Guest joined (host sees guest) - TRIGGER RE-RENDER
    window.addEventListener('guestJoined', (e: CustomEvent) => {
      if (!this.isActive) return;
      console.log('UI: Guest joined - re-rendering game room', e.detail);
      this.renderGameRoom(e.detail.room);
    });

    // Player ready status (someone clicked ready) - TRIGGER RE-RENDER
    window.addEventListener('playerReadyStatus', (e: CustomEvent) => {
      if (!this.isActive) return;
      console.log('UI: Player ready status - re-rendering game room', e.detail);
      // Update the room with ready status before re-rendering
      if (e.detail.room) {
        // Update the room's ready status based on the event
        const readyPlayer = e.detail.readyPlayer;
        const isHostReady = e.detail.isHostReady;

        if (isHostReady) {
          e.detail.room.hostReady = true;
          console.log('UI: Updated room hostReady to true');
        } else {
          e.detail.room.guestReady = true;
          console.log('UI: Updated room guestReady to true');
        }

        // Also update the manager's room state to keep it in sync
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
    });

    // Available rooms list
    window.addEventListener('availableRoomsList', (e: CustomEvent) => {
      if (!this.isActive) return;
      console.log('UI: Available rooms received', e.detail);
      this.updateGamesListInModal(e.detail);
    });

    // Connection lost - TRIGGER MAIN MENU RE-RENDER
    window.addEventListener('connectionLost', (e: CustomEvent) => {
      if (!this.isActive) return;
      console.log('UI: Connection lost - re-rendering main menu', e.detail);
      this.renderMainMenu();
    });

    // Game start - Both players ready, transition to game
    // REMOVED: This was causing conflicts with game orchestrator
    // The gameStart event should only be handled by the game orchestrator

    // Invite accepted - Handle transition from chat to multiplayer
    window.addEventListener('inviteAccepted', (e: CustomEvent) => {
      if (!this.isActive) return;
      console.log('UI: Invite accepted - transitioning to multiplayer', e.detail);

      // If we're not already in a room, this is an invite acceptance
      // We need to transition to the multiplayer interface
      if (!remoteMultiplayerManager.isInRoom()) {
        // Connect to websocket if not already connected
        remoteMultiplayerManager.connect(this.currentUsername);

        // The inviteAccepted event will set up the room state in the manager
        // Then we'll receive roomStateChanged and render the game room
      }
    });

    // Hide UI cleanly when game starts or when orchestrator asks to hide
    window.addEventListener('gameStart', () => {
      this.isActive = false;
      this.clearAllElements();
    });
    window.addEventListener('hideMultiplayerUI', () => {
      this.isActive = false;
      this.clearAllElements();
    });
  }

  private createGame() {
    // completely clear everything and show creating state
    this.clearAllElements();

    // show creating text
    const creatingText = new TextBlock("creatingText");
    creatingText.text = "Creating game...";
    creatingText.color = "white";
    creatingText.fontSize = (this.guiConstants.BUTTON_FONT_SIZE * 1.5 * state.scaleFactor.scaleY) + 'px';
    creatingText.top = "0%";
    creatingText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    creatingText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.addElement(creatingText);

    // create room with selected difficulty
    const settings = {
      difficulty: this.selectedDifficulty,
      gameType: 'ONE MATCH',
      playerMode: 'TWO PLAYERS'
    };

    websocketService.sendBrowserLog('info', 'Creating remote game with settings', settings);
    remoteMultiplayerManager.createRoom(settings);
  }

  private showGamesModal() {
    // displays games list using the same modal system as tournament
    // keeps existing buttons visible (modal opens on top)

    // dispatch event to open modal (like tournament does)
    window.dispatchEvent(new CustomEvent('openRemoteGamesModal', {
      detail: {}
    }));

    // request available rooms
    remoteMultiplayerManager.requestAvailableRooms();

    // render a simple loading skeleton while fetching
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

    // show joining text
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

    // get current state to show proper ready status
    const currentState = remoteMultiplayerManager.getState();
    const isHost = currentState.isHost;

    // determine host and guest names and status
    const hostName = room.hostUsername;

    // Check if there's actually a guest in the room and get their name
    const hasGuest = room.currentPlayers > 1;
    let guestName: string;

    if (isHost) {
      if (hasGuest) {
        // Host: show guest's actual username
        guestName = room.guestUsername || 'Guest'; // fallback if guestUsername not set
      } else {
        // Host: waiting for guest
        guestName = t("game.waiting");
      }
    } else {
      // Guest: show own username
      guestName = this.currentUsername;
    }

    // show ready status based on room's ready flags (not just current user)
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
      // no immediate button styling; ready status will reflect in players list
    });
    this.addElement(readyButton);

    // removed leave room button (causing race/UX issues)
  }

  private setReady() {
    // marks player as ready; ui reflects via players list only
    websocketService.sendBrowserLog('info', 'Setting player ready', {
      username: this.currentUsername,
      roomId: remoteMultiplayerManager.getCurrentRoom()?.id
    });

    // update manager state first
    remoteMultiplayerManager.setReady();
    // UI will be updated automatically when the playerReady event is received
    // no need for manual refresh - let the socket events drive the UI
  }

  private leaveRoom() {
    // leaves current room and returns to main menu
    websocketService.sendBrowserLog('info', 'Leaving room', {
      username: this.currentUsername,
      roomId: remoteMultiplayerManager.getCurrentRoom()?.id
    });

    remoteMultiplayerManager.leaveRoom();
    // also clear any invite caches so UI resets cleanly
    try {
      localStorage.removeItem('inviteRoom');
      localStorage.removeItem('inviteRoomId');
    } catch { }
    // re-render main menu
    this.renderMainMenu();
  }

  // HELPER METHODS

  private clearAllElements() {
    // completely clear all elements and reset
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
    // clean up all elements
    this.clearAllElements();

    // remove signal listeners
    window.removeEventListener('roomStateChanged', () => { });
    window.removeEventListener('guestJoined', () => { });
    window.removeEventListener('playerReadyStatus', () => { });
    window.removeEventListener('availableRoomsList', () => { });
    window.removeEventListener('connectionLost', () => { });
    // gameStart listener removed - no longer needed
    window.removeEventListener('inviteAccepted', () => { });
  }
}
