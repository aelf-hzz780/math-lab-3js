import * as THREE from '../../vendor/three.module.js';
import { disposeGroup } from '../core/resources.js';
import { validateParameters } from '../core/state.js';
import { createRealTubes, estimateTubeUnion, capsuleVolume } from '../math/real-kakeya.js';

export const definition = {
  id: 'real-kakeya', title: 'Kakeya · 万向光束', enTitle: 'EVERY DIRECTION / REAL SPACE', kicker: 'FIELDS MEDAL 2026 · HONG WANG', year: '2025 论文 · 2026 菲尔兹奖', category: '获奖研究的几何实验',
  description: '让光束指向越来越多的方向，再试着把它们挤进同一个空间。每一束都一样长；重叠的地方，藏着一个百年几何问题。',
  formula: 'Tδ(a,v) = {x ∈ ℝ³ : dist(x, a + [−½,½]v) ≤ δ}\n|v| = 1    V̂ = Vbox · Ninside / Nsample\n2025 定理：dimH K = dimM K = 3（K ⊂ ℝ³ 为 Kakeya 集）',
  explanation: '每根管是单位线段的 δ 邻域，含半球端帽；一根管代表一个无向方向，使用上半球的有限均匀采样。金色管是正在观察的方向。移动管的中心不改变长度与方向。体积使用固定 Halton 采样估计，重叠倍率是各管体积之和除以估计并集体积。王虹与 Joshua Zahl 的 2025 论文证明三维实数 Kakeya 集的 Hausdorff 与 Minkowski 维数均为 3；王虹获 2026 菲尔兹奖。本实验用有限管束解释问题中的几何量，和另一项有限域模运算实验是不同对象。',
  limitations: '这里只采样有限方向，显示的是有限半径管束；不是一个包含全部方向的无限 Kakeya 集，不构成新极值构造、反例或定理证明。有限体积估计不能推出 Hausdorff 维数，也不能把“维数 3”理解为“必须有正体积”。Halton 求积存在离散误差，尤其在很细的管径下；画面模型长度统一为 1。',
  parameters: [
    { key: 'count', label: '采样方向数', type: 'select', value: 96, options: [{ value: 48, label: '48 个方向' }, { value: 96, label: '96 个方向' }, { value: 144, label: '144 个方向' }] },
    { key: 'layout', label: '管束组织方式', type: 'select', value: 'hairbrush', options: [{ value: 'bush', label: '中心花束' }, { value: 'hairbrush', label: '沿轴展开' }, { value: 'sheets', label: '分层交织' }] },
    { key: 'packing', label: '中心展开程度', type: 'range', min: 0, max: 1, step: .01, value: .38 },
    { key: 'radius', label: '管半径 δ', type: 'range', min: .012, max: .075, step: .001, value: .027 },
    { key: 'direction', label: '选中的方向', type: 'range', min: 0, max: 1, step: .001, value: .22 },
    { key: 'scan', label: '方向扫描速度', type: 'range', min: 0, max: 1, step: .01, value: .12 }
  ],
  presets: [
    { label: '万向星芒', params: { count: 96, layout: 'bush', packing: .05, radius: .021, direction: .22, scan: .12 } },
    { label: '光的织体', params: { count: 144, layout: 'sheets', packing: .72, radius: .027, direction: .4, scan: .12 } },
    { label: '挤进一点', params: { count: 144, layout: 'hairbrush', packing: 0, radius: .014, direction: .65, scan: .18 } }
  ],
  actions: [{ key: 'next', label: '追踪下一束' }, { key: 'axis', label: '沿当前方向看' }],
  sources: [
    { label: 'IMU · 2026 Fields Medal 官方名单与王虹颁奖词', url: 'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026' },
    { label: 'Wang–Zahl · 三维 Kakeya 论文（2025）', url: 'https://arxiv.org/abs/2502.17655' }
  ]
};

const SCALE = 8;
function colorFor(direction) {
  return new THREE.Color().setHSL(.46 + .25 * direction[1], .72, .48 + .13 * Math.abs(direction[0]));
}

