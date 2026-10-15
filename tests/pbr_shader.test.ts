import { describe, it, expect } from 'vitest';
import { ROUGHNESS_METALNESS_WGSL } from '../src/shaders/roughness_metalness.wgsl';

describe('PBR Roughness Metalness Shader', () => {
  it('packs roughness and metallic into composite G and B channels', () => {
    expect(ROUGHNESS_METALNESS_WGSL).toContain('textureStore(pbrCombined');
    expect(ROUGHNESS_METALNESS_WGSL).toContain('uniforms.roughnessBias');
  });
});
