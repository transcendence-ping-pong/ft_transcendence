import { AdvancedDynamicTexture, Button, Control, TextBlock, Rectangle } from "@babylonjs/gui";
import { t } from '@/locales/Translations.js';
import { GameLevel, GameScore, GameMode, GameType, PlayerMode, getGUIConstants } from '@/utils/gameUtils/GameConstants.js';
import { state } from '@/state';
import { RemoteMultiplayerUI } from '../../multiplayer/RemoteMultiplayerUI.js';

// read more here: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D/
export class BabylonGUI {
  private advancedTexture: AdvancedDynamicTexture;
  private startButton: Button | null = null;
  private modeSelectorButtons: Button[] = [];
  private gameTypeButtons: Button[] = [];
  private difficultyButtons: Button[] = [];
  private playerSelectorButtons: Button[] = [];
  private tvOverlay: Rectangle | null = null;
  private countdownText: TextBlock | null = null;
  private scoreBoard: TextBlock[] = [];
  private gameOverText: TextBlock | null = null;
  private fadeOverlay: Rectangle | null = null;
  private GUIConstants = getGUIConstants();

  constructor(scene: any) {
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
  }

  public setButtonStyle(button: Button, idx: number, arrayLength: number) {
    button.width = this.GUIConstants.BUTTON_WIDTH * state.scaleFactor.scaleX + 'px';
    button.height = this.GUIConstants.BUTTON_HEIGHT * state.scaleFactor.scaleY + 'px';
    button.fontSize = this.GUIConstants.BUTTON_FONT_SIZE * state.scaleFactor.scaleY + 'px';
    button.color = this.GUIConstants.BUTTON_FONT_COLOR;
    button.background = this.GUIConstants.BUTTON_BACKGROUND_COLOR;
    button.thickness = this.GUIConstants.BUTTON_THICKNESS;
    button.cornerRadius = this.GUIConstants.BUTTON_CORNER_RADIUS;
    button.fontWeight = this.GUIConstants.BUTTON_FONT_WEIGHT;
    // @ts-ignore
    button.borderColor = this.GUIConstants.BUTTON_BORDER_COLOR;
    button.shadowOffsetX = this.GUIConstants.BUTTON_SHADOW_OFFSET_X;
    button.shadowOffsetY = this.GUIConstants.BUTTON_SHADOW_OFFSET_Y;
    button.shadowColor = this.GUIConstants.BUTTON_SHADOW_COLOR;
    button.shadowBlur = this.GUIConstants.BUTTON_SHADOW_BLUR;
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    // set top position based on number of buttons, i.e. how they are distributed vertically
    const offset = (((+this.GUIConstants.BUTTON_HEIGHT + this.GUIConstants.BUTTON_GAP) * state.scaleFactor.scaleY) * (idx - (arrayLength - 1) / 2));
    button.top = offset;
    button.hoverCursor = "pointer";
  }

  public hideButtons(arrayButtons: Button[]) {
    arrayButtons.forEach(btn => this.advancedTexture.removeControl(btn));
    arrayButtons = [];
  }

  public showStartButton(onStart: () => void) {
    this.startButton = Button.CreateSimpleButton("startButton", t("game.start"));
    this.setButtonStyle(this.startButton, 0, 1); // only one button, so idx = 0, arrayLength = 1

    // on button click event, trigger the onStart callback... then hide buttons
    this.startButton.onPointerUpObservable.add(() => {
      onStart();
      this.hideButtons([this.startButton]);
    });
    this.advancedTexture.addControl(this.startButton);
  }

  public showGameModeButton(onModeSelected: (mode: GameMode) => void) {
    const modeKeys = [GameMode.LOCAL, GameMode.REMOTE];
    this.modeSelectorButtons = [];

    modeKeys.forEach((mode, idx) => {
      const label = t(`game.mode${idx + 1}`);
      const button = Button.CreateSimpleButton(mode + "Button", label);
      this.setButtonStyle(button, idx, modeKeys.length);

      button.onPointerUpObservable.add(() => {
        onModeSelected(mode);
        this.hideButtons(this.modeSelectorButtons);
      });

      this.advancedTexture.addControl(button);
      this.modeSelectorButtons.push(button);
    });
  }

