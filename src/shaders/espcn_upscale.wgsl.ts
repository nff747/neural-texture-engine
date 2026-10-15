export const ESPCN_UPSCALE_WGSL = /* wgsl */ `
struct Uniforms {
  inputWidth: u32,
  inputHeight: u32,
  scaleFactor: u32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let outX = global_id.x;
  let outY = global_id.y;
  let outW = uniforms.inputWidth * uniforms.scaleFactor;
  let outH = uniforms.inputHeight * uniforms.scaleFactor;

  if (outX >= outW || outY >= outH) {
    return;
  }

  let inX = outX / uniforms.scaleFactor;
  let inY = outY / uniforms.scaleFactor;

  let color = textureLoad(inputTex, vec2<i32>(i32(inX), i32(inY)), 0);
  textureStore(outputTex, vec2<i32>(i32(outX), i32(outY)), color);
}
`;
