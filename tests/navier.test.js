import test from 'node:test';
import assert from 'node:assert/strict';
import { spindlePoint, spindleScales, angularRate, concentrationAt } from '../src/math/navier.js';

const params = { concentration: .25, stretch: 1.15, winding: 1.3 };

test('N–S illustration stays finite at tips and at maximum concentration', () => {
  for (const concentration of [0, .5, .9]) {
    for (const stretch of [.65, 1.6]) {
      for (const shell of [.28, .7, 1]) {
        for (const u of [0, .00001, .5, .99999, 1]) {
          const point = spindlePoint(u, shell, .7, { ...params, concentration, stretch });
          assert.equal(point.length, 3);
          assert.ok(point.every(Number.isFinite));
          assert.ok(Math.hypot(point[0], point[2]) > 0);
        }
      }
    }
  }
});

test('concentration contracts radii and increases the bounded illustrative angular rate', () => {
  const wide = { ...params, concentration: 0 }, tight = { ...params, concentration: .9 };
  const a = spindlePoint(.5, .7, 0, wide), b = spindlePoint(.5, .7, 0, tight);
  assert.ok(Math.hypot(b[0], b[2]) < Math.hypot(a[0], a[2]));
  assert.ok(angularRate(.7, .9) > angularRate(.7, 0));
  assert.ok(Number.isFinite(angularRate(0, .9)));
  assert.ok(angularRate(.28, .5) > angularRate(1, .5));
});

test('the stretch component alone preserves affine volume', () => {
  for (const stretch of [.65, 1, 1.6]) {
    const scale = spindleScales({ concentration: 0, stretch });
    assert.ok(Math.abs(scale.radial ** 2 * scale.axial - 1) < 1e-12);
  }
  const a = spindlePoint(.8, .8, 0, { ...params, concentration: 0, stretch: 1 });
  const b = spindlePoint(.8, .8, 0, { ...params, concentration: 0, stretch: 1.6 });
  assert.ok(Math.abs(b[1] / a[1] - 1.6) < 1e-12);
});

test('concentration loop is smooth, repeatable, bounded and time based', () => {
  const period = 18;
  for (let i = 0; i < 500; i++) {
    const t = i / 11;
    const a = concentrationAt(t, .85, true);
    assert.ok(a >= 0 && a <= .9);
    assert.ok(Math.abs(a - concentrationAt(t + period, .85, true)) < 1e-12);
  }
  assert.equal(concentrationAt(0, .3, false), .3);
  assert.equal(concentrationAt(100, .3, false), .3);
});

test('public geometric inputs reject invalid values', () => {
  assert.throws(() => spindlePoint(NaN, .5, 0, params), RangeError);
  assert.throws(() => spindlePoint(.5, 0, 0, params), RangeError);
  assert.throws(() => spindlePoint(.5, .5, 0, { ...params, stretch: 0 }), RangeError);
  assert.throws(() => angularRate(.5, Infinity), RangeError);
  assert.throws(() => concentrationAt(-1, .5, true), RangeError);
});
