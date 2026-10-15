export const NORMAL_RECONSTRUCTION_WGSL = /* wgsl */ `
struct Uniforms {
  width: u32,
  height: u32,
  strength: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var normalMap: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = i32(global_id.x);
  let y = i32(global_id.y);

  if (u32(x) >= uniforms.width || u32(y) >= uniforms.height) {
    return;
  }

  let tl = textureLoad(heightMap, vec2<i32>(x - 1, y - 1), 0).r;
  let l  = textureLoad(heightMap, vec2<i32>(x - 1, y), 0).r;
  let bl = textureLoad(heightMap, vec2<i32>(x - 1, y + 1), 0).r;
  let tr = textureLoad(heightMap, vec2<i32>(x + 1, y - 1), 0).r;
  let r  = textureLoad(heightMap, vec2<i32>(x + 1, y), 0).r;
  let br = textureLoad(heightMap, vec2<i32>(x + 1, y + 1), 0).r;
  let t  = textureLoad(heightMap, vec2<i32>(x, y - 1), 0).r;
  let b  = textureLoad(heightMap, vec2<i32>(x, y + 1), 0).r;

  let dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  let dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

  let N = normalize(vec3<f32>(-dX * uniforms.strength, -dY * uniforms.strength, 1.0));
  let encoded = N * 0.5 + 0.5;

  textureStore(normalMap, vec2<i32>(x, y), vec4<f32>(encoded, 1.0));
}
`;
