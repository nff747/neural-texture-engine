export class GpuFrameTiming {
  private passDurations: Map<string, number[]> = new Map();

  record(passName: string, durationMs: number): void {
    if (!this.passDurations.has(passName)) {
      this.passDurations.set(passName, []);
    }
    this.passDurations.get(passName)!.push(durationMs);
  }

  getAverageDuration(passName: string): number {
    const list = this.passDurations.get(passName);
    if (!list || list.length === 0) return 0;
    const sum = list.reduce((a, b) => a + b, 0);
    return sum / list.length;
  }
}