  public showGameTypeButton(onGameTypeSelected: (gameType: GameType) => void) {
    const gameTypeKeys = [GameType.ONE_MATCH, GameType.TOURNAMENT];
    this.gameTypeButtons = [];

    gameTypeKeys.forEach((type: GameType, idx: number) => {
      const label = t(`game.game${idx + 1}`);
      const button = Button.CreateSimpleButton(type + "Button", label);
      this.setButtonStyle(button, idx, gameTypeKeys.length);

      button.onPointerUpObservable.add(() => {
        onGameTypeSelected(type);
        this.hideButtons(this.gameTypeButtons);
      });

      this.advancedTexture.addControl(button);
      this.gameTypeButtons.push(button);
    });
  }

  public showPlayerSelector(onPlayerSelected: (playerCount: string) => void) {
    const playersKeys = [PlayerMode.ONE_PLAYER, PlayerMode.TWO_PLAYER];
    this.playerSelectorButtons = [];

    playersKeys.forEach((mode, idx) => {
      const label = t(`game.player${idx + 1}`);
      const button = Button.CreateSimpleButton(mode + "Button", label);
      this.setButtonStyle(button, idx, playersKeys.length);

      button.onPointerUpObservable.add(() => {
        onPlayerSelected(mode);
        this.hideButtons(this.playerSelectorButtons);
      });

      this.advancedTexture.addControl(button);
      this.playerSelectorButtons.push(button);
    });
  }

  public showRemoteMultiplayerUI(difficulty?: GameLevel) {
    // simple integration point - delegate to remotemultiplayerui
    // pass this instance so RemoteMultiplayerUI can reuse existing methods
    const remoteUI = new RemoteMultiplayerUI(this.advancedTexture, this.GUIConstants, difficulty, this);
    remoteUI.show();
  }

  public showDifficultySelector(onDifficultySelected: (difficulty: string) => void) {
    const levelKeys = [GameLevel.EASY, GameLevel.MEDIUM, GameLevel.HARD];
    this.difficultyButtons = [];

    levelKeys.forEach((level, idx) => {
      const label = t(`game.level${idx + 1}`);
      const button = Button.CreateSimpleButton(level + "Button", label);
      this.setButtonStyle(button, idx, levelKeys.length);

      button.onPointerUpObservable.add(() => {
        onDifficultySelected(level);
        this.hideButtons(this.difficultyButtons);
      });

      this.advancedTexture.addControl(button);
      this.difficultyButtons.push(button);
    });
  }

  private showTVEffectOverlay(advancedTexture: AdvancedDynamicTexture) {
    // remove previous overlay if exists
    this.hideTVEffectOverlay();

    this.tvOverlay = new Rectangle();
    this.tvOverlay.width = 1;
    this.tvOverlay.height = 1;
    this.tvOverlay.thickness = 0;
    this.tvOverlay.background = this.GUIConstants.SCENE_BACKGROUND_COLOR;
    this.tvOverlay.alpha = 0.3;
    this.tvOverlay.zIndex = 0;
    advancedTexture.addControl(this.tvOverlay);

    for (let i = 0; i < 40; i++) {
      const line = new Rectangle();
      line.width = 1;
      line.height = "2%";
      line.top = `${-50 + i * 5}%`;
      line.left = "0%";
      line.thickness = 0;
      line.background = "rgba(255,255,255,0.15)";
      line.alpha = 0.5;
      this.tvOverlay.addControl(line);
    }

    // flickering effect
    let flicker = true;
    const flickerInterval = setInterval(() => {
      if (this.tvOverlay) this.tvOverlay.alpha = flicker ? 0.3 : 0.4;
      flicker = !flicker;
    }, 80);

    (this.tvOverlay as any)._flickerInterval = flickerInterval;
  }

  private hideTVEffectOverlay() {
    if (this.tvOverlay) {
      this.tvOverlay.isVisible = false;
      clearInterval((this.tvOverlay as any)._flickerInterval);
    }
  }

  public showCountdown(seconds: number, onDone: () => void) {
    this.clearGUI();
    this.fadeBackground(0.5);
    this.showTVEffectOverlay(this.advancedTexture);

    this.countdownText = new TextBlock();
    this.countdownText.text = seconds.toString();
    this.countdownText.color = this.GUIConstants.COUNTDOWN_FONT_COLOR;
    this.countdownText.fontSize = this.GUIConstants.COUNTDOWN_FONT_SIZE * state.scaleFactor.scaleY + 'px';
    this.countdownText.fontWeight = this.GUIConstants.COUNTDOWN_FONT_WEIGHT;
    this.countdownText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.countdownText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    this.advancedTexture.addControl(this.countdownText);

    let current = seconds;
    const blink = () => {
      this.countdownText.scaleX = 1;
      this.countdownText.scaleY = 1;
      this.countdownText.alpha = 0.1;
      setTimeout(() => {
        this.countdownText.scaleX = 1.5;
        this.countdownText.scaleY = 1.5;
        this.countdownText.alpha = 1;
      }, 100);
    };

    blink();

    const interval = setInterval(() => {
      current--;
      if (current > -1) {
        current === 0 ?
          this.countdownText.text = "PONG!" :
          this.countdownText.text = current.toString();
        blink();
      } else {
        clearInterval(interval);
        this.hideCountdown();
        onDone();
      }
    }, 1000);
  }

