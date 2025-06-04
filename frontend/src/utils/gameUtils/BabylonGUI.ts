declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: Scene and Engine types? how to import them?
// TODO: not having a bundler is really annoying, check if we can use Vite??
// Vite: hot module replacement, instant server start, etc.

// read more here: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D/
export class BabylonGUI {
  private advancedTexture: any;
  private startButton: any;
  private difficultyButtons: any[] = [];
  private countdownText: any;

  constructor(scene: any) {
    this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    this.advancedTexture.background = "#000000cc"; // semi-transparent black
  }

  showStartButton(onStart: () => void) {
    this.clearGUI();

    this.startButton = BABYLON.GUI.Button.CreateSimpleButton("startButton", "START GAME");
    this.startButton.width = "400px";
    this.startButton.height = "200px";
    this.startButton.fontSize = 48;
    this.startButton.color = "#fff";
    this.startButton.background = "#1a2233";
    this.startButton.thickness = 4;
    this.startButton.cornerRadius = 20;
    this.startButton.fontWeight = "bold";
    this.startButton.borderColor = "#fff";
    this.startButton.shadowOffsetX = 2;
    this.startButton.shadowOffsetY = 2;
    this.startButton.shadowColor = "#000";
    this.startButton.shadowBlur = 8;
    this.startButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.startButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

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

  showDifficultySelector(onDifficultySelected: (difficulty: string) => void) {
    this.clearGUI();

    const levels = ["EASY", "MEDIUM", "HARD"];
    this.difficultyButtons = [];

    levels.forEach((level, idx) => {
      const button = BABYLON.GUI.Button.CreateSimpleButton(level + "Button", level);
      button.width = "400px";
      button.height = "150px";
      button.fontSize = 42;
      button.color = "#fff";
      button.background = "#1a2233";
      button.thickness = 4;
      button.cornerRadius = 20;
      button.fontWeight = "bold";
      button.borderColor = "#fff";
      button.shadowOffsetX = 2;
      button.shadowOffsetY = 2;
      button.shadowColor = "#000";
      button.shadowBlur = 8;
      button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
      button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      button.top = (idx - 1) * 200; // 160px vertical spacing (centered, above, below)

      button.onPointerUpObservable.add(() => {
        onDifficultySelected(level);
        this.hideDifficultySelector();
      });

      this.advancedTexture.addControl(button);
      this.difficultyButtons.push(button);
    });
  }

  hideDifficultySelector() {
    this.difficultyButtons.forEach(btn => this.advancedTexture.removeControl(btn));
    this.difficultyButtons = [];
  }

  showCountdown(seconds: number, onDone: () => void) {
    this.clearGUI();

    this.countdownText = new BABYLON.GUI.TextBlock();
    this.countdownText.text = seconds.toString();
    this.countdownText.color = "#fff";
    this.countdownText.fontSize = 250;
    this.countdownText.fontWeight = "bold";
    this.countdownText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.countdownText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

    this.advancedTexture.addControl(this.countdownText);

    let current = seconds;
    const interval = setInterval(() => {
      current--;
      if (current > 0) {
        this.countdownText.text = current.toString();
      } else {
        clearInterval(interval);
        this.hideCountdown();
        this.fadeOutBackground();
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

  fadeOutBackground(duration = 500) {
    let alpha = 0.8; // starting alpha (for 80% opacity)
    const steps = 20;
    const stepTime = duration / steps;
    const stepAlpha = alpha / steps;

    const fade = () => {
      alpha -= stepAlpha;
      if (alpha <= 0) {
        this.advancedTexture.background = "transparent";
      } else {
        this.advancedTexture.background = `rgba(0,0,0,${alpha})`;
        setTimeout(fade, stepTime);
      }
    };
    fade();
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
  }
}
