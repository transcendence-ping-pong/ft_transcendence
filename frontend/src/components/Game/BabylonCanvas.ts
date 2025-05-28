declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import

export class ThreeDCanvas {
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
    this.scene = new BABYLON.Scene(this.engine);

    const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2.5, 10, BABYLON.Vector3.Zero(), this.scene);
    camera.attachControl(this.canvas, true);
    new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);

    // simple box experiment
    BABYLON.MeshBuilder.CreateBox('box', {}, this.scene);

    // BABYLON.AppendSceneAsync(
    //   '../components/assets/models/atari_2600.glb',
    //   this.scene
    // ).then(() => {
    //   // Model loaded! Add settings/logic here
    // });

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener('resize', () => this.engine.resize());
  }
}
