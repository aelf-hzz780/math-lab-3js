import test from 'node:test';
import assert from 'node:assert/strict';
import { projectiveDirections, createRealTubes, segmentDistanceSquared, estimateTubeUnion, capsuleVolume } from '../src/math/real-kakeya.js';

test('finite projective directions are normalized and distinct up to sign', () => {
  const directions = projectiveDirections(72);
  assert.equal(directions.length, 72);
  directions.forEach(d => assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-12));
  for (let i = 0; i < directions.length; i++) for (let j = i + 1; j < directions.length; j++) {
    const dot = directions[i].reduce((sum, x, k) => sum + x * directions[j][k], 0);
    assert.ok(Math.abs(dot) < 1 - 1e-8);
  }
});

test('moving the tube centres preserves every sampled direction and unit segment length', () => {
  const a = createRealTubes({ count: 48, packing: 0, layout: 'hairbrush', seed: 42 });
  const b = createRealTubes({ count: 48, packing: .9, layout: 'sheets', seed: 42 });
  for (let i = 0; i < a.length; i++) {
    assert.deepEqual(a[i].direction, b[i].direction);
    assert.ok(Math.abs(Math.hypot(...b[i].end.map((x, k) => x - b[i].start[k])) - 1) < 1e-12);
    assert.ok(segmentDistanceSquared(b[i].center, b[i].start, b[i].end) < 1e-20);
  }
});

test('capsule distance uses the finite segment including its endpoints', () => {
  assert.ok(Math.abs(segmentDistanceSquared([.5, .2, 0], [0, 0, 0], [1, 0, 0]) - .04) < 1e-12);
  assert.equal(segmentDistanceSquared([2, 0, 0], [0, 0, 0], [1, 0, 0]), 1);
  assert.equal(segmentDistanceSquared([1, 2, 2], [0, 0, 0], [0, 0, 0]), 9);
});

test('deterministic union estimate approximates a single capsule and ignores duplicate tubes', () => {
  const tube = { start: [0, 0, 0], end: [1, 0, 0] }, radius = .15;
  const one = estimateTubeUnion([tube], radius, 32768);
  const duplicate = estimateTubeUnion([tube, tube], radius, 32768);
  assert.ok(Math.abs(one.volume - capsuleVolume(radius)) / capsuleVolume(radius) < .015);
  assert.equal(one.volume, duplicate.volume);
  assert.deepEqual(one, estimateTubeUnion([tube], radius, 32768));
  assert.ok(one.volume > 0 && one.volume <= one.boundingVolume);
});

test('invalid finite geometry and estimator inputs are rejected', () => {
  assert.throws(() => projectiveDirections(0), RangeError);
  assert.throws(() => createRealTubes({ count: 48, packing: NaN, layout: 'bush', seed: 42 }), RangeError);
  assert.throws(() => createRealTubes({ count: 48, packing: .5, layout: 'unknown', seed: 42 }), RangeError);
  assert.throws(() => estimateTubeUnion([], .1, 1000), RangeError);
  assert.throws(() => capsuleVolume(0), RangeError);
});
