import { describe, it, expect } from 'vitest';
import { EDGE_DILATION_WGSL } from '../src/shaders/edge_dilation.wgsl';

describe('Edge Dilation Shader', () => {
  it('defines compute workgroup size', () => {
    expect(EDGE_DILATION_WGSL).toContain('@compute @workgroup_size(16, 16, 1)');
  });
});
