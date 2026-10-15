export class PsnrEvaluator {
  static evaluate(orig: Float32Array, test: Float32Array, maxVal = 1.0): number {
    let mse = 0;
    const len = orig.length;
    for (let i = 0; i < len; i++) {
      const diff = orig[i] - test[i];
      mse += diff * diff;
    }
    mse /= len;
    if (mse === 0) return Infinity;
    return 10.0 * Math.log10((maxVal * maxVal) / mse);
  }
}
