import { t } from '@/locales/Translations.js';
import { GameLevel, GameScore, PlayerMode, getGUIConstants, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/utils/gameUtils/Constants.js';
import { AdvancedDynamicTexture, Button, Control, TextBlock } from "@babylonjs/gui";
import { state } from '@/state';
import { ScaleBlock } from '@babylonjs/core';

// TODO: centralize constants for button styles, colors, etc.

// read more here: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D/
export class BabylonGUI {
  private advancedTexture: AdvancedDynamicTexture;
  private startButton: Button | null = null;
  private difficultyButtons: Button[] = [];
  private playerSelectorButtons: Button[] = [];
  private countdownText: TextBlock | null = null;
  private scoreBoard: TextBlock[] = [];
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

  hideSelectorButtons(arrayButtons: Button[]) {
    arrayButtons.forEach(btn => this.advancedTexture.removeControl(btn));
    arrayButtons = [];
  }

  showStartButton(onStart: () => void) {
    this.clearGUI();

    this.startButton = Button.CreateSimpleButton("startButton", t("game.start"));
    this.setButtonStyle(this.startButton, 0, 1); // only one button, so idx = 0, arrayLength = 1

    this.startButton.onPointerUpObservable.add(() => {
      onStart();
      this.hideStartButton();
    });

    this.advancedTexture.addControl(this.startButton);
  }

  hideStartButton() {
    if (this.startButton) {
      this.advancedTexture.removeControl(this.startButton);
      this.startButton = null;
    }
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
        this.hideSelectorButtons(this.playerSelectorButtons);
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
        this.hideSelectorButtons(this.difficultyButtons);
      });

      this.advancedTexture.addControl(button);
      this.difficultyButtons.push(button);
    });
  }

  showCountdown(seconds: number, onDone: () => void) {
    this.clearGUI();
    this.advancedTexture.background = `${this.GUIConstants.SCENE_BACKGROUND_COLOR}cc`; // 'cc' = ~80% opacity

    this.countdownText = new TextBlock();
    this.countdownText.text = seconds.toString();
    this.countdownText.color = this.GUIConstants.COUNTDOWN_FONT_COLOR;
    this.countdownText.fontSize = this.GUIConstants.COUNTDOWN_FONT_SIZE * state.scaleFactor.scaleY + 'px';
    this.countdownText.fontWeight = this.GUIConstants.COUNTDOWN_FONT_WEIGHT;
    this.countdownText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.countdownText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    this.advancedTexture.addControl(this.countdownText);

    let current = seconds;
    const interval = setInterval(() => {
      current--;
      if (current > 0) {
        this.countdownText.text = current.toString();
      } else {
        clearInterval(interval);
        this.hideCountdown();
        this.fadeBackground(0.8, 0);
        onDone();
      }
    }, 1000);
  }

  hideCountdown() {
    if (this.countdownText) {
      this.advancedTexture.removeControl(this.countdownText);
      this.countdownText = null;
    }
  }

  fadeBackground(startAlpha: number, endAlpha: number, duration = 500) {
    const steps = 20;
    const stepTime = duration / steps;
    const stepAlpha = (endAlpha - startAlpha) / steps;
    let alpha = startAlpha;

    const fade = () => {
      this.advancedTexture.background = `rgba(0,0,0,${alpha})`;
      if ((stepAlpha > 0 && alpha < endAlpha) || (stepAlpha < 0 && alpha > endAlpha)) {
        alpha += stepAlpha;
        setTimeout(fade, stepTime);
      } else {
        this.advancedTexture.background = `rgba(0,0,0,${endAlpha})`;
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
      // scoreText.color = "rgba(255,255,255,0.15)"; // semi-transparent white text
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

  showGameOver(score: { [GameScore.LEFT]: number, [GameScore.RIGHT]: number }, onRestart: () => void) {
    this.clearGUI();
    // this.fadeBackground(0, 0.8);
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
  }
}
