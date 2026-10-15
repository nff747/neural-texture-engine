import { SimplexNoise3D } from './SimplexNoise3D';

export class FbmNoiseOctaves {
  static evaluate(x: number, y: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
    let sum = 0.0;
    let freq = 1.0;
    let amp = 1.0;
    let maxAmp = 0.0;

    for (let o = 0; o < octaves; o++) {
      sum += SimplexNoise3D.noise(x * freq, y * freq, 0.0) * amp;
      maxAmp += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / maxAmp;
  }
}
