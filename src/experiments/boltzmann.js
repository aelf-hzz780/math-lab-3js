import * as THREE from '../../vendor/three.module.js';
import { disposeGroup } from '../core/resources.js';
import { validateParameters } from '../core/state.js';
import { createGas, advanceGas, kineticEnergy, conservedMomentum, reverseGas } from '../math/boltzmann.js';

export const definition = {
  id: 'boltzmann', title: 'Boltzmann · 碰撞的记忆', enTitle: 'FROM PARTICLES TO PATTERNS', kicker: 'FIELDS MEDAL 2026 · YU DENG', year: '2024—2025 论文 · 2026 菲尔兹奖', category: '获奖研究的动力学实验',
  description: '左边，每颗发光小球只遵循一次次弹性碰撞。右边，相遇被编织成有方向的记忆网络：微观事件，如何连接成宏观规律。',
  formula: 'vᵢ′ = vᵢ − [(vᵢ − vⱼ)·n]n    vⱼ′ = vⱼ + [(vᵢ − vⱼ)·n]n\nE = ½Σ|vᵢ|²    Pgas + Pwall = constant\n固定步长 Δt = 1/240 s（必要时细分）',
  explanation: '球具有相同质量和半径，运动在反射壁立方体内；碰撞只交换法向速度，墙面承担反向动量。颜色区分粒子，金色光环追踪所选粒子。右侧每个节点是一场真实模拟碰撞，连线连接同一粒子的前后碰撞，水平方向表示时间。邓煜与 Zaher Hani、Xiao Ma 的研究严格连接硬球系统与 Boltzmann 方程，论文还引入称为 molecules 的碰撞历史组合图及切割算法。这里提供微观运动和普通碰撞事件图作为入门，不复制该算法。为使首帧可观察，固定 seed 先演化 2.4 模型秒；重置重复相同过程。',
  limitations: '有限数量、有限时间步的弹性硬球教学模型，不是 Boltzmann–Grad 极限、分子混沌证明或完整的论文 molecules。接触时刻与位置存在步长误差，重叠用局部修正处理；能量与含墙面交换的动量按弹性规则守恒。反转速度用于实验，不保证有限步算法逐帧严格可逆。历史只显示最近指定数量的碰撞，超出窗口的父节点连线省略。图的布局不是粒子的空间位置。',
  parameters: [
    { key: 'count', label: '硬球数量', type: 'select', value: 64, options: [{ value: 32, label: '32 颗' }, { value: 64, label: '64 颗' }, { value: 96, label: '96 颗' }] },
    { key: 'temperature', label: '初始温度 T（模型单位）', type: 'range', min: .35, max: 2.4, step: .05, value: 1.15 },
    { key: 'radius', label: '硬球半径', type: 'range', min: .12, max: .3, step: .01, value: .24 },
    { key: 'speed', label: '演化速度', type: 'range', min: .2, max: 2, step: .05, value: .75 },
    { key: 'view', label: '观察层次', type: 'select', value: 'both', options: [{ value: 'both', label: '粒子与碰撞记忆' }, { value: 'gas', label: '进入微观世界' }, { value: 'history', label: '只看碰撞记忆' }] },
    { key: 'history', label: '碰撞记忆窗口', type: 'select', value: 64, options: [{ value: 24, label: '最近 24 次' }, { value: 64, label: '最近 64 次' }, { value: 96, label: '最近 96 次' }] },
    { key: 'tracked', label: '追踪粒子', type: 'range', min: 0, max: 1, step: .001, value: .12 }
  ],
  presets: [
    { label: '看见记忆', params: { count: 64, temperature: 1.15, radius: .24, speed: .75, view: 'both', history: 64, tracked: .12 } },
    { label: '热闹的气体', params: { count: 96, temperature: 1.8, radius: .28, speed: .65, view: 'gas', history: 96, tracked: .4 } },
    { label: '因果星图', params: { count: 64, temperature: 1.5, radius: .28, speed: .6, view: 'history', history: 96, tracked: .66 } }
  ],
  actions: [{ key: 'collision', label: '推进至下一次碰撞' }, { key: 'reverse', label: '反转全部速度' }],
  sources: [
    { label: 'IMU · 2026 Fields Medal 官方名单与邓煜颁奖词', url: 'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026' },
    { label: 'Deng–Hani–Ma · 硬球到 Boltzmann（v3, 2025）', url: 'https://arxiv.org/abs/2408.07818v3' },
    { label: 'Deng–Hani–Ma · 从牛顿力学到流体方程（2025）', url: 'https://arxiv.org/abs/2503.01800' }
  ]
};

