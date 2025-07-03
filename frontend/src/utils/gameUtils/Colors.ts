import { Scene, Layer, DynamicTexture } from "@babylonjs/core";

export const ColorModes = {
  LIGHT: {
    background: "#fcf4c5",
    primary: "#3a86ff",
    accent: "#ffe066"
  },
  DARK: {
    background: "#22223b",
    primary: "#3a86ff",
    accent: "#fcf4c5"
  },
  GREEN: {
    background: "#e0f7e9",
    primary: "#2ecc40",
    accent: "#b2f7c1"
  }
};

export function createRadialGradientBackground(scene: Scene) {
  // Create a fullscreen background layer
  const background = new Layer("background", null, scene, true);

  // Create a dynamic texture for the gradient
  const textureSize = 1024;
  const dynamicTexture = new DynamicTexture("gradientTexture", { width: textureSize, height: textureSize }, scene, false);
  background.texture = dynamicTexture;

  const ctx = dynamicTexture.getContext();
  // Create a radial gradient from center outwards
  const centerX = textureSize / 2;
  const centerY = textureSize / 2;
  const radius = textureSize / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

  // Set your colors here
  gradient.addColorStop(0, "#1f0f5c"); // purple default
  // gradient.addColorStop(0, "#08021a"); // dark purple
  gradient.addColorStop(1, "#1a2233"); // bluish default

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, textureSize, textureSize);

  dynamicTexture.update();
}