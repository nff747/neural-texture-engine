export class WorleyNoiseGenerator {
  static generate(width: number, height: number, numPoints = 16): Float32Array {
    const out = new Float32Array(width * height);
    const points: [number, number][] = [];

    for (let i = 0; i < numPoints; i++) {
      points.push([Math.random() * width, Math.random() * height]);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minDist = Infinity;
        for (const [px, py] of points) {
          const dx = px - x;
          const dy = py - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) minDist = dist;
        }
        out[y * width + x] = minDist;
      }
    }
    return out;
  }
}
