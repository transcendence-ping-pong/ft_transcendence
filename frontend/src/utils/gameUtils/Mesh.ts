import * as BABYLON from "@babylonjs/core";
import { Animation, Vector3 } from "@babylonjs/core";

// TODO CONCEPT: import TV model and apply a dynamic texture to its screen
// const result = await this.importMeshAsync("", "./assets/models/", "tv_03.glb");
// export async function importMeshAsync(meshName: string, path: string, filename: string): Promise<any> {
//   try {
//     const models = await BABYLON.SceneLoader.ImportMeshAsync(
//       meshName,
//       path,
//       filename,
//       this.scene
//     );

//     if (!models || !models.meshes || models.meshes.length === 0) {
//       throw new Error(`No meshes found in ${path}${filename} (meshName: "${meshName}")`);
//     }

//     // manipulate meshes after loading if needed
//     // root mesh is at index 0 and can be used to set the global position, rotation, scale, etc.
//     models.meshes.forEach(mesh => {
//       console.log('Loaded mesh:', mesh.name, mesh);
//     });

//     return models;
//   } catch (error) {
//     console.error(`Failed to import mesh "${meshName}" from ${path}${filename}:`, error);
//     throw error;
//   }
// }

export function createSpinAnimation(mesh: BABYLON.Mesh, scene: BABYLON.Scene, duration: number = 5): void {
  const fps = 60;
  const endOfAnimation = duration * fps; // e.g. default is 5 seconds at 60 FPS
  const rotateAnim = new BABYLON.Animation(
    "duckRotate",
    "rotation.y",
    fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
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

export async function importMeshAsync(meshName: string, path: string, filename: string, scene: BABYLON.Scene): Promise<any> {
  try {
    const models = await BABYLON.SceneLoader.ImportMeshAsync(
      meshName,
      path,
      filename,
      scene
    );
    if (!models || !models.meshes || models.meshes.length === 0) {
      throw new Error(`No meshes found in ${path}${filename} (meshName: "${meshName}")`);
    }
    models.meshes.forEach(mesh => {
      console.log('Loaded mesh:', mesh.name, mesh);
    });
    return models;
  } catch (error) {
    console.error(`Failed to import mesh "${meshName}" from ${path}${filename}:`, error);
    throw error;
  }
}

export function moveMeshPosition(meshName: string, position: { x: number; y: number; z: number }): void {
  const mesh = this.scene.getMeshByName(meshName);
  if (mesh) {
    mesh.position = new BABYLON.Vector3(position.x, position.y, position.z);
  } else {
    console.warn(`Mesh "${meshName}" not found in the scene.`);
  }
}

export function rotateMeshPosition(meshName: string, rotation: { x: number; y: number; z: number }): void {
  const mesh = this.scene.getMeshByName(meshName);
  if (mesh) {
    mesh.rotation = new BABYLON.Vector3(rotation.x, rotation.y, rotation.z);
  } else {
    console.warn(`Mesh "${meshName}" not found in the scene.`);
  }
}
