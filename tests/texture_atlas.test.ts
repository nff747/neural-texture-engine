import { describe, it, expect } from 'vitest';
import { TextureAtlasManager } from '../src/texture/TextureAtlasManager';

describe('TextureAtlasManager', () => {
  it('computes UV offsets for 4x4 atlas grid', () => {
    const atlas = new TextureAtlasManager(4);
    expect(atlas.getTileUvOffset(0)).toEqual([0, 0]);
    expect(atlas.getTileUvOffset(1)).toEqual([0.25, 0]);
    expect(atlas.getTileUvOffset(4)).toEqual([0, 0.25]);
  });
});
