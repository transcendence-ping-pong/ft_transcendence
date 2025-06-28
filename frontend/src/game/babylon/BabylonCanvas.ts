import { GameCanvas } from '@/game/GameCanvas.js';
import { hexToColor4 } from '@/utils/Colors.js';
import { crtFragmentShader } from '@/utils/gameUtils/CrtFragmentShader.js';
import { GameLevel } from '@/utils/gameUtils/types.js';
import * as BABYLON from "@babylonjs/core";
import { Engine, Scene, Color3, StandardMaterial } from "@babylonjs/core";
import { importMeshAsync, createSpinAnimation } from "@/utils/gameUtils/Mesh.js";

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
  private engine: Engine;
  private scene: Scene;
  private dynamicTexture?: any;
  private lastTimestamp: number = performance.now(); // used to calculate deltaTime
  private model: BABYLON.Mesh | null = null;

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
    // this.gameCanvas = new GameCanvas("", this.canvas.width, this.canvas.height);

    console.log("BabylonCanvas initialized with canvas size:", this.canvas.width, this.canvas.height);

    // this.applyDynamicTextureToMesh("gameScreen", this.gameCanvas.getCanvasElement());
    window.addEventListener('resize', () => this.engine.resize());
  }

  createScene(): Scene {
    const scene = new BABYLON.Scene(this.engine);

    // TODO: centralize color management
    scene.clearColor = hexToColor4("#1a2233", 1);

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

    const mat = new StandardMaterial("screenMat", this.scene);
    mat.alpha = 0; // fully transparent at the start
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

    plane.material = mat;
    plane.position = new BABYLON.Vector3(0, 0, 1); // put plane in front of the camera

    BABYLON.Effect.ShadersStore["crtFragmentShader"] = crtFragmentShader;

    var postProcess = new BABYLON.PostProcess("CRTShaderPostProcess", "crt", ["curvature", "screenResolution", "scanLineOpacity", "vignetteOpacity", "brightness", "vignetteRoundness"], null, 0.25, camera);
    postProcess.onApply = function (effect) {
      effect.setFloat2("curvature", 4.5, 4.5); // default 3.0, 3.0
      effect.setFloat2("screenResolution", 240, 240); // default 240, 160
      effect.setFloat2("scanLineOpacity", 0.8, 0.8); // default 1, 1
      effect.setFloat("vignetteOpacity", 1);
      effect.setFloat("brightness", 4);
      effect.setFloat("vignetteRoundness", 2.0) // default 2.0
    };

    return scene;
  }

  public createGameCanvas(level: GameLevel) {
    this.gameCanvas = new GameCanvas(level, "", this.canvas.width, this.canvas.height);
    this.gameCanvas.setLevel(level);
    this.applyDynamicTextureToMesh("gameScreen", this.gameCanvas.getCanvasElement());
  }

  // constantly update the scene, i.e. animations
  // SINGLE ANIMATION LOOP: in Babylon render loop, call a method to update the 2D game too
  // avoid two separate requestAnimationFrame running at the same time
  // MAIN LOOP WILL BE CALLED BY GAME ORCHESTRATOR
  public startRenderLoop() {
    this.engine.runRenderLoop(() => {
      // calculate ellapsed time (dt) in seconds between frames
      const currentTimestamp = performance.now();
      const deltaTime = (currentTimestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = currentTimestamp;

      if (this.dynamicTexture && this.gameCanvas) {
        // render 2D game onto offscreen canvas (buffer) managed by GameCanvas
        this.gameCanvas.render2DGameCanvas(false, deltaTime);

        const texSize = this.dynamicTexture.getSize();
        const ctx = this.dynamicTexture.getContext();
        ctx.clearRect(0, 0, texSize.width, texSize.height);
        // copy offscreen canvas to dynamic texture
        // map sorce canvas to destination texture, scaling it to fit
        // drawImage(src,0,0,sw,sh,0,0,dw,dh);
        ctx.drawImage(
          this.gameCanvas.getCanvasElement(),
          0, 0, this.gameCanvas.getCanvasElement().width, this.gameCanvas.getCanvasElement().height,
          0, 0, texSize.width, texSize.height
        );
        this.dynamicTexture.update();
      }

      // if (this.model) {
      //   this.model.rotation.y += 0.01;
      // }

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
      false // do not generate mipmaps (2D canvas doesn't need them)
    );

    this.dynamicTexture.hasAlpha = true;

    // material setup
    // 2D canvas background is trasparent
    // material needs to have alpha blending
    // so background color is set by Babylon scene and...
    // there is no need of matching the plane width size perfectly with the camera view
    const mat = new StandardMaterial("screenMat", this.scene);
    mat.diffuseTexture = this.dynamicTexture;
    mat.diffuseTexture.hasAlpha = true;
    mat.emissiveTexture = this.dynamicTexture;
    mat.opacityTexture = this.dynamicTexture;
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.alpha = 1;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    mesh.material = mat;

    const glowLayer = new BABYLON.GlowLayer("glow", this.scene);
    glowLayer.intensity = 0.25;
  }

  public async endingGame() {
    // hide the plane where dynamic texture is applied
    const plane = this.scene.getMeshByName("gameScreen");
    if (plane) {
      plane.dispose();
    }

    const models = await importMeshAsync("", "./assets/models/", "rubber_duck_toy_2k.glb", this.scene);
    this.model = models.meshes[1];
    this.model.rotationQuaternion = null; // remove quaternion to use euler angles

    // TODO: set a constant to camera position
    this.model.position = new BABYLON.Vector3(0, -0.25, 0); // almost at the camera
    this.model.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);

    createSpinAnimation(this.model, this.scene);
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
      this.gameCanvas.stop();
    }

    // remove html element?

    window.removeEventListener('resize', () => this.engine.resize());
  }
}
