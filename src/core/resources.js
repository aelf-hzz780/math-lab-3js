export function disposeGroup(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {})) if (uniform?.value?.isTexture) textures.add(uniform.value);
    }
  });
  textures.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  geometries.forEach(value => value.dispose());
  group.removeFromParent();
}

export function seededRandom(seed = 42) {
  let state = Number(seed) >>> 0;
  return () => { state += 0x6D2B79F5; let t=state; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}

export function assertFinite(value, name = 'value') {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}
