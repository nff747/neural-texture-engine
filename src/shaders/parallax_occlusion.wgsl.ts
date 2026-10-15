export const PARALLAX_OCCLUSION_WGSL = /* wgsl */ `
struct Uniforms {
  numLayers: f32,
  heightScale: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var heightMap: texture_2d<f32>;

fn parallaxOffset(texCoords: vec2<f32>, viewDir: vec3<f32>) -> vec2<f32> {
  let layerDepth = 1.0 / uniforms.numLayers;
  var currentLayerDepth: f32 = 0.0;
  let p = viewDir.xy * uniforms.heightScale;
  let deltaTexCoords = p / uniforms.numLayers;

  var currentTexCoords = texCoords;
  for (var i = 0; i < 32; i = i + 1) {
    if (f32(i) >= uniforms.numLayers) { break; }
    currentTexCoords = currentTexCoords - deltaTexCoords;
    currentLayerDepth = currentLayerDepth + layerDepth;
  }
  return currentTexCoords;
}
`;
