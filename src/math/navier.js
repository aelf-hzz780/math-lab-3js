const TAU = Math.PI * 2;

function finiteRange(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${label} must be finite and in [${min}, ${max}]`);
}

/** Finite geometric deformation; only the stretch factor has determinant one. */
export function spindleScales({ concentration, stretch }) {
  finiteRange(concentration, 0, .9, 'concentration');
  finiteRange(stretch, .65, 1.6, 'stretch');
  return { radial: (1 - .6 * concentration) / Math.sqrt(stretch), axial: stretch * (1 + .25 * concentration) };
}

/** A capped relative angular-rate indicator, not velocity from the 2026 proof. */
export function angularRate(shell, concentration) {
  finiteRange(shell, 0, 1, 'shell');
  finiteRange(concentration, 0, .9, 'concentration');
  const radius = shell * (1 - .6 * concentration);
  return 1 / (.24 + radius * radius);
}

export function concentrationAt(time, base, loop = true) {
  finiteRange(time, 0, Number.MAX_VALUE, 'time');
  finiteRange(base, 0, .9, 'concentration');
  if (typeof loop !== 'boolean') throw new TypeError('loop must be boolean');
  const amplitude = Math.min(.18, base, .9 - base);
  return loop ? base + amplitude * Math.sin(TAU * (time % 18) / 18) : base;
}

/** Open spiral on a spindle envelope. The two endpoints are visualization cuts. */
export function spindlePoint(u, shell, phase, params) {
  finiteRange(u, 0, 1, 'u');
  finiteRange(shell, .01, 1, 'shell');
  if (!Number.isFinite(phase)) throw new RangeError('phase must be finite');
  finiteRange(params?.winding, .3, 2.6, 'winding');
  const scale = spindleScales(params);
  const envelope = .14 + 3.55 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .82);
  const radius = shell * envelope * scale.radial;
  const angle = phase + TAU * params.winding * (.68 + .52 * (1 - shell)) * (u - .5) + .35 * Math.sin(TAU * u);
  return [radius * Math.cos(angle), 5.6 * (2 * u - 1) * scale.axial, radius * Math.sin(angle)];
}
