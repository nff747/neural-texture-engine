import { describe, it, expect } from 'vitest';
import { NORMAL_RECONSTRUCTION_WGSL } from '../src/shaders/normal_reconstruction.wgsl';

describe('Normal Reconstruction Shader', () => {
  it('contains Sobel filter gradient extraction logic', () => {
    expect(NORMAL_RECONSTRUCTION_WGSL).toContain('let dX =');
    expect(NORMAL_RECONSTRUCTION_WGSL).toContain('let dY =');
    expect(NORMAL_RECONSTRUCTION_WGSL).toContain('let N = normalize(');
  });
});
