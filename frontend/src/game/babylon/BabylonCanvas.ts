import { GameCanvas } from '@/game/GameCanvas.js';
import { MultiplayerGameCanvas } from '@/game/MultiplayerGameCanvas.js';
import { crtFragmentShader } from '@/utils/gameUtils/CrtFragmentShader.js';
import { GameLevel, PlayerMode, VIRTUAL_BORDER_TOP, VIRTUAL_BORDER_X, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_BORDER_BOTTOM } from '@/utils/gameUtils/GameConstants.js';
import { getThemeColors, ThemeColors } from '@/utils/gameUtils/BabylonColors.js';
import * as BABYLON from "@babylonjs/core";
import { Engine, Scene, Color3, StandardMaterial } from "@babylonjs/core";
import { importMeshAsync } from "@/utils/gameUtils/Mesh.js";
import { createSparkleEffect, createSpinAnimation } from "@/utils/gameUtils/Animations.js";
import { state } from '@/state.js';

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
  private gameCanvas: GameCanvas | MultiplayerGameCanvas;
  private engine: Engine;
  private scene: Scene;
  private dynamicTexture?: any;
  private lastTimestamp: number = performance.now(); // used to calculate deltaTime

  constructor(containerId: string) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'babylon-render-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    document.getElementById(containerId)?.appendChild(this.canvas);

    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = this.createScene();

    this.canvas.width = state.scaleFactor.gameAreaWidth;
    this.canvas.height = state.scaleFactor.gameAreaHeight;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${state.scaleFactor.gameAreaLeft}px`;
    this.canvas.style.top = `${state.scaleFactor.gameAreaTop}px`;
    this.canvas.style.width = `${state.scaleFactor.gameAreaWidth}px`;
    this.canvas.style.height = `${state.scaleFactor.gameAreaHeight}px`;

    // when browser window is resized, resize the canvas and engine
    window.addEventListener('resize', () => this.engine.resize());
  }

  createScene(): Scene {
    const scene = new BABYLON.Scene(this.engine);

    // TODO: centralize color management
    this.createRadialGradientBackground(this.scene);

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

  get plane() {
    return this.scene.getMeshByName("gameScreen");
  }

  get transparentMaterial() {
    const mat = new StandardMaterial("screenMat", this.scene);
    mat.alpha = 0; // fully transparent at the start
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    return mat;
  }

  initPlaneMaterial() {
    this.plane.material = this.transparentMaterial;
  }

  public createGameCanvas(level: GameLevel, mode: PlayerMode) {
    this.gameCanvas = new GameCanvas(level, "", this.canvas.width, this.canvas.height);
    this.gameCanvas.setLevel(level);
    this.applyDynamicTextureToMesh("gameScreen", this.gameCanvas.getCanvasElement());
  }

  public createMultiplayerGameCanvas() {
    		// Creating multiplayer game canvas
    try {
      // Create with explicit level to avoid Ball constructor error
      const level = GameLevel.MEDIUM; // Use valid GameLevel enum value
      this.gameCanvas = new MultiplayerGameCanvas(level, "", this.canvas.width, this.canvas.height);
      
      // Ensure level is set properly
      this.gameCanvas.setLevel(level);
      
      this.applyDynamicTextureToMesh("gameScreen", this.gameCanvas.getCanvasElement());
      		// Multiplayer game canvas created successfully
    } catch (error) {
      console.error('❌ Error creating multiplayer canvas:', error);
      // Fallback: create a simple canvas without the game objects
      this.createFallbackCanvas();
    }
  }

  private createFallbackCanvas() {
    		// Creating fallback canvas
    // Create a simple canvas that just shows "Multiplayer Game"
    const canvas = document.createElement('canvas');
    canvas.width = this.canvas.width;
    canvas.height = this.canvas.height;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Multiplayer Game Active', canvas.width / 2, canvas.height / 2);
    }
    
    this.applyDynamicTextureToMesh("gameScreen", canvas);
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

  private createRadialGradientBackground(scene: BABYLON.Scene) {
    const colors = getThemeColors(state.theme) as ThemeColors;
    // Create a fullscreen background layer
    const background = new BABYLON.Layer("background", null, scene, true);

    // Create a dynamic texture for the gradient
    const textureSize = 1024;
    const dynamicTexture = new BABYLON.DynamicTexture("gradientTexture", { width: textureSize, height: textureSize }, scene, false);
    background.texture = dynamicTexture;

    const ctx = dynamicTexture.getContext();
    // Create a radial gradient from center outwards
    const centerX = textureSize / 2;
    const centerY = textureSize / 2;
    const radius = textureSize / 2;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

    // set colors
    gradient.addColorStop(0, colors.gameGradientStart);
    gradient.addColorStop(1, colors.gameGradientEnd);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureSize, textureSize);

    dynamicTexture.update();
  }

  private createGlowRampBehindModel(mesh: BABYLON.Mesh, scene: BABYLON.Scene) {
    const boundingInfo = mesh.getBoundingInfo();
    const center = boundingInfo.boundingBox.centerWorld;
    const radius = boundingInfo.boundingBox.extendSizeWorld.length() * 1.3;

    // Create a plane slightly behind the model
    const glowPlane = BABYLON.MeshBuilder.CreatePlane("glowPlane", { size: radius * 2 }, scene);
    glowPlane.position = center.clone();
    glowPlane.position.z -= radius * 0.5; // Move behind the model
    // glowPlane.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);

    // Use the correct texture URL
    const textureUrl = "https://playground.babylonjs.com/textures/WhiteTransarentRamp.png";
    const glowMat = new BABYLON.StandardMaterial("glowMat", scene);
    glowMat.diffuseTexture = new BABYLON.Texture(textureUrl, scene);
    glowMat.diffuseTexture.hasAlpha = true;
    glowMat.useAlphaFromDiffuseTexture = true;
    glowMat.emissiveColor = BABYLON.Color3.FromHexString("#fcf4c5");
    glowMat.alpha = 0.2;
    glowMat.backFaceCulling = false;
    glowMat.disableDepthWrite = true; // <-- This ensures the model always draws over the plane
    glowPlane.material = glowMat;

    glowPlane.isPickable = false;
    glowPlane.receiveShadows = false;

    // Render the plane before the model
    glowPlane.renderingGroupId = 0;
    mesh.renderingGroupId = 1;
  }

  public async endingGame() {
    // hide the plane where dynamic texture is applied
    const plane = this.scene.getMeshByName("gameScreen");
    if (plane) plane.dispose();

    // this.createRadialGradientBackground(this.scene);

    // const models = await importMeshAsync("", "./assets/models/", "rubber_duck_toy_2k.glb", this.scene);
    // // const models = await importMeshAsync("", "./assets/models/", "all_purpose_cleaner_2k.glb", this.scene);
    // // const models = await importMeshAsync("", "./assets/models/", "garden_gnome_2k.glb", this.scene);
    // this.model = models.meshes[1];
    // this.model.rotationQuaternion = null;

    // // GREEN LIGHT ?

    // const center = this.model.getBoundingInfo().boundingBox.center;
    // const centerWorld = this.model.getBoundingInfo().boundingBox.centerWorld;
    // this.model.position = new BABYLON.Vector3(
    //   this.model.position.x - center.x * 2,
    //   this.model.position.y - center.y * 2,
    //   this.model.position.z - center.z * 2
    // );
    // this.model.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);

    // createSparkleEffect(this.model, this.scene);
    // this.createGlowRampBehindModel(this.model, this.scene);
    // createSpinAnimation(this.model, this.scene);
  }

  // public async endingGame() {
  //   // hide the plane where dynamic texture is applied
  //   const plane = this.scene.getMeshByName("gameScreen");
  //   if (plane) plane.dispose();

  //   this.createRadialGradientBackground(this.scene);

  //   // const models = await importMeshAsync("", "./assets/models/", "plastic_monobloc_chair_01_2k.glb", this.scene);
  //   // const models = await importMeshAsync("", "./assets/models/", "yellow_onion_2k.glb", this.scene);
  //   const models = await importMeshAsync("", "./assets/models/", "all_purpose_cleaner_2k.glb", this.scene);
  //   // const models = await importMeshAsync("", "./assets/models/", "rubber_duck_toy_2k.glb", this.scene);
  //   // const models = await importMeshAsync("", "./assets/models/", "garden_gnome_2k.glb", this.scene);
  //   this.model = models.meshes[1];
  //   console.log("Rubber duck model loaded:", this.model.name, this.model);
  //   this.model.rotationQuaternion = null; // remove quaternion to use euler angles

  //   const center = this.model.getBoundingInfo().boundingBox.center;

  //   // TODO: set a constant to camera position
  //   this.model.position = new BABYLON.Vector3(
  //     this.model.position.x - center.x * 2,
  //     this.model.position.y - center.y * 2,
  //     this.model.position.z - center.z * 2
  //   );

  //   // this.model.rotation.x = Math.PI / 30; // tilt downward??
  //   // this.model.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);
  //   this.model.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);
  //   // this.model.scaling = new BABYLON.Vector3(5, 5, 5);

  //   createSpinAnimation(this.model, this.scene);
  // }

  public getGameCanvas() {
    return this.gameCanvas;
  }

  public getScene() {
    return this.scene;
  }

  public cleanupGame() {
    if (this.engine) {
      this.engine.stopRenderLoop();
      this.engine.dispose();
      this.engine = null;
      this.gameCanvas = null;
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }

    window.removeEventListener('resize', () => this.engine?.resize());
  }
}
