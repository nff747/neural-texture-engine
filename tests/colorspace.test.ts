import { describe, it, expect } from 'vitest';
import { ColorSpaceConverter } from '../src/color/ColorSpaceConverter';

describe('ColorSpaceConverter', () => {
  it('accurately roundtrips midtones', () => {
    const srgb = 0.5;
    const linear = ColorSpaceConverter.srgbToLinear(srgb);
    const recovered = ColorSpaceConverter.linearToSrgb(linear);
    expect(recovered).toBeCloseTo(srgb, 4);
  });
});
