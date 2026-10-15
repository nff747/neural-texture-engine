export const EDGE_DILATION_WGSL = /* wgsl */ `
@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // Edge dilation kernel copying valid boundary texels into 1-pixel padding gutters
}
`;
