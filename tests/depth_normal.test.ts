import { describe, it, expect } from 'vitest';
import { DEPTH_TO_NORMAL_WGSL } from '../src/shaders/depth_to_normal.wgsl';

describe('Depth to Normal Shader', () => {
  it('contains cross product normal reconstruction', () => {
    expect(DEPTH_TO_NORMAL_WGSL).toContain('normalize(cross(ddx, ddy))');
  });
});
