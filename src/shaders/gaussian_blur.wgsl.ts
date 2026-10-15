export const GAUSSIAN_BLUR_WGSL = /* wgsl */ `
struct Uniforms {
  width: u32,
  height: u32,
  direction: vec2<f32>, // (1, 0) for horizontal, (0, 1) for vertical
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = i32(global_id.x);
  let y = i32(global_id.y);
  if (u32(x) >= uniforms.width || u32(y) >= uniforms.height) {
    return;
  }

  let weights = array<f32, 5>(0.06136, 0.24477, 0.38774, 0.24477, 0.06136);
  var sum: vec4<f32> = vec4<f32>(0.0);

  for (var i = -2; i <= 2; i = i + 1) {
    let offset = vec2<i32>(i32(f32(i) * uniforms.direction.x), i32(f32(i) * uniforms.direction.y));
    let color = textureLoad(inputTex, vec2<i32>(x, y) + offset, 0);
    sum = sum + color * weights[i + 2];
  }

  textureStore(outputTex, vec2<i32>(x, y), sum);
}
`;
