import { describe, it, expect } from 'vitest';
import { UvIslandPacker } from '../src/mesh/UvIslandPacker';

describe('UvIslandPacker', () => {
  it('packs rectangles within maxWidth bound', () => {
    const rects = [{ w: 50, h: 20 }, { w: 60, h: 30 }, { w: 40, h: 10 }];
    const placed = UvIslandPacker.packRow(rects, 100);

    expect(placed[0]).toEqual({ x: 0, y: 0, w: 50, h: 20 });
    // second rect exceeds 100 (50+60=110) -> wraps to next row
    expect(placed[1]).toEqual({ x: 0, y: 20, w: 60, h: 30 });
    expect(placed[2]).toEqual({ x: 60, y: 20, w: 40, h: 10 });
  });
});
