import { GameCanvas } from './GameCanvas.js';
import { crtFragmentShader } from '../utils/gameUtils/CrtFragmentShader.js';

declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: Scene and Engine types? how to import them?
// TODO: not having a bundler is really annoying, check if we can use Vite??
// Vite: hot module replacement, instant server start, etc.

/*
  BabylonCanvas responsabilities:
  - initialize and manage the Babylon.js scene and engine
  - create the 3D scene with camera, lights, and meshes
  - apply dynamic textures to meshes (i.e. 2D game canvas)
  - provide hooks for starting/stopping the render loop
  - delegate all 2D game logic to GameCanvas
  - delegate all GUI logic to BabylonGUI

  Do not:
  - handle game logic, GUI logic, or user input directly
*/

// Example ground and applying a PBR material/ Standard material is similar
// const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
// ground.material = createPBRMaterial(scene, PBRMaterialLibrary.asphalt, { invertNormalMap: true });
export class BabylonCanvas {
  private canvas: HTMLCanvasElement;
  private gameCanvas: GameCanvas;
  private engine: any; // TODO TYPE: BABYLON.Engine type
  private scene: any; // TODO TYPE: BABYLON.Scene type
  private dynamicTexture?: any;

  constructor(containerId: string) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'babylon-render-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    document.getElementById(containerId)?.appendChild(this.canvas);

    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = this.createScene();

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gameCanvas = new GameCanvas("", this.canvas.width, this.canvas.height);

    this.applyDynamicTextureToMesh("gameScreen", this.gameCanvas.getCanvasElement());
    window.addEventListener('resize', () => this.engine.resize());
  }

  // TODO TYPE: should return type BABYLON.Scene
  createScene(): any {
    const scene = new BABYLON.Scene(this.engine);
    this.scene = scene;

    // lock camera at origin, looking forward
    // Vector3(0, 1, -5) -> x, y, z coordinates, position
    const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 1, -5), scene);
    camera.position = new BABYLON.Vector3(0, 0, -1.4);
    camera.setTarget(new BABYLON.Vector3(0, 0, 1));
    camera.attachControl(this.canvas, false); // "false" disables user controls, otherwise true
    camera.detachControl(); // prevents camera from being controlled by user

    // TODO: hemispheric light or environment light?
    // BABYLON.MeshBuilder.CreateBox('box', {}, this.scene);
    // standard materials dont use environment texture as a light source...
    // Vector3(0, 1, 0) -> x, y, z coordinates, direction of the light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    const aspect = this.canvas.width / this.canvas.height;
    const planeHeight = 2;
    const planeWidth = planeHeight * aspect;
    const plane = BABYLON.MeshBuilder.CreatePlane("gameScreen", { width: planeWidth, height: planeHeight }, this.scene);
    plane.position = new BABYLON.Vector3(0, 0, 1); // put plane in front of the camera

    BABYLON.Effect.ShadersStore["crtFragmentShader"] = crtFragmentShader;

    var postProcess = new BABYLON.PostProcess("CRTShaderPostProcess", "crt", ["curvature", "screenResolution", "scanLineOpacity", "vignetteOpacity", "brightness", "vignetteRoundness"], null, 0.25, camera);
    postProcess.onApply = function (effect) {
      effect.setFloat2("curvature", 4.5, 4.5); // by default was 3.0, 3.0
      effect.setFloat2("screenResolution", 240, 160);
      effect.setFloat2("scanLineOpacity", 1, 1);
      effect.setFloat("vignetteOpacity", 1);
      effect.setFloat("brightness", 4);
      effect.setFloat("vignetteRoundness", 2.0)
    };

    return scene;
  }

  // constantly update the scene, i.e. animations
  // SINGLE ANIMATION LOOP: in Babylon render loop, call a method to update the 2D game too
  // avoid two separate requestAnimationFrame running at the same time
  public startRenderLoop() {
    this.engine.runRenderLoop(() => {
      if (this.gameCanvas) {
        this.gameCanvas.render2DGameCanvas();
      }
      if (this.dynamicTexture && this.gameCanvas) {
        this.dynamicTexture.getContext().drawImage(this.gameCanvas.getCanvasElement(), 0, 0);
        this.dynamicTexture.update();
      }
      this.scene.render();
    });
  }

  // apply a dynamic texture to a mesh (e.g., TV screen or plane)
  // dynamic texture = the game itself
  applyDynamicTextureToMesh(meshName: string, sourceCanvas: HTMLCanvasElement) {
    const mesh = this.scene.getMeshByName(meshName);
    if (!mesh) {
      console.warn(`Mesh "${meshName}" not found for dynamic texture.`);
      return;
    }
    this.dynamicTexture = new BABYLON.DynamicTexture(
      "dynamicGameTexture",
      { width: sourceCanvas.width, height: sourceCanvas.height },
      this.scene,
      false
    );
    this.dynamicTexture.getContext().drawImage(sourceCanvas, 0, 0);
    this.dynamicTexture.update();

    const mat = new BABYLON.StandardMaterial("screenMat", this.scene);
    mat.emissiveTexture = this.dynamicTexture;
    mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    mesh.material = mat;

    const glowLayer = new BABYLON.GlowLayer("glow", this.scene);
    glowLayer.intensity = 1; // TODO FIX: is it making any difference?
  }

  public getGameCanvas() {
    return this.gameCanvas;
  }

  public getScene() {
    return this.scene;
  }

  public cleanupGame() {
    if (this.engine) {
      // requestAnimationFrame is cleaned under the hood
      this.engine.stopRenderLoop();
    }

    // remove html element?

    window.removeEventListener('resize', () => this.engine.resize());
  }
}
