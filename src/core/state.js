export function validateParameters(definitions, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Parameters must be an object');
  const output = {};
  for (const parameter of definitions) {
    const value = input[parameter.key] ?? parameter.value;
    if (parameter.type === 'select') {
      if (!parameter.options.some(option => option.value === value)) throw new RangeError(`Invalid ${parameter.key}`);
    } else if (!Number.isFinite(value) || value < parameter.min || value > parameter.max) {
      throw new RangeError(`Invalid ${parameter.key}`);
    }
    output[parameter.key] = value;
  }
  return output;
}

export class SimulationClock {
  time = 0;
  paused = false;
  visible = true;
  tick(delta) {
    if (this.paused || !this.visible) return 0;
    const step = Math.min(.05, Math.max(0, Number.isFinite(delta) ? delta : 0));
    this.time += step;
    return step;
  }
  reset() { this.time = 0; }
}