const HALF_SIZE = 2.7, HISTORY_CAPACITY = 96;
const PALETTE = [0x53efd6, 0xffbd63, 0xa887ff].map(value => new THREE.Color(value));

function label(text, width = 5.5, color = '#91bdbb') {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 72;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable for experiment labels');
  context.clearRect(0, 0, 640, 72); context.fillStyle = color; context.font = '500 24px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 320, 36);
  const texture = new THREE.CanvasTexture(canvas), sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width, width * 72 / 640, 1); return sprite;
}

function frameBox(group, size, color) {
  const box = new THREE.BoxGeometry(...size), edges = new THREE.EdgesGeometry(box); box.dispose();
  const frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .38 })); group.add(frame);
}

export function createExperiment(ctx) {
  let params = validateParameters(definition.parameters, ctx.params), seed = ctx.seed ?? 42;
  let group, gasGroup, graphGroup, gas, spheres, marker, velocityLines, velocityPositions, eventNodes, eventEdges, edgePositions, edgeColors, collisionHalo;
  let shownEvents = [], graphPositions = new Map(), lastGraphId = -1, lastMetric = -1;
  const low = ctx.quality === 'low', object = new THREE.Object3D(), color = new THREE.Color();

  function trackedIndex() { return Math.round(params.tracked * (gas.count - 1)); }

  function resetGas() {
    gas = createGas({ count: params.count, radius: params.radius, halfSize: HALF_SIZE, temperature: params.temperature, seed, historyCapacity: HISTORY_CAPACITY });
    for (let i = 0; i < 24; i++) advanceGas(gas, .1);
    lastGraphId = -1; lastMetric = -1;
  }

  function applyView() {
    gasGroup.visible = params.view !== 'history'; graphGroup.visible = params.view !== 'gas';
    gasGroup.position.set(params.view === 'both' ? -4.15 : 0, 0, 0);
    graphGroup.position.set(params.view === 'both' ? 4.25 : 0, 0, 0);
    ctx.setCamera(params.view === 'both' ? [14.5, 8.5, 22] : params.view === 'gas' ? [9, 6.5, 11] : [9, 6, 12], [0, 0, 0]);
  }

  function build() {
    if (group) disposeGroup(group); group = new THREE.Group(); ctx.scene.add(group);
    gasGroup = new THREE.Group(); graphGroup = new THREE.Group(); group.add(gasGroup, graphGroup);
    resetGas();
    spheres = new THREE.InstancedMesh(new THREE.SphereGeometry(1, low ? 10 : 18, low ? 8 : 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .22, roughness: .16, clearcoat: 1, emissive: 0x217e80, emissiveIntensity: .55 }), gas.count); spheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gasGroup.add(spheres);
    spheres.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.sqrt(3) * HALF_SIZE);
    frameBox(gasGroup, [HALF_SIZE * 2, HALF_SIZE * 2, HALF_SIZE * 2], 0x448f99);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(HALF_SIZE * 2, HALF_SIZE * 2), new THREE.MeshStandardMaterial({ color: 0x0b2732, roughness: .26, metalness: .45, transparent: true, opacity: .72 })); base.rotation.x = -Math.PI / 2; base.position.y = -HALF_SIZE; gasGroup.add(base);
    const floor = new THREE.GridHelper(HALF_SIZE * 2, 12, 0x287c86, 0x143840); floor.position.y = -HALF_SIZE + .003; floor.material.transparent = true; floor.material.opacity = .35; gasGroup.add(floor);
    const gasLabel = label('01 / MICROSCOPIC MOTION'); gasLabel.position.set(0, 3.22, 0); gasGroup.add(gasLabel);
    marker = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: 0xffe6aa, wireframe: true, transparent: true, opacity: .8 })); gasGroup.add(marker);
    velocityPositions = new Float32Array(gas.count * 6);
    const velocityColors = new Float32Array(gas.count * 6);
    for (let i = 0; i < gas.count; i++) for (let k = 0; k < 3; k++) { const value = PALETTE[i % 3].toArray()[k]; velocityColors[i * 6 + k] = value * .18; velocityColors[i * 6 + 3 + k] = value; }
    const velocityGeometry = new THREE.BufferGeometry(); velocityGeometry.setAttribute('position', new THREE.BufferAttribute(velocityPositions, 3).setUsage(THREE.DynamicDrawUsage)); velocityGeometry.setAttribute('color', new THREE.BufferAttribute(velocityColors, 3));
    velocityLines = new THREE.LineSegments(velocityGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .52, blending: THREE.AdditiveBlending, depthWrite: false })); velocityLines.frustumCulled = false; gasGroup.add(velocityLines);
    collisionHalo = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x8cfff0, wireframe: true, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false }), 8); collisionHalo.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gasGroup.add(collisionHalo);
    eventNodes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, low ? 1 : 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .21, metalness: .25, emissive: 0x498f9c, emissiveIntensity: .9 }), HISTORY_CAPACITY); eventNodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); graphGroup.add(eventNodes);
    collisionHalo.frustumCulled = false;
    eventNodes.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4.5);
    edgePositions = new Float32Array(HISTORY_CAPACITY * 2 * 6); edgeColors = new Float32Array(edgePositions.length);
    const edgeGeometry = new THREE.BufferGeometry(); edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3).setUsage(THREE.DynamicDrawUsage)); edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3).setUsage(THREE.DynamicDrawUsage));
    eventEdges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); eventEdges.frustumCulled = false; graphGroup.add(eventEdges);
    const graphLabel = label('02 / COLLISION MEMORY'); graphLabel.position.set(0, 3.22, 0); graphGroup.add(graphLabel);
    const timeLabel = label('PAST  -------------------->  NOW', 6.1, '#537c89'); timeLabel.position.set(0, -3.02, 0); graphGroup.add(timeLabel);
    const graphFloor = new THREE.GridHelper(6.1, 16, 0x253e66, 0x13253a); graphFloor.position.y = -2.72; graphFloor.material.transparent = true; graphFloor.material.opacity = .4; graphGroup.add(graphFloor);
    const cool = new THREE.PointLight(0x59ffdd, 85, 22); cool.position.set(-6, 4, 5); group.add(cool);
    const warm = new THREE.PointLight(0xc49aff, 100, 22); warm.position.set(6, 3, 5); group.add(warm);
    applyView(); drawState();
  }

  function drawGraph() {
    shownEvents = gas.history.slice(-params.history); graphPositions = new Map();
    const minTime = shownEvents[0]?.time ?? 0, maxTime = shownEvents.at(-1)?.time ?? 1, duration = Math.max(.05, maxTime - minTime), selected = trackedIndex();
    for (let i = 0; i < shownEvents.length; i++) {
      const event = shownEvents[i], highlight = event.a === selected || event.b === selected;
      const position = [(event.time - minTime) / duration * 5.7 - 2.85, ((event.a * .6180339) % 1 - .5) * 4.6, ((event.b * .7548776) % 1 - .5) * 3.65];
      graphPositions.set(event.id, position);
      object.position.fromArray(position); object.quaternion.identity(); object.scale.setScalar(highlight ? .145 : .07 + .037 * (i + 1) / shownEvents.length); object.updateMatrix(); eventNodes.setMatrixAt(i, object.matrix);
      color.copy(highlight ? new THREE.Color(0xffd47b) : PALETTE[event.a % 3]).multiplyScalar(highlight ? 1.5 : .7 + .5 * i / shownEvents.length); eventNodes.setColorAt(i, color);
    }
    eventNodes.count = shownEvents.length; eventNodes.instanceMatrix.needsUpdate = true;
    if (eventNodes.instanceColor) eventNodes.instanceColor.needsUpdate = true;
    let edgeCount = 0;
    for (const event of shownEvents) for (const parentId of event.parents) {
      const parent = graphPositions.get(parentId); if (!parent) continue;
      const position = graphPositions.get(event.id), selectedEdge = event.a === selected || event.b === selected;
      edgePositions.set(parent, edgeCount * 6); edgePositions.set(position, edgeCount * 6 + 3);
      const c = selectedEdge ? new THREE.Color(0xffcc72) : PALETTE[event.a % 3];
      for (let k = 0; k < 3; k++) { const value = c.toArray()[k]; edgeColors[edgeCount * 6 + k] = value * .18; edgeColors[edgeCount * 6 + 3 + k] = value * (selectedEdge ? 1.3 : .8); }
      edgeCount++;
    }
    eventEdges.geometry.setDrawRange(0, edgeCount * 2); eventEdges.geometry.attributes.position.needsUpdate = true; eventEdges.geometry.attributes.color.needsUpdate = true;
    lastGraphId = gas.collisions;
  }

  function metrics() {
    const energyError = Math.abs(kineticEnergy(gas) / gas.initialEnergy - 1), momentum = conservedMomentum(gas), momentumError = Math.hypot(...momentum.map((x, k) => x - gas.initialMomentum[k]));
    ctx.onMetrics({ '硬球 / 记忆节点': `${gas.count} / ${shownEvents.length}`, '粒子碰撞次数': String(gas.collisions), '相对能量误差': energyError.toExponential(1), '含墙面动量误差': momentumError.toExponential(1) });
  }

  function drawState() {
    const selected = trackedIndex(), recent = gas.history.slice(-8);
    for (let i = 0; i < gas.count; i++) {
      object.position.fromArray(gas.positions, i * 3); object.quaternion.identity(); object.scale.setScalar(gas.radius); object.updateMatrix(); spheres.setMatrixAt(i, object.matrix);
      color.copy(PALETTE[i % 3]); if (i === selected) color.set(0xffda85); spheres.setColorAt(i, color);
      for (let k = 0; k < 3; k++) { velocityPositions[i * 6 + k] = gas.positions[i * 3 + k] - gas.velocities[i * 3 + k] * .13; velocityPositions[i * 6 + 3 + k] = gas.positions[i * 3 + k]; }
    }
    spheres.instanceMatrix.needsUpdate = true; spheres.instanceColor.needsUpdate = true;
    velocityLines.geometry.attributes.position.needsUpdate = true;
    marker.position.fromArray(gas.positions, selected * 3); marker.scale.setScalar(gas.radius * 1.35); marker.rotation.y = gas.time * .65;
    for (let i = 0; i < 8; i++) {
      const event = recent[i], age = event ? gas.time - event.time : 1;
      object.position.fromArray(event?.position ?? [0, 0, 0]); object.scale.setScalar(age >= .45 ? 0 : gas.radius * (1.1 + age * 5)); object.updateMatrix(); collisionHalo.setMatrixAt(i, object.matrix);
    }
    collisionHalo.instanceMatrix.needsUpdate = true;
    if (lastGraphId !== gas.collisions) drawGraph();
    if (lastMetric !== Math.floor(gas.time * 3)) { lastMetric = Math.floor(gas.time * 3); metrics(); }
  }

  function update(dt) { if (dt > 0) advanceGas(gas, Math.min(.25, dt * params.speed)); drawState(); }

  function setParameters(full) {
    const next = validateParameters(definition.parameters, full), resetNeeded = ['count', 'temperature', 'radius'].some(key => next[key] !== params[key]), viewChanged = next.view !== params.view;
    params = next;
    if (resetNeeded) build();
    else { if (viewChanged) applyView(); lastGraphId = -1; lastMetric = -1; drawState(); }
  }

  build();
  return { update, setParameters,
    reset(nextSeed = seed) { seed = nextSeed; resetGas(); drawState(); },
    action(key) {
      if (key === 'reverse') reverseGas(gas);
      if (key === 'collision') { const before = gas.collisions; for (let i = 0; i < 480 && gas.collisions === before; i++) advanceGas(gas, 1 / 240); }
      lastMetric = -1; drawState();
    },
    pick(raycaster) {
      const targets = params.view === 'gas' ? [spheres] : params.view === 'history' ? [eventNodes] : [spheres, eventNodes];
      const hit = raycaster.intersectObjects(targets)[0]; if (hit?.instanceId === undefined) return;
      const index = hit.object === spheres ? hit.instanceId : shownEvents[hit.instanceId]?.a;
      if (index === undefined) return;
      params.tracked = index / (gas.count - 1); lastGraphId = -1; lastMetric = -1; drawState(); return { params: { tracked: params.tracked } };
    },
    dispose() { disposeGroup(group); }
  };
}
