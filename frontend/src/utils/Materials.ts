declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: see comments in BabylonCanvas.ts regarding import

const TEXTURE_PATH = './assets/standardTextures/';

export interface MaterialSpecs {
  name: string;
  diffuse: string;
  normal?: string;
  bump?: string;
  specular?: string;
  ambient?: string;
  specularPower?: number;
}

/**
 * Generates a StandardMaterialSpecs object using a naming convention.
 * 
 * The `name` parameter is used as both the texture folder and the file prefix.
 * For example, if name = "stone", the function expects textures at:
 *   ./assets/textures/stone/stone_diffuse.jpg
 *   ./assets/textures/stone/stone_normal.jpg
 *   ./assets/textures/stone/stone_bump.jpg
 *   ./assets/textures/stone/stone_specular.jpg
 *   ./assets/textures/stone/stone_ambient.jpg
 * 
 * @param name - The base name for the material and its texture files/folder.
 * @param specularPower - (optional) The specular power for the material.
 * @returns MaterialSpecs object for use with createStandardMaterial.
 */
function generateStandardMaterialSpecs(name: string, specularPower?: number): MaterialSpecs {
  return {
    name,
    diffuse: `${name}_diffuse.jpg`,
    normal: `${name}_normal.jpg`,
    bump: `${name}_bump.jpg`,
    specular: `${name}_specular.jpg`,
    ambient: `${name}_ambient.jpg`,
    specularPower: specularPower,
  };
}

export const MaterialLibrary: { [key: string]: MaterialSpecs } = {
  stone: generateStandardMaterialSpecs('stone', 10),
  metal: generateStandardMaterialSpecs('metal', 10),
  // Add more here
};

/**
 * Creates a StandardMaterial with textures based on the provided MaterialSpecs.
 * 
 * @param scene - The Babylon.js scene to which the material will be added.
 * @param specs - The MaterialSpecs object containing texture file names. If a texture is not specified, it will be set to null and ignored.
 * @param uvScale - (optional) Scale factor for the texture UVs, default is 4.
 * @param invertNormalMap - (optional) If true, inverts the normal map coordinates.
 * @returns A new StandardMaterial with the specified textures applied.
 */
export function createStandardMaterial(scene: any, specs: MaterialSpecs, uvScale: number = 4, invertNormalMap: boolean = false): any {
  // TODO TYPE: scene should be Scene type from Babylon.js
  // TODO TYPE: function should return type BABYLON.StandardMaterial
  const material = new BABYLON.StandardMaterial(specs.name, scene);

  // Helper to load and scale a texture
  // TODO CONCEPT: does a nested function make sense here?
  function loadTex(file?: string) {
    if (!file) return null;
    const tex = new BABYLON.Texture(`${TEXTURE_PATH}${specs.name}/${file}`, scene);
    tex.uScale = uvScale;
    tex.vScale = uvScale;
    return tex;
  }

  material.diffuseTexture = loadTex(specs.diffuse);
  material.bumpTexture = loadTex(specs.normal || specs.bump);
  material.specularTexture = loadTex(specs.specular);
  material.ambientTexture = loadTex(specs.ambient);

  if (specs.specularPower !== undefined) {
    material.specularPower = specs.specularPower;
  }

  if (invertNormalMap && material.bumpTexture) {
    material.invertNormalMapX = true;
    material.invertNormalMapY = true;
  }

  return material;
}

// Physically Based Rendering (PBR) materials