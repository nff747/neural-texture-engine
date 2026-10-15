export class LanczosResampler {
  static sinc(x: number): number {
    if (x === 0) return 1.0;
    const px = Math.PI * x;
    return Math.sin(px) / px;
  }

  static lanczos3(x: number): number {
    if (Math.abs(x) >= 3.0) return 0.0;
    return this.sinc(x) * this.sinc(x / 3.0);
  }
}
