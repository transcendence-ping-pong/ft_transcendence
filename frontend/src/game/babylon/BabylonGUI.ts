import { t } from '@/locales/Translations.js';
import { GameLevel, GameScore, PlayerMode, getGUIConstants } from '@/utils/gameUtils/GameConstants.js';
import { AdvancedDynamicTexture, Button, Control, TextBlock, Rectangle } from "@babylonjs/gui";
import { state } from '@/state';

// TODO: centralize constants for button styles, colors, etc.

// read more here: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D/
export class BabylonGUI {
  private advancedTexture: AdvancedDynamicTexture;
  private startButton: Button | null = null;
  private difficultyButtons: Button[] = [];
  private playerSelectorButtons: Button[] = [];
  private tvOverlay: Rectangle | null = null;
  private countdownText: TextBlock | null = null;
  private scoreBoard: TextBlock[] = [];
  private gameOverText: TextBlock | null = null;
  private GUIConstants = getGUIConstants();

  constructor(scene: any) {
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
  }

  setButtonStyle(button: Button, idx: number, arrayLength: number) {
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
  }

  hideButtons(arrayButtons: Button[]) {
    arrayButtons.forEach(btn => this.advancedTexture.removeControl(btn));
    arrayButtons = [];
  }

  showStartButton(onStart: () => void) {
    this.clearGUI();

    this.startButton = Button.CreateSimpleButton("startButton", t("game.start"));
    this.setButtonStyle(this.startButton, 0, 1); // only one button, so idx = 0, arrayLength = 1

    this.startButton.onPointerUpObservable.add(() => {
      onStart();
      this.hideButtons([this.startButton]);
    });

    this.advancedTexture.addControl(this.startButton);
  }

  showPlayerSelector(onPlayerSelected: (playerCount: string) => void) {
    this.clearGUI();

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

  showDifficultySelector(onDifficultySelected: (difficulty: string) => void) {
    this.clearGUI();

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

  showTVEffectOverlay(advancedTexture: AdvancedDynamicTexture) {
    if (!this.tvOverlay) {
      this.tvOverlay = new Rectangle();
      this.tvOverlay.width = 1;
      this.tvOverlay.height = 1;
      this.tvOverlay.thickness = 0;
      this.tvOverlay.background = this.GUIConstants.SCENE_BACKGROUND_COLOR;
      this.tvOverlay.alpha = 0.3;
      this.tvOverlay.zIndex = 0;
      advancedTexture.addControl(this.tvOverlay);

      // add scanlines effect when starting/finishing the game
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
    } else {
      this.tvOverlay.isVisible = true;
    }

    // flickering effect
    let flicker = true;
    const flickerInterval = setInterval(() => {
      if (this.tvOverlay) this.tvOverlay.alpha = flicker ? 0.3 : 0.4;
      flicker = !flicker;
    }, 80);

    (this.tvOverlay as any)._flickerInterval = flickerInterval;
  }

  hideTVEffectOverlay() {
    if (this.tvOverlay) {
      this.tvOverlay.isVisible = false;
      clearInterval((this.tvOverlay as any)._flickerInterval);
    }
  }

  showCountdown(seconds: number, onDone: () => void) {
    this.clearGUI();
    this.fadeBackground(0, 0.4);
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

  hideCountdown() {
    if (this.countdownText) {
      this.advancedTexture.removeControl(this.countdownText);
      this.countdownText = null;
      this.hideTVEffectOverlay();
      this.fadeBackground(0.4, 0);
    }
  }

  fadeBackground(startAlpha: number, endAlpha: number, duration = 500) {
    const overlay = new Rectangle();
    overlay.width = 1;
    overlay.height = 1;
    overlay.background = this.GUIConstants.SCENE_BACKGROUND_COLOR;
    overlay.thickness = 0;
    overlay.alpha = startAlpha;
    overlay.zIndex = 0;
    this.advancedTexture.addControl(overlay);

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

  showScoreBoard(score: { [GameScore.LEFT]: number, [GameScore.RIGHT]: number }, onDone?: () => void) {
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

  showGameOver(winnerName: string, score: { LEFT: number; RIGHT: number }) {
    this.clearGUI();
    this.fadeBackground(0, 0.8);

    const resultText = `🏆 ${winnerName} venceu!\nPlacar final: ${score.LEFT} x ${score.RIGHT}`;

    this.gameOverText = new TextBlock();
    this.gameOverText.text = resultText;
    this.gameOverText.color = this.GUIConstants.COUNTDOWN_FONT_COLOR;
    this.gameOverText.fontSize = this.GUIConstants.COUNTDOWN_FONT_SIZE * state.scaleFactor.scaleY + 'px';
    this.gameOverText.fontWeight = this.GUIConstants.COUNTDOWN_FONT_WEIGHT;
    this.gameOverText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.gameOverText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    this.advancedTexture.addControl(this.gameOverText);
  }

  clearGUI() {
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
  }
}
