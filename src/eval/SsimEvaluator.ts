export class SsimEvaluator {
  static evaluate(img1: Float32Array, img2: Float32Array, width: number, height: number): number {
    const N = width * height;
    if (N === 0) return 1.0;

    let mean1 = 0, mean2 = 0;
    for (let i = 0; i < N; i++) {
      mean1 += img1[i];
      mean2 += img2[i];
    }
    mean1 /= N;
    mean2 /= N;

    let var1 = 0, var2 = 0, covar = 0;
    for (let i = 0; i < N; i++) {
      const d1 = img1[i] - mean1;
      const d2 = img2[i] - mean2;
      var1 += d1 * d1;
      var2 += d2 * d2;
      covar += d1 * d2;
    }
    var1 /= N;
    var2 /= N;
    covar /= N;

    const C1 = 0.01 * 0.01;
    const C2 = 0.03 * 0.03;

    const numerator = (2 * mean1 * mean2 + C1) * (2 * covar + C2);
    const denominator = (mean1 * mean1 + mean2 * mean2 + C1) * (var1 + var2 + C2);

    return numerator / denominator;
  }
}
