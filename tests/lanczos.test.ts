import { describe, it, expect } from 'vitest';
import { LanczosResampler } from '../src/filter/LanczosResampler';

describe('LanczosResampler', () => {
  it('yields 1.0 at origin and 0 outside 3-lobe radius', () => {
    expect(LanczosResampler.lanczos3(0)).toBe(1.0);
    expect(LanczosResampler.lanczos3(3.5)).toBe(0.0);
    expect(LanczosResampler.lanczos3(-3.5)).toBe(0.0);
  });
});
