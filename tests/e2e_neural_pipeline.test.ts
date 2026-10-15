import { describe, it, expect } from 'vitest';
import { WorleyNoiseGenerator } from '../src/procedural/WorleyNoiseGenerator';
import { SsimEvaluator } from '../src/eval/SsimEvaluator';

describe('Neural Texture E2E Pipeline', () => {
  it('generates procedural texture map and evaluates self-similarity', () => {
    const map = WorleyNoiseGenerator.generate(16, 16, 4);
    const ssim = SsimEvaluator.evaluate(map, map, 16, 16);
    expect(ssim).toBeCloseTo(1.0);
  });
});
