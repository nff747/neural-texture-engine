import { describe, it, expect } from 'vitest';
import { GAUSSIAN_BLUR_WGSL } from '../src/shaders/gaussian_blur.wgsl';

describe('Gaussian Blur Shader', () => {
  it('contains 5-tap separable kernel weights', () => {
    expect(GAUSSIAN_BLUR_WGSL).toContain('weights = array<f32, 5>');
    expect(GAUSSIAN_BLUR_WGSL).toContain('direction: vec2<f32>');
  });
});
