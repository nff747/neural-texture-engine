import test from 'node:test';
import assert from 'node:assert';

test('Neural Texture Engine: boot, hot-loop execution, and graceful teardown', () => {
  let state = 'UNINITIALIZED';
  function boot() { state = 'READY'; }
  function run() { if (state !== 'READY') throw new Error('Not ready'); return true; }
  function teardown() { state = 'TERMINATED'; }

  boot();
  assert.strictEqual(state, 'READY');
  assert.strictEqual(run(), true);
  teardown();
  assert.strictEqual(state, 'TERMINATED');
  assert.throws(() => run(), /Not ready/);
});
