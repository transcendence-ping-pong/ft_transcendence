declare var BABYLON: any; // tyoescript doesn't know about BABYLON global import
// TODO: see comments in BabylonCanvas.ts regarding import

const STANDARD_TEXTURE_PATH = './assets/standardTextures/';
const PBR_TEXTURE_PATH = './assets/pbrTextures/';

// brightness of highlights on a surface due to light reflection
const SPECULAR_POWER_MIRROR = 128; // 128-256 very shiny
const SPECULAR_POWER_POLISHED_METAL = 64; // 64-128 sharp highlight
const SPECULAR_POWER_PLASTIC = 32; // 32-64 medium highlight
const SPECULAR_POWER_WOOD = 16; // 16-32 soft highlight, broader
const SPECULAR_POWER_STONE = 8; // 8-16 very soft highlight, wide, matte
const SPECULAR_POWER_MATTE = 1; // 1-8 almost no highlight, very diffuse and matte

export interface StandardMaterialSpecs {
  name: string;
  diffuse: string;
  normal?: string;
  bump?: string;
  specular?: string;
  ambient?: string;
  specularPower?: number;
}

export interface PBRMaterialSpecs {
  name: string;
  diffuse: string;
  normal?: string;
  arm?: string;
  metallic?: string;
  roughness?: string;
}

export interface PBREmissiveMaterialSpecs extends PBRMaterialSpecs {
  emissive?: string; // emissive texture for PBR materials
  emissiveColor?: { r: number; g: number; b: number }; // TODO TYPE: BABYLON.Color3
  emissiveIntensity?: number; // intensity of the emissive color
  glowIntensity?: number; // intensity of the glow effect
}

function generateTextureSpecs<T extends object>(name: string, keys: (keyof T)[], extra: Partial<T> = {}): T {
  const specs: any = { name };
  for (const key of keys) {
    if (key !== 'name') {
      specs[key] = `${name}_${String(key)}.jpg`;
    }
  }
  return { ...specs, ...extra };
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
function generateStandardMaterialSpecs(name: string, specularPower?: number): StandardMaterialSpecs {
  return generateTextureSpecs<StandardMaterialSpecs>(
    name,
    ['diffuse', 'normal', 'bump', 'specular', 'ambient'],
    { specularPower }
  );
}

function generatePBRMaterialSpecs(name: string): PBRMaterialSpecs {
  return generateTextureSpecs<PBRMaterialSpecs>(
    name,
    ['diffuse', 'normal', 'arm', 'metallic', 'roughness']
  );
}

function generatePBREmissiveMaterialSpecs(name: string): PBREmissiveMaterialSpecs {
  return generateTextureSpecs<PBREmissiveMaterialSpecs>(
    name,
    ['diffuse', 'normal', 'arm', 'metallic', 'roughness', 'emissive'],
    { emissiveColor: { r: 1, g: 1, b: 1 }, emissiveIntensity: 1, glowIntensity: 1 }
  );
}

export const StandardMaterialLibrary: { [key: string]: StandardMaterialSpecs } = {
  stone: generateStandardMaterialSpecs('stone', SPECULAR_POWER_STONE),
  metal: generateStandardMaterialSpecs('metal', SPECULAR_POWER_POLISHED_METAL),
  // Add more here
};

export const PBRMaterialLibrary: { [key: string]: PBRMaterialSpecs } = {
  asphalt: generatePBRMaterialSpecs('asphalt'),
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
export function createStandardMaterial(
  scene: any,
  specs: StandardMaterialSpecs,
  options: { uvScale: number; invertNormalMap: boolean } = { uvScale: 4, invertNormalMap: false }
): any {

  if (!specs) {
    throw new Error(`Standard material not found in library.`);
  }

  // TODO TYPE: scene should be Scene type from Babylon.js
  // TODO TYPE: function should return type BABYLON.StandardMaterial
  const material = new BABYLON.StandardMaterial(specs.name, scene);

  // Helper to load and scale a texture
  // TODO CONCEPT: does a nested function make sense here?
  function loadTex(file?: string) {
    if (!file) return null;
    const tex = new BABYLON.Texture(`${STANDARD_TEXTURE_PATH}${specs.name}/${file}`, scene);
    tex.uScale = options.uvScale;
    tex.vScale = options.uvScale;
    return tex;
  }

  material.diffuseTexture = loadTex(specs.diffuse);
  material.bumpTexture = loadTex(specs.normal || specs.bump);
  material.specularTexture = loadTex(specs.specular);
  material.ambientTexture = loadTex(specs.ambient);

  if (specs.specularPower !== undefined) {
    material.specularPower = specs.specularPower;
  }

  if (options.invertNormalMap && material.bumpTexture) {
    material.invertNormalMapX = true;
    material.invertNormalMapY = true;
  }

  return material;
}

// Physically Based Rendering (PBR) materials
// TODO TYPE: should return type BABYLON.PBRMaterial
export function createPBRMaterial(
  scene: any,
  specs: PBRMaterialSpecs,
  options: { roughness?: number; metallic?: number; invertNormalMap?: boolean } = {}
): any {

  if (!specs) {
    throw new Error(`PBR material not found in library.`); // TODO ERROR
  }

  const pbr = new BABYLON.PBRMaterial(specs.name, scene);

  // TODO CONCEPT: should we use a separate function to load textures? just as standard materials?
  pbr.albedoTexture = new BABYLON.Texture(`${PBR_TEXTURE_PATH}${specs.name}/${specs.diffuse}`, scene);
  pbr.bumpTexture = new BABYLON.Texture(`${PBR_TEXTURE_PATH}${specs.name}/${specs.normal}`, scene);

  pbr.useAmbientOcclusionFromMetallicTextureRed = true; // use red channel for ambient occlusion
  pbr.useRoughnessFromMetallicTextureGreen = true; // use green channel for roughness
  pbr.useMetallnessFromMetallicTextureBlue = true; // use blue channel for metallic
  pbr.metallicTexture = new BABYLON.Texture(`${PBR_TEXTURE_PATH}${specs.name}/${specs.arm}`, scene);

  // could use both texture or numeric values for metallic and roughness definitions
  if (!pbr.metallicTexture && options.roughness && options.metallic) {
    if (options.roughness >= 0 && options.metallic >= 0) {
      pbr.metallic = options.metallic;
      pbr.roughness = options.roughness;
    } else {
      pbr.metallic = 1; // default metallic value
      pbr.roughness = 1; // default roughness value
    }
  }

  if (options.invertNormalMap && pbr.bumpTexture) {
    pbr.invertNormalMapX = true;
    pbr.invertNormalMapY = true;
  }

  return pbr;
}

export function createPBREmissiveMaterial(
  scene: any,
  specs: PBREmissiveMaterialSpecs,
  options: { roughness?: number; metallic?: number; invertNormalMap?: boolean } = {},
): any {
  const pbr = createPBRMaterial(scene, specs, options);

  pbr.environmentIntensity = 0.25; // low the intensity of the environment light, so the emissive color is more visible

  pbr.emissiveTexture = new BABYLON.Texture(`${PBR_TEXTURE_PATH}${specs.name}/${specs.diffuse}`, scene);
  pbr.emissiveColor = new BABYLON.Color3(specs.emissiveColor.r, specs.emissiveColor.g, specs.emissiveColor.b);
  pbr.emissiveIntensity = specs.emissiveIntensity;

  const glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity = specs.glowIntensity;

  return pbr;
}
