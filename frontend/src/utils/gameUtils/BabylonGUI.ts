declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: Scene and Engine types? how to import them?
// TODO: not having a bundler is really annoying, check if we can use Vite??
// Vite: hot module replacement, instant server start, etc.

export function addRetroStartButton(onClick?: () => void) {
  const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const button = BABYLON.GUI.Button.CreateSimpleButton("startButton", "START GAME");

  button.width = "400px";
  button.height = "200px";
  button.fontSize = 48;
  button.color = "#fff";
  // button.color = "#fccc6d"; // text color
  button.background = "#1a2233";
  button.thickness = 4;
  button.cornerRadius = 20;
  button.paddingTop = "20px";
  button.paddingBottom = "20px";
  button.paddingLeft = "40px";
  button.paddingRight = "40px";
  button.fontWeight = "bold"; // TODO FIX: may not work in all browsers
  button.borderColor = "#fff";

  // shadow
  button.shadowOffsetX = 2;
  button.shadowOffsetY = 2;
  button.shadowColor = "#000";
  button.shadowBlur = 8;

  button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  advancedTexture.addControl(button);

  if (onClick) {
    button.onPointerUpObservable.add(onClick);
  }

  advancedTexture.addControl(button);
  return button;
}
