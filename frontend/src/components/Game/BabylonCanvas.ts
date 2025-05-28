declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: Scene and Engine types? how to import them?

// basic scene
export class BabylonCanvas {
  private canvas;
  private engine;
  private scene;

  constructor(containerId) {
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

  createScene() {
    const scene = new BABYLON.Scene(this.engine);
    // Vector3(0, 1, 0) -> x, y, z coordinates, position
    const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 1, -5), scene);
    camera.attachControl();

    // Vector3(0, 1, 0) -> x, y, z coordinates, direction of the light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    // TODO: abstract object creation to a separate method(?)
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);

    const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 1 }, scene);
    ball.position = new BABYLON.Vector3(0, 1, 0); // position the ball above the ground

    return scene;
  }
}
