export const DEPTH_TO_NORMAL_WGSL = /* wgsl */ `
@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // Cross product of horizontal and vertical screen space tangents
  let ddx = vec3<f32>(1.0, 0.0, 0.1);
  let ddy = vec3<f32>(0.0, 1.0, 0.1);
  let normal = normalize(cross(ddx, ddy));
}
`;
