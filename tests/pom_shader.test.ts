import { describe, it, expect } from 'vitest';
import { PARALLAX_OCCLUSION_WGSL } from '../src/shaders/parallax_occlusion.wgsl';

describe('POM Shader', () => {
  it('contains layerDepth computation and ray march loop', () => {
    expect(PARALLAX_OCCLUSION_WGSL).toContain('let layerDepth = 1.0 / uniforms.numLayers');
    expect(PARALLAX_OCCLUSION_WGSL).toContain('deltaTexCoords');
  });
});
