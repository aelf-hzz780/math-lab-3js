import { seededRandom } from '../core/resources.js';

function inRange(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be in [${min}, ${max}]`);
}
function point(value) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) throw new TypeError('A point must have three finite coordinates');
}

/** Unoriented lines use one representative from the upper hemisphere. */
export function projectiveDirections(count) {
  inRange(count, 2, 256, 'direction count');
  if (!Number.isInteger(count)) throw new RangeError('direction count must be an integer');
  const angle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = (i + .5) / count, r = Math.sqrt(1 - y * y), phi = i * angle;
    return [r * Math.cos(phi), y, r * Math.sin(phi)];
  });
}

export function createRealTubes({ count = 72, packing = .4, layout = 'hairbrush', seed = 42 } = {}) {
  inRange(packing, 0, 1, 'packing');
  if (!['bush', 'hairbrush', 'sheets'].includes(layout)) throw new RangeError('Unknown tube layout');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('seed must be an unsigned 32-bit integer');
  const random = seededRandom(seed);
  return projectiveDirections(count).map((direction, i) => {
    const t = (i + .5) / count, jitter = (random() - .5) * .03;
    let center;
    if (layout === 'bush') center = direction.map(x => x * packing * .48);
    else if (layout === 'hairbrush') center = [packing * (t - .5) * 1.35, 0, 0];
    else center = [packing * .38 * Math.cos(t * Math.PI * 4), packing * ((i % 6) / 5 - .5) * .85, packing * .38 * Math.sin(t * Math.PI * 4)];
    center = center.map(x => x + jitter * packing);
    return { center, direction, start: center.map((x, k) => x - direction[k] / 2), end: center.map((x, k) => x + direction[k] / 2) };
  });
}

function distanceSquared(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, length2 = dx * dx + dy * dy + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / length2)) : 0;
  const x = px - ax - t * dx, y = py - ay - t * dy, z = pz - az - t * dz;
  return x * x + y * y + z * z;
}

export function segmentDistanceSquared(position, start, end) {
  point(position); point(start); point(end);
  return distanceSquared(...position, ...start, ...end);
}

export function capsuleVolume(radius, length = 1) {
  inRange(radius, Number.EPSILON, 10, 'radius'); inRange(length, 0, 100, 'length');
  return Math.PI * radius * radius * length + 4 / 3 * Math.PI * radius ** 3;
}

function radicalInverse(index, base) {
  let result = 0, fraction = 1 / base;
  while (index) { result += (index % base) * fraction; index = Math.floor(index / base); fraction /= base; }
  return result;
}

/** Deterministic Halton quadrature; this finite estimate is not a dimension proof. */
export function estimateTubeUnion(tubes, radius, samples = 8192) {
  if (!Array.isArray(tubes) || !tubes.length || tubes.length > 256) throw new RangeError('Expected 1 to 256 tubes');
  inRange(radius, .001, 1, 'radius'); inRange(samples, 256, 131072, 'samples');
  if (!Number.isInteger(samples)) throw new RangeError('samples must be an integer');
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const packed = new Float64Array(tubes.length * 6);
  for (let i = 0; i < tubes.length; i++) {
    point(tubes[i].start); point(tubes[i].end);
    packed.set(tubes[i].start, i * 6); packed.set(tubes[i].end, i * 6 + 3);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], tubes[i].start[k] - radius, tubes[i].end[k] - radius);
      max[k] = Math.max(max[k], tubes[i].start[k] + radius, tubes[i].end[k] + radius);
    }
  }
  const span = max.map((x, k) => x - min[k]), boundingVolume = span[0] * span[1] * span[2], r2 = radius * radius;
  let occupied = 0;
  // O(samples × tubes) is bounded and runs only when geometry parameters change.
  for (let i = 1; i <= samples; i++) {
    const x = min[0] + span[0] * radicalInverse(i, 2), y = min[1] + span[1] * radicalInverse(i, 3), z = min[2] + span[2] * radicalInverse(i, 5);
    for (let j = 0; j < packed.length; j += 6) {
      if (distanceSquared(x, y, z, packed[j], packed[j + 1], packed[j + 2], packed[j + 3], packed[j + 4], packed[j + 5]) <= r2) { occupied++; break; }
    }
  }
  return { volume: boundingVolume * occupied / samples, boundingVolume, occupied, samples, min, max };
}
