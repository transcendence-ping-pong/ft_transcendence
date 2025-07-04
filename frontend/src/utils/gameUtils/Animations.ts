import { Animation, Vector3, Mesh, Scene, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

export function createSparkleEffect(mesh: Mesh, scene: Scene) {
  const particleSystem = new ParticleSystem("sparkles", 200, scene);

  // use a sparkle texture (star/flare) from Babylon.js playground (The Texture Library)
  particleSystem.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", scene);

  // emit from a sphere around the mesh center
  const boundingInfo = mesh.getBoundingInfo();
  const center = boundingInfo.boundingBox.centerWorld;
  const radius = boundingInfo.boundingBox.extendSizeWorld.length() * 0.7;

  particleSystem.emitter = center;
  particleSystem.minEmitBox = new Vector3(0, 0, 0);
  particleSystem.maxEmitBox = new Vector3(0, 0, 0);

  // sparkle colors (glowing white/yellow)
  particleSystem.color1 = new Color4(1, 1, 0.8, 1);
  particleSystem.color2 = new Color4(1, 1, 1, 1);
  particleSystem.colorDead = new Color4(1, 1, 1, 0);

  particleSystem.minSize = 0.08 * radius;
  particleSystem.maxSize = 0.18 * radius;

  particleSystem.minLifeTime = 0.4;
  particleSystem.maxLifeTime = 0.8;

  particleSystem.emitRate = 40;
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD; // makes sparkles glow(?)

  particleSystem.gravity = new Vector3(0, 0, 0);

  // emit in all directions outward
  particleSystem.direction1 = new Vector3(-1, -1, -1);
  particleSystem.direction2 = new Vector3(1, 1, 1);

  particleSystem.minAngularSpeed = 0;
  particleSystem.maxAngularSpeed = Math.PI;

  particleSystem.minEmitPower = 1.5;
  particleSystem.maxEmitPower = 3.5;
  particleSystem.updateSpeed = 0.02;

  particleSystem.start();
}

export function createSpinAnimation(mesh: Mesh, scene: Scene, duration: number = 5): void {
  const fps = 60;
  const endOfAnimation = duration * fps; // e.g. default is 5 seconds at 60 FPS
  const rotateAnim = new Animation(
    "duckRotate",
    "rotation.y",
    fps,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );
  const rotateFrames = [
    { frame: 0, value: 0 },
    { frame: endOfAnimation, value: 2 * Math.PI }
  ];
  rotateAnim.setKeys(rotateFrames);
  // mesh.animations = [rotateAnim];
  mesh.animations.push(rotateAnim); // if mesh already has animations, push the new one
  scene.beginAnimation(mesh, 0, endOfAnimation, true);
}