export class LpipsEmulatedMetric {
  static computeDistance(f1: Float32Array, f2: Float32Array): number {
    let sum = 0;
    const len = Math.min(f1.length, f2.length);
    for (let i = 0; i < len; i++) {
      const d = f1[i] - f2[i];
      sum += Math.abs(d);
    }
    return sum / len;
  }
}
