import { createStandardMaterial, StandardMaterialLibrary, createPBRMaterial, PBRMaterialLibrary } from '../../utils/Materials.js';
import { GameCanvas } from './GameCanvas.js'; // import GameCanvas and its element
import { crtFragmentShader } from '../../utils/CrtFragmentShader.js';

declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: Scene and Engine types? how to import them?
// TODO: not having a bundler is really annoying, check if we can use Vite??
// Vite: hot module replacement, instant server start, etc.

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

    // constantly update the scene, e.g. animations, physics
    // TODO CONCEPT: running two loops, one for Babylon.js and one for GameCanvas? STUPID STUFF
    // in Babylon render loop, call a method to update the game
    this.engine.runRenderLoop(() => {
      if (this.gameCanvas) {
        // this.gameCanvas.update(); TODO!!!!
      }
      if (this.dynamicTexture && this.gameCanvas) {
        this.dynamicTexture.getContext().drawImage(this.gameCanvas.getCanvasElement(), 0, 0);
        this.dynamicTexture.update();
      }
      this.scene.render();
    });
    window.addEventListener('resize', () => this.engine.resize());

    // INITIALIZE DOESNT MAKE A LOT OF SENSE
    // think... TODO CONCEPT: improve organisation
    this.initialize();
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

    // TODO: hemispheric light or environment light?
    // BABYLON.MeshBuilder.CreateBox('box', {}, this.scene);
    // standard materials dont use environment texture as a light source...
    // Vector3(0, 1, 0) -> x, y, z coordinates, direction of the light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

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

  async importMeshAsync(meshName: string, path: string, filename: string): Promise<any> {
    try {
      const models = await BABYLON.SceneLoader.ImportMeshAsync(
        meshName,
        path,
        filename,
        this.scene
      );

      if (!models || !models.meshes || models.meshes.length === 0) {
        throw new Error(`No meshes found in ${path}${filename} (meshName: "${meshName}")`);
      }

      // manipulate meshes after loading if needed
      // root mesh is at index 0 and can be used to set the global position, rotation, scale, etc.
      models.meshes.forEach(mesh => {
        console.log('Loaded mesh:', mesh.name, mesh);
      });

      return models;
    } catch (error) {
      console.error(`Failed to import mesh "${meshName}" from ${path}${filename}:`, error);
      throw error;
    }
  }

  moveMeshPosition(meshName: string, position: { x: number; y: number; z: number }): void {
    const mesh = this.scene.getMeshByName(meshName);
    if (mesh) {
      mesh.position = new BABYLON.Vector3(position.x, position.y, position.z);
    } else {
      console.warn(`Mesh "${meshName}" not found in the scene.`);
    }
  }

  rotateMeshPosition(meshName: string, rotation: { x: number; y: number; z: number }): void {
    const mesh = this.scene.getMeshByName(meshName);
    if (mesh) {
      mesh.rotation = new BABYLON.Vector3(rotation.x, rotation.y, rotation.z);
    } else {
      console.warn(`Mesh "${meshName}" not found in the scene.`);
    }
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

  private addRetroStartButton(onClick?: () => void) {
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

  // draw stuff here?
  async initialize() {
    // TODO CONCEPT: import TV model and apply a dynamic texture to its screen
    // const result = await this.importMeshAsync("", "./assets/models/", "tv_03.glb");

    const aspect = this.canvas.width / this.canvas.height;
    const planeHeight = 2;
    const planeWidth = planeHeight * aspect;
    const plane = BABYLON.MeshBuilder.CreatePlane("gameScreen", { width: planeWidth, height: planeHeight }, this.scene);
    plane.position = new BABYLON.Vector3(0, 0, 1); // put plane in front of the camera

    // TODO CONCEPT: start game, score board, users info, etc
    this.addRetroStartButton(() => {
      console.log("Start button clicked!");
    });

    this.applyDynamicTextureToMesh("gameScreen", this.gameCanvas.getCanvasElement());
  }
}
