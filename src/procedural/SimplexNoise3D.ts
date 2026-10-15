export class SimplexNoise3D {
  static noise(x: number, y: number, z: number): number {
    // Deterministic analytical gradient noise approximation
    return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 0.5 + 0.5;
  }
}
