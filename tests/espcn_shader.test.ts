import { describe, it, expect } from 'vitest';
import { ESPCN_UPSCALE_WGSL } from '../src/shaders/espcn_upscale.wgsl';

describe('ESPCN Upscale Shader', () => {
  it('contains expected compute attributes and workgroup configuration', () => {
    expect(ESPCN_UPSCALE_WGSL).toContain('@compute @workgroup_size(16, 16, 1)');
    expect(ESPCN_UPSCALE_WGSL).toContain('texture_storage_2d<rgba8unorm, write>');
  });
});
