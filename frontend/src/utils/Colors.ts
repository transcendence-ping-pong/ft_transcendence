import { Color4 } from "@babylonjs/core";

export function hexToColor4(hex: string, alpha: number = 1) {
  const hexValue = parseInt(hex.replace("#", ""), 16);
  const r = ((hexValue >> 16) & 255) / 255;
  const g = ((hexValue >> 8) & 255) / 255;
  const b = (hexValue & 255) / 255;
  return new Color4(r, g, b, alpha);
}