  private hideCountdown() {
    if (this.countdownText) {
      this.advancedTexture.removeControl(this.countdownText);
      this.countdownText = null;
      this.hideTVEffectOverlay();

      if (this.fadeOverlay) {
        this.advancedTexture.removeControl(this.fadeOverlay);
        this.fadeOverlay = null;
      }
    }
  }

  private fadeBackground(startAlpha: number, duration = 500) {
    // remove previous overlay if exists
    this.clearOverlay();

    const overlay = new Rectangle();
    overlay.width = 1;
    overlay.height = 1;
    overlay.background = this.GUIConstants.SCENE_BACKGROUND_COLOR;
    overlay.thickness = 0;
    overlay.alpha = startAlpha;
    overlay.zIndex = 0;
    this.advancedTexture.addControl(overlay);
    this.fadeOverlay = overlay;

    const steps = 20;
    const stepTime = duration / steps;
    let alpha = startAlpha;

    const fade = () => {
      for (let i = 0; i < steps; i++) {
        setTimeout(() => {
          overlay.alpha = Math.max(0, Math.min(1, alpha));
        }, i * stepTime);
      }
    };

    fade();
  }

  public showScoreBoard(score: { [GameScore.LEFT]: number, [GameScore.RIGHT]: number }, onDone?: () => void) {
    const positions = {
      [GameScore.LEFT]: this.GUIConstants.SCORE_MARGIN_LEFT,
      [GameScore.RIGHT]: this.GUIConstants.SCORE_MARGIN_RIGHT,
    };

    Object.entries(score).forEach(([key, value], index) => {
      const scoreText = new TextBlock();
      scoreText.text = `${value}`;
      scoreText.color = this.GUIConstants.SCORE_FONT_COLOR;
      scoreText.fontSize = this.GUIConstants.SCORE_FONT_SIZE * state.scaleFactor.scaleY + 'px';
      scoreText.fontWeight = this.GUIConstants.SCORE_FONT_WEIGHT;
      scoreText.left = positions[key as GameScore];
      scoreText.top = this.GUIConstants.SCORE_MARGIN_TOP;
      scoreText.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;

      this.scoreBoard.push(scoreText);
      this.advancedTexture.addControl(this.scoreBoard[index]);
    });
  }

  public showGameOver(winnerName: string, score: { LEFT: number; RIGHT: number }) {
    this.clearGUI();
    this.fadeBackground(0.5);
    this.showTVEffectOverlay(this.advancedTexture);

    this.gameOverText = new TextBlock();
    this.gameOverText.text = "GAME OVER";
    this.gameOverText.color = this.GUIConstants.COUNTDOWN_FONT_COLOR;
    this.gameOverText.fontSize = this.GUIConstants.COUNTDOWN_FONT_SIZE * state.scaleFactor.scaleY + 'px';
    this.gameOverText.fontWeight = this.GUIConstants.COUNTDOWN_FONT_WEIGHT;
    this.gameOverText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.gameOverText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    this.advancedTexture.addControl(this.gameOverText);
  }

  private clearOverlay() {
    if (this.fadeOverlay) {
      this.advancedTexture.removeControl(this.fadeOverlay);
      this.fadeOverlay = null;
    }
    this.hideTVEffectOverlay();
  }

  public clearGUI() {
    if (this.advancedTexture && this.advancedTexture.rootContainer && this.advancedTexture.rootContainer.children) {
      // TODO STUDY: copy the array because it will change as we remove controls
      const controls = this.advancedTexture.rootContainer.children.slice();
      controls.forEach((ctrl: any) => {
        this.advancedTexture.removeControl(ctrl);
      });
    }
    this.startButton = null;
    this.difficultyButtons = [];
    this.countdownText = null;
    this.scoreBoard = [];
    this.playerSelectorButtons = [];
    this.gameOverText = null;

    this.clearOverlay();
  }

  hideAllGUI() {
    // Hide all GUI elements for multiplayer mode
    this.clearGUI();
    console.log('🎮 All GUI elements hidden for multiplayer mode');
  }
}