export function createExperiment(ctx) {
  let params = validateParameters(definition.parameters, ctx.params), seed = ctx.seed ?? 42;
  let group, model, estimate, bodies, selectedBody, selectedCaps, runners, runnerPositions, index = 0, scanClock = 0, elapsed = 0;
  const low = ctx.quality === 'low', object = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();

  function orient(mesh, tube, radius) {
    mesh.position.fromArray(tube.center).multiplyScalar(SCALE);
    direction.fromArray(tube.direction); mesh.quaternion.setFromUnitVectors(up, direction); mesh.scale.set(radius * SCALE, SCALE, radius * SCALE);
  }

  function metrics() {
    const summedVolume = model.length * capsuleVolume(params.radius);
    ctx.onMetrics({ '有限方向': `${model.length} 个`, '管半径 δ': params.radius.toFixed(3), '并集体积估计': `≈ ${estimate.volume.toFixed(3)}`, '重叠倍率估计': `≈ ${(summedVolume / Math.max(1e-12, estimate.volume)).toFixed(2)} ×` });
  }

  function highlight() {
    const tube = model[index]; orient(selectedBody, tube, params.radius * 1.13);
    [tube.start, tube.end].forEach((point, i) => { object.position.fromArray(point).multiplyScalar(SCALE); object.quaternion.identity(); object.scale.setScalar(params.radius * SCALE * 1.13); object.updateMatrix(); selectedCaps.setMatrixAt(i, object.matrix); });
    selectedCaps.instanceMatrix.needsUpdate = true;
  }

  function build() {
    if (group) disposeGroup(group); group = new THREE.Group(); ctx.scene.add(group);
    model = createRealTubes({ count: params.count, packing: params.packing, layout: params.layout, seed });
    estimate = estimateTubeUnion(model, params.radius, low ? 4096 : 12288);
    const shaft = new THREE.CylinderGeometry(1, 1, 1, low ? 8 : 12, 1, true);
    const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .18, metalness: .3, clearcoat: 1, emissive: 0x3a8c98, emissiveIntensity: .55, transparent: true, opacity: .46, depthWrite: false });
    bodies = new THREE.InstancedMesh(shaft, material, model.length); group.add(bodies);
    const cap = new THREE.InstancedMesh(new THREE.SphereGeometry(1, low ? 8 : 12, 8), material, model.length * 2); group.add(cap);
    const linePositions = [], lineColors = [], runnerColors = new Float32Array(model.length * 4 * 3);
    for (let i = 0; i < model.length; i++) {
      const tube = model[i], color = colorFor(tube.direction);
      orient(object, tube, params.radius); object.updateMatrix(); bodies.setMatrixAt(i, object.matrix); bodies.setColorAt(i, color);
      for (let side = 0; side < 2; side++) {
        const point = side ? tube.end : tube.start;
        object.position.fromArray(point).multiplyScalar(SCALE); object.quaternion.identity(); object.scale.setScalar(params.radius * SCALE); object.updateMatrix(); cap.setMatrixAt(i * 2 + side, object.matrix); cap.setColorAt(i * 2 + side, color);
        linePositions.push(...point.map(x => x * SCALE)); lineColors.push(color.r * .8, color.g * .8, color.b * .8);
      }
      for (let j = 0; j < 4; j++) color.toArray(runnerColors, (i * 4 + j) * 3);
    }
    const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3)); lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    group.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .62, blending: THREE.AdditiveBlending, depthWrite: false })));
    const selectedMaterial = new THREE.MeshStandardMaterial({ color: 0xffd178, emissive: 0xffa848, emissiveIntensity: .9, roughness: .2, metalness: .35 });
    selectedBody = new THREE.Mesh(shaft, selectedMaterial); group.add(selectedBody);
    selectedCaps = new THREE.InstancedMesh(cap.geometry, selectedMaterial, 2); group.add(selectedCaps);
    runnerPositions = new Float32Array(model.length * 4 * 3);
    const runnerGeometry = new THREE.BufferGeometry(); runnerGeometry.setAttribute('position', new THREE.BufferAttribute(runnerPositions, 3).setUsage(THREE.DynamicDrawUsage)); runnerGeometry.setAttribute('color', new THREE.BufferAttribute(runnerColors, 3));
    runners = new THREE.Points(runnerGeometry, new THREE.ShaderMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(120./-p.z,1.8,9.);}',
      fragmentShader: 'varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vColor*2.4,exp(-4.*r*r)*smoothstep(1.,.6,r));}'
    })); runners.frustumCulled = false; group.add(runners);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(5.6, .014, 6, 160), new THREE.MeshBasicMaterial({ color: 0x3081a3, transparent: true, opacity: .48 })); halo.rotation.x = Math.PI / 2; halo.position.y = -4.9; group.add(halo);
    const floor = new THREE.GridHelper(15, 30, 0x24506a, 0x132c3e); floor.position.y = -4.92; floor.material.transparent = true; floor.material.opacity = .21; group.add(floor);
    const cyan = new THREE.PointLight(0x57fff2, 70, 24); cyan.position.set(-3, 5, 6); group.add(cyan);
    const violet = new THREE.PointLight(0x9a6fff, 80, 24); violet.position.set(4, 0, -3); group.add(violet);
    index = Math.round(params.direction * (model.length - 1)); highlight(); metrics();
  }

  function update(dt, time) {
    elapsed = time;
    scanClock += dt * params.scan;
    if (scanClock >= .18) { const steps = Math.floor(scanClock / .18); scanClock %= .18; index = (index + steps) % model.length; highlight(); }
    for (let i = 0; i < model.length; i++) {
      const tube = model[i];
      for (let j = 0; j < 4; j++) {
        const t = (time * .18 + j / 4 + i * .61803) % 1;
        for (let k = 0; k < 3; k++) runnerPositions[(i * 4 + j) * 3 + k] = (tube.start[k] + tube.direction[k] * t) * SCALE;
      }
    }
    runners.geometry.attributes.position.needsUpdate = true;
  }

  function setParameters(full) {
    const next = validateParameters(definition.parameters, full);
    const rebuild = ['count', 'layout', 'packing', 'radius'].some(key => next[key] !== params[key]);
    params = next; scanClock = 0;
    if (rebuild) build();
    else { index = Math.round(params.direction * (model.length - 1)); highlight(); }
    update(0, elapsed);
  }

  ctx.setCamera([12, 8.5, 17.5], [0, 0, 0]); build(); update(0, 0);
  return { update, setParameters,
    reset(nextSeed = seed) { seed = nextSeed; elapsed = 0; scanClock = 0; build(); update(0, 0); },
    action(key) {
      if (key === 'next') { index = (index + 1) % model.length; params.direction = index / (model.length - 1); highlight(); return { params: { direction: params.direction } }; }
      if (key === 'axis') { const tube = model[index]; ctx.setCamera(tube.direction.map((v, i) => tube.center[i] * SCALE + v * 21), tube.center.map(v => v * SCALE)); }
    },
    pick(raycaster) { const hit = raycaster.intersectObject(bodies)[0]; if (hit?.instanceId !== undefined) { index = hit.instanceId; params.direction = index / (model.length - 1); highlight(); return { params: { direction: params.direction } }; } },
    dispose() { disposeGroup(group); }
  };
}
