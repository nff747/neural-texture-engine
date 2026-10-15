import { describe, it, expect } from 'vitest';
import { LruTextureTileCache } from '../src/cache/LruTextureTileCache';

describe('LruTextureTileCache', () => {
  it('evicts least recently accessed tile when full', () => {
    const cache = new LruTextureTileCache<string>(2);
    cache.set('tile_0_0', 'data1');
    cache.set('tile_0_1', 'data2');

    cache.get('tile_0_0'); // touch 0_0
    cache.set('tile_1_0', 'data3'); // should evict 0_1

    expect(cache.get('tile_0_0')).toBe('data1');
    expect(cache.get('tile_0_1')).toBeUndefined();
    expect(cache.get('tile_1_0')).toBe('data3');
  });
});
