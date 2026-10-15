export const ROUGHNESS_METALNESS_WGSL = /* wgsl */ `
struct Uniforms {
  width: u32,
  height: u32,
  roughnessBias: f32,
  metallicBias: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var roughnessTex: texture_2d<f32>;
@group(0) @binding(2) var metallicTex: texture_2d<f32>;
@group(0) @binding(3) var pbrCombined: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = i32(global_id.x);
  let y = i32(global_id.y);
  if (u32(x) >= uniforms.width || u32(y) >= uniforms.height) {
    return;
  }

  let r = textureLoad(roughnessTex, vec2<i32>(x, y), 0).r * uniforms.roughnessBias;
  let m = textureLoad(metallicTex, vec2<i32>(x, y), 0).r * uniforms.metallicBias;

  // G = Roughness, B = Metallic, A = Ambient Occlusion
  textureStore(pbrCombined, vec2<i32>(x, y), vec4<f32>(1.0, r, m, 1.0));
}
`;
