export class LruTextureTileCache<T> {
  private cache = new Map<string, T>();
  readonly capacity: number;

  constructor(capacity = 32) {
    this.capacity = capacity;
  }

  get(key: string): T | undefined {
    const val = this.cache.get(key);
    if (val !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, val);
    }
    return val;
  }

  set(key: string, val: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, val);
  }

  size(): number {
    return this.cache.size;
  }
}
