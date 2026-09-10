import { seededRandom } from '../core/resources.js';

const FIXED_STEP = 1 / 240;
function finiteRange(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be in [${min}, ${max}]`);
}
function checkState(state) {
  if (!state || !(state.positions instanceof Float64Array) || !(state.velocities instanceof Float64Array) || state.positions.length !== state.count * 3 || state.velocities.length !== state.count * 3) throw new TypeError('Invalid hard-sphere state');
  if (!state.positions.every(Number.isFinite) || !state.velocities.every(Number.isFinite)) throw new RangeError('Hard-sphere state must remain finite');
}
function checkBody(body) {
  if (!body || !Array.isArray(body.position) || !Array.isArray(body.velocity) || body.position.length !== 3 || body.velocity.length !== 3 || ![...body.position, ...body.velocity].every(Number.isFinite)) throw new TypeError('Body needs finite position and velocity triples');
}

export function resolveElasticPair(a, b, radius) {
  checkBody(a); checkBody(b); finiteRange(radius, Number.EPSILON, 10, 'radius');
  const n = b.position.map((x, k) => x - a.position[k]), distance = Math.hypot(...n);
  if (distance > 2 * radius + 1e-12 || distance < 1e-14) return false;
  for (let k = 0; k < 3; k++) n[k] /= distance;
  const closing = n.reduce((sum, x, k) => sum + x * (a.velocity[k] - b.velocity[k]), 0);
  if (closing <= 0) return false;
  for (let k = 0; k < 3; k++) { a.velocity[k] -= closing * n[k]; b.velocity[k] += closing * n[k]; }
  return true;
}

export function kineticEnergy(state) {
  checkState(state); let energy = 0;
  for (const v of state.velocities) energy += v * v / 2;
  return energy;
}
export function totalMomentum(state) {
  checkState(state); const momentum = [0, 0, 0];
  for (let i = 0; i < state.velocities.length; i++) momentum[i % 3] += state.velocities[i];
  return momentum;
}
export function conservedMomentum(state) { return totalMomentum(state).map((x, k) => x + state.wallMomentum[k]); }

export function createGas({ count = 64, radius = .22, halfSize = 2.7, temperature = 1, seed = 42, historyCapacity = 96 } = {}) {
  finiteRange(count, 2, 160, 'count'); finiteRange(radius, .05, .4, 'radius'); finiteRange(halfSize, 1, 10, 'halfSize'); finiteRange(temperature, .05, 5, 'temperature'); finiteRange(historyCapacity, 1, 256, 'history capacity');
  if (!Number.isInteger(count) || !Number.isInteger(historyCapacity) || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('count/capacity must be integers and seed must be uint32');
  const side = Math.ceil(Math.cbrt(count)), spacing = 2 * (halfSize - radius) / side;
  if (spacing * .75 <= 2 * radius) throw new RangeError('Initial grid is too dense for nonoverlapping spheres');
  const random = seededRandom(seed), positions = new Float64Array(count * 3), velocities = new Float64Array(count * 3), mean = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const grid = [i % side, Math.floor(i / side) % side, Math.floor(i / (side * side))];
    for (let k = 0; k < 3; k++) {
      positions[i * 3 + k] = -halfSize + radius + (grid[k] + .5 + (random() - .5) * .25) * spacing;
      const velocity = Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());
      velocities[i * 3 + k] = velocity; mean[k] += velocity / count;
    }
  }
  let squareSum = 0;
  for (let i = 0; i < velocities.length; i++) { velocities[i] -= mean[i % 3]; squareSum += velocities[i] ** 2; }
  const scale = Math.sqrt(3 * count * temperature / squareSum);
  for (let i = 0; i < velocities.length; i++) velocities[i] *= scale;
  const lastEvents = new Int32Array(count); lastEvents.fill(-1);
  const state = { count, radius, halfSize, positions, velocities, temperature, seed, historyCapacity, history: [], lastEvents, wallMomentum: [0, 0, 0], collisions: 0, time: 0, steps: 0, accumulator: 0, candidateChecks: 0 };
  state.initialEnergy = kineticEnergy(state); state.initialMomentum = totalMomentum(state);
  return state;
}

function reflectWalls(state) {
  const limit = state.halfSize - state.radius;
  for (let i = 0; i < state.positions.length; i++) {
    const position = state.positions[i], velocity = state.velocities[i];
    if (position > limit) {
      state.positions[i] = 2 * limit - position;
      if (velocity > 0) { state.velocities[i] = -velocity; state.wallMomentum[i % 3] += 2 * velocity; }
    } else if (position < -limit) {
      state.positions[i] = -2 * limit - position;
      if (velocity < 0) { state.velocities[i] = -velocity; state.wallMomentum[i % 3] += 2 * velocity; }
    }
  }
}

function recordCollision(state, a, b, time) {
  const id = state.collisions++;
  state.history.push({ id, a, b, time, parents: [state.lastEvents[a], state.lastEvents[b]].filter(n => n >= 0), position: [0, 1, 2].map(k => (state.positions[a * 3 + k] + state.positions[b * 3 + k]) / 2) });
  state.lastEvents[a] = id; state.lastEvents[b] = id;
  if (state.history.length > state.historyCapacity) state.history.shift();
}

function collide(state, a, b, time) {
  const p = state.positions, v = state.velocities, ai = a * 3, bi = b * 3;
  let nx = p[bi] - p[ai], ny = p[bi + 1] - p[ai + 1], nz = p[bi + 2] - p[ai + 2];
  const distance2 = nx * nx + ny * ny + nz * nz, diameter = 2 * state.radius;
  if (distance2 >= diameter * diameter) return;
  const distance = Math.sqrt(distance2);
  if (distance < 1e-14) { nx = 1; ny = 0; nz = 0; } else { nx /= distance; ny /= distance; nz /= distance; }
  const correction = (diameter - distance) / 2 + 1e-12;
  p[ai] -= correction * nx; p[ai + 1] -= correction * ny; p[ai + 2] -= correction * nz;
  p[bi] += correction * nx; p[bi + 1] += correction * ny; p[bi + 2] += correction * nz;
  const closing = (v[ai] - v[bi]) * nx + (v[ai + 1] - v[bi + 1]) * ny + (v[ai + 2] - v[bi + 2]) * nz;
  if (closing <= 1e-13) return;
  v[ai] -= closing * nx; v[ai + 1] -= closing * ny; v[ai + 2] -= closing * nz;
  v[bi] += closing * nx; v[bi + 1] += closing * ny; v[bi + 2] += closing * nz;
  recordCollision(state, a, b, time);
}

function resolveContacts(state, time) {
  const cellSize = state.radius * 2, grid = new Map(), cells = new Int16Array(state.count * 3);
  const key = (x, y, z) => `${x},${y},${z}`;
  for (let i = 0; i < state.count; i++) {
    const x = Math.floor(state.positions[i * 3] / cellSize), y = Math.floor(state.positions[i * 3 + 1] / cellSize), z = Math.floor(state.positions[i * 3 + 2] / cellSize);
    cells.set([x, y, z], i * 3); const id = key(x, y, z);
    if (!grid.has(id)) grid.set(id, []); grid.get(id).push(i);
  }
  for (let i = 0; i < state.count; i++) {
    const x = cells[i * 3], y = cells[i * 3 + 1], z = cells[i * 3 + 2];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const neighbors = grid.get(key(x + dx, y + dy, z + dz));
      if (!neighbors) continue;
      for (const j of neighbors) if (j > i) { state.candidateChecks++; collide(state, i, j, time); }
    }
  }
}

function fixedTick(state) {
  let maxSpeed = 0;
  for (let i = 0; i < state.count; i++) maxSpeed = Math.max(maxSpeed, Math.hypot(state.velocities[i * 3], state.velocities[i * 3 + 1], state.velocities[i * 3 + 2]));
  const subdivisions = Math.max(1, Math.ceil(maxSpeed * FIXED_STEP * 4 / state.radius)), dt = FIXED_STEP / subdivisions;
  for (let step = 0; step < subdivisions; step++) {
    for (let i = 0; i < state.positions.length; i++) state.positions[i] += state.velocities[i] * dt;
    reflectWalls(state);
    const time = state.steps * FIXED_STEP + (step + 1) * dt;
    resolveContacts(state, time); reflectWalls(state);
    resolveContacts(state, time); reflectWalls(state);
  }
  state.steps++; state.time = state.steps * FIXED_STEP;
}

/** Fixed-time, spatial-hash contact model; collision times have finite-step error. */
export function advanceGas(state, delta) {
  checkState(state); finiteRange(delta, 0, .25, 'delta');
  state.accumulator += delta;
  const count = Math.floor((state.accumulator + 1e-12) / FIXED_STEP);
  for (let i = 0; i < count; i++) fixedTick(state);
  state.accumulator = Math.max(0, state.accumulator - count * FIXED_STEP);
  return count;
}

export function reverseGas(state) {
  checkState(state);
  for (let i = 0; i < state.velocities.length; i++) state.velocities[i] *= -1;
  state.wallMomentum = state.wallMomentum.map(x => -x);
  state.initialMomentum = state.initialMomentum.map(x => -x);
}
