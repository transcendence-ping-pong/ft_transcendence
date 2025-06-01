import { createStandardMaterial, StandardMaterialLibrary, createPBRMaterial, PBRMaterialLibrary } from '../../utils/Materials.js';

declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: Scene and Engine types? how to import them?
// TODO: not having a bundler is really annoying, check if we can use Vite??
// Vite: hot module replacement, instant server start, etc.

// basic scene
export class BabylonCanvas {
  private canvas: HTMLCanvasElement;
  private engine: any; // TODO TYPE: BABYLON.Engine type
  private scene: any; // TODO TYPE: BABYLON.Scene type

  constructor(containerId: string) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'babylon-render-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    document.getElementById(containerId)?.appendChild(this.canvas);

    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = this.createScene();
    // this.scene = new BABYLON.Scene(this.engine);

    // const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), this.scene);
    // camera.attachControl(this.canvas, true);
    // new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);

    // simple box experiment
    // BABYLON.MeshBuilder.CreateBox('box', {}, this.scene);

    // BABYLON.AppendSceneAsync(
    //   './assets/models/atari_2600.glb', // path relative to index.html
    //   this.scene
    // ).then(() => {
    //   // Model loaded! Add settings/logic here
    // });

    this.engine.runRenderLoop(() => this.scene.render()); // constantly update the scene, e.g. animations, physics
    window.addEventListener('resize', () => this.engine.resize());
  }

  // TODO TYPE: should return type BABYLON.Scene
  // createScene(): any {
  //   const scene = new BABYLON.Scene(this.engine);
  //   this.scene = scene; // store the scene in the class instance
  //   // Vector3(0, 1, 0) -> x, y, z coordinates, position
  //   const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 1, -5), scene);
  //   camera.attachControl();
  //   camera.speed = 0.25;

  //   // Vector3(0, 1, 0) -> x, y, z coordinates, direction of the light
  //   const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  //   light.intensity = 0; // standard materials dont use environment texture as a light source...
  //   // so we need to add a light source manually, like this one

  //   // option: scene.createDefaultEnvironment()

  //   const envText = new BABYLON.CubeTexture('./assets/environment/skybox.env', scene);
  //   // const envText = new BABYLON.CubeTexture.CreateFromPrefilteredData('./assets/environment/skybox.env', scene);
  //   scene.environmentTexture = envText; // only as light source, not as a background
  //   scene.createDefaultSkybox(envText, true); // aply the environment texture as a skybox/ background
  //   // scene.environmentIntensity = 0.5; // set the intensity of the environment texture APPLIED TO ALL

  //   // TODO: abstract object creation to a separated method(?)
  //   const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
  //   // ground.material = createStandardMaterial(scene, StandardMaterialLibrary.stone);
  //   ground.material = createPBRMaterial(scene, PBRMaterialLibrary.asphalt, { invertNormalMap: true });

  //   const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 1 }, scene);
  //   ball.position = new BABYLON.Vector3(0, 1, 0); // position the ball above the ground
  //   ball.material = createStandardMaterial(scene, StandardMaterialLibrary.metal, { uvScale: 3, invertNormalMap: true });

  //   return scene;
  // }

  createScene(): any {
    const scene = new BABYLON.Scene(this.engine);
    this.scene = scene; // store the scene in the class instance
    // Vector3(0, 1, 0) -> x, y, z coordinates, position
    const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 1, -5), scene);
    camera.attachControl();
    camera.speed = 0.25;

    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0;

    const envText = new BABYLON.CubeTexture('./assets/environment/skybox.env', scene);
    scene.environmentTexture = envText;
    scene.createDefaultSkybox(envText, true);

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    ground.material = createPBRMaterial(scene, PBRMaterialLibrary.asphalt, { invertNormalMap: true });

    return scene;
  }
}
