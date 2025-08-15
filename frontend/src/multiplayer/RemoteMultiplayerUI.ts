import { AdvancedDynamicTexture, Button, TextBlock, Control } from '@babylonjs/gui';
import { state } from '@/state.js';
import { remoteMultiplayerManager } from './RemoteMultiplayerManager.js';
import { websocketService } from '@/services/websocketService.js';
import { RemoteGameRoom } from './types.js';

export class RemoteMultiplayerUI {
  private advancedTexture: AdvancedDynamicTexture;
  private guiConstants: any;
  private currentUsername: string;
  private selectedDifficulty: string;
  private babylonGUI: any;
  private currentElements: any[] = [];

  constructor(advancedTexture: AdvancedDynamicTexture, guiConstants: any, difficulty?: string, babylonGUI?: any) {
    this.advancedTexture = advancedTexture;
    this.guiConstants = guiConstants;
    this.currentUsername = state.userData?.username || 'Player';
    this.selectedDifficulty = difficulty || 'MEDIUM';
    this.babylonGUI = babylonGUI;
  }

  public show() {
    // show main remote multiplayer menu
    this.renderMainMenu();
  }

  private renderMainMenu() {
    // completely clear everything and render main menu
    this.clearAllElements();
    
    // Create game button
    const createButton = this.createButton("Create New Game", "createButton");
    this.babylonGUI.setButtonStyle(createButton, 0, 2);
    createButton.onPointerUpObservable.add(() => {
      this.createGame();
    });
    this.addElement(createButton);

    // List games button
    const listGamesButton = this.createButton("List Games", "listGamesButton");
    this.babylonGUI.setButtonStyle(listGamesButton, 1, 2);
    listGamesButton.onPointerUpObservable.add(() => {
      this.showGamesModal();
    });
    this.addElement(listGamesButton);
    
    // Connect and request rooms
    remoteMultiplayerManager.connect(this.currentUsername);
    
    // Listen for clean signals
    this.setupSignalListeners();
  }

  private setupSignalListeners() {
    // Clean signal system - UI only listens to clean signals from manager
    
    // Room state changed (any room update) - TRIGGER COMPLETE RE-RENDER
    window.addEventListener('roomStateChanged', (e: CustomEvent) => {
      console.log('UI: Room state changed - re-rendering page', e.detail);
      if (e.detail.currentRoom) {
        this.renderGameRoom(e.detail.currentRoom);
      }
    });

    // Guest joined (host sees guest) - TRIGGER RE-RENDER
    window.addEventListener('guestJoined', (e: CustomEvent) => {
      console.log('UI: Guest joined - re-rendering game room', e.detail);
      this.renderGameRoom(e.detail.room);
    });

    // Player ready status (someone clicked ready) - TRIGGER RE-RENDER
    window.addEventListener('playerReadyStatus', (e: CustomEvent) => {
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
      console.log('UI: Available rooms received', e.detail);
      this.updateGamesListInModal(e.detail);
    });

    // Connection lost - TRIGGER MAIN MENU RE-RENDER
    window.addEventListener('connectionLost', (e: CustomEvent) => {
      console.log('UI: Connection lost - re-rendering main menu', e.detail);
      this.renderMainMenu();
    });

    // Game starting
    window.addEventListener('gameStarting', (e: CustomEvent) => {
      console.log('UI: Game starting', e.detail);
      // TODO: Transition to game
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
  }

  private updateGamesListInModal(rooms: RemoteGameRoom[]) {
    // updates games list in the dom modal
    const gamesListContainer = document.querySelector('#remote-games-modal-content');
    if (!gamesListContainer) return;

    if (!rooms || rooms.length === 0) {
      gamesListContainer.innerHTML = '<p class="text-center text-gray-400">No games available. Create one to get started!</p>';
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
      gameItem.className = 'flex items-center justify-between p-4 border-b border-gray-700';
      
      const roomInfo = document.createElement('div');
      roomInfo.className = 'text-white';
      roomInfo.innerHTML = `
        <div class="font-semibold">Room: ${room.id.slice(-8)}</div>
        <div class="text-sm text-gray-300">Host: ${room.hostUsername} | Difficulty: ${room.difficulty}</div>
      `;
      
      const joinButton = document.createElement('button');
      joinButton.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded';
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
        guestName = 'Waiting for player...';
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
    playersList.color = "black";
    playersList.fontSize = (this.guiConstants.BUTTON_FONT_SIZE * 1.5 * state.scaleFactor.scaleY) + 'px';
    playersList.top = "-20%";
    playersList.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    playersList.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.addElement(playersList);

    // ready button
    const readyButton = this.createButton("Ready", "readyButton");
    this.babylonGUI.setButtonStyle(readyButton, 0, 2);
    readyButton.top = "10%";
    readyButton.onPointerUpObservable.add(() => {
      this.setReady();
    });
    this.addElement(readyButton);

    // leave room button
    const leaveButton = this.createButton("Leave Room", "leaveButton");
    this.babylonGUI.setButtonStyle(leaveButton, 1, 2);
    leaveButton.top = "25%";
    leaveButton.onPointerUpObservable.add(() => {
      this.leaveRoom();
    });
    this.addElement(leaveButton);
  }

  private setReady() {
    // marks player as ready and updates button appearance
    websocketService.sendBrowserLog('info', 'Setting player ready', {
      username: this.currentUsername,
      roomId: remoteMultiplayerManager.getCurrentRoom()?.id
    });
    
    // update manager state first
    remoteMultiplayerManager.setReady();
    
    // update ready button
    const readyButton = this.currentElements.find(el => el.name === 'readyButton');
    if (readyButton) {
      readyButton.textBlock!.text = "Ready ✅";
      readyButton.background = "#4CAF50";
      readyButton.isEnabled = false;
    }
    
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
    window.removeEventListener('roomStateChanged', () => {});
    window.removeEventListener('guestJoined', () => {});
    window.removeEventListener('playerReadyStatus', () => {});
    window.removeEventListener('availableRoomsList', () => {});
    window.removeEventListener('connectionLost', () => {});
    window.removeEventListener('gameStarting', () => {});
  }
}
