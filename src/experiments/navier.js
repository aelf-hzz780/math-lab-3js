import * as THREE from '../../vendor/three.module.js';
import { disposeGroup, seededRandom } from '../core/resources.js';
import { validateParameters } from '../core/state.js';
import { spindlePoint, spindleScales, angularRate, concentrationAt } from '../math/navier.js';

export const definition = {
  id: 'navier', title: 'N–S · 涡旋之心', enTitle: 'NAVIER–STOKES / VORTEX STUDY',
  kicker: 'THE SHAPE OF FLOW', year: '2026 · 研究机制示意', category: '研究焦点',
  description: '青绿的流管向内卷入，琥珀色的内层转得更快。走进一枚不断拉伸、收拢的三维涡旋，观察那些让流体数学如此迷人的形态。',
  formula: 'x = ρR(u)cosΘ / √λ    z = ρR(u)sinΘ / √λ\ny = 5.6λ(1 + c/4)(2u − 1)    ρ = 1 − 0.6c\nR(u) = s[0.14 + 3.55sin(πu)^0.82]    0 ≤ c ≤ 0.9',
  explanation: '这件参数化雕塑对应「径向收拢、旋转、轴向拉伸」三种几何变化。外层为青绿，内层为琥珀，颜色与有界的相对角速度指标相连；光点沿有限流管循环。拉伸 λ 单独作用时，横向按 1/√λ 缩放，纵向按 λ 缩放。核心集中 c 则是独立的几何演示参数。OpenAI 在 2026-09-08 的公告中声明完成光滑外力下有限时间奇点的分析证明及 Lean 形式化，并描述向内螺旋、轴向拉伸的涡旋。这里重建的是这一机制和参考截图中的纺锤形流管视觉。',
  limitations: '有限参数几何示意，不是 Navier–Stokes 数值求解器，也不是公告证明或原始速度场的复现。收缩始终有下界；循环接头是显示截断。不能从此图推出奇点、有限能量或完整流场的不可压缩性。截图中的 GPT6 ASTRA 面板属于社媒视觉参考，不视为官方计算数据。Clay 状态仅按 2026-09-09 的核验记录标为 Unsolved。',
  parameters: [
    { key: 'view', label: '画面层次', type: 'select', value: 'sculpture', options: [{ value: 'sculpture', label: '流管雕塑' }, { value: 'tracers', label: '光点与流线' }] },
    { key: 'motion', label: '收缩方式', type: 'select', value: 'loop', options: [{ value: 'loop', label: '呼吸循环' }, { value: 'steady', label: '固定形态' }] },
    { key: 'concentration', label: '核心集中 c', type: 'range', min: 0, max: .9, step: .01, value: .24 },
    { key: 'stretch', label: '轴向拉伸 λ', type: 'range', min: .65, max: 1.6, step: .05, value: 1 },
    { key: 'winding', label: '缠绕程度', type: 'range', min: .3, max: 2.6, step: .05, value: 1.15 },
    { key: 'speed', label: '流动速度', type: 'range', min: .15, max: 2, step: .05, value: .7 }
  ],
  presets: [
    { label: '经典纺锤', params: { concentration: .24, stretch: 1, winding: 1.15, motion: 'loop', view: 'sculpture', speed: .7 } },
    { label: '集中与拉伸', params: { concentration: .72, stretch: 1.25, winding: 1.8, motion: 'steady', view: 'sculpture', speed: 1 } },
    { label: '舒展涡旋', params: { concentration: .08, stretch: .75, winding: .55, motion: 'loop', view: 'sculpture', speed: .5 } }
  ],
  actions: [{ key: 'top', label: '沿轴心看' }],
  sources: [
    { label: '2026-09-08 · OpenAI 研究公告与原图说明', url: 'https://openai.com/index/navier-stokes-solution/' },
    { label: 'Clay Mathematics Institute · 问题与状态', url: 'https://www.claymath.org/millennium/navier-stokes-equation/' }
  ]
};

const TAU = Math.PI * 2;
const PRESETS = Object.fromEntries(['iconic', 'concentrate', 'unfurl'].map((key, i) => [key, definition.presets[i].params]));

function buildTubeGeometry(paths, segments, sides) {
  const positions = [], normals = [], colors = [], indices = [];
  const tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
  const vertex = new THREE.Vector3(), surfaceNormal = new THREE.Vector3();
  for (const path of paths) {
    const offset = positions.length / 3;
    for (let j = 0; j <= segments; j++) {
      const u = j / segments, p = path.points[j];
      tangent.subVectors(path.points[Math.min(j + 1, segments)], path.points[Math.max(0, j - 1)]).normalize();
      normal.set(p.x, 0, p.z).normalize().addScaledVector(tangent, -normal.dot(tangent)).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      const taper = .12 + .88 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .32);
      const width = (.03 + path.shell * .033) * taper, thickness = width * .52;
      for (let side = 0; side < sides; side++) {
        const a = side / sides * TAU, cosine = Math.cos(a), sine = Math.sin(a);
        vertex.copy(p).addScaledVector(normal, width * cosine).addScaledVector(binormal, thickness * sine);
        surfaceNormal.copy(normal).multiplyScalar(cosine / width).addScaledVector(binormal, sine / thickness).normalize();
        positions.push(vertex.x, vertex.y, vertex.z); normals.push(surfaceNormal.x, surfaceNormal.y, surfaceNormal.z);
        const light = .72 + .28 * Math.sin(Math.PI * u);
        colors.push(path.color.r * light, path.color.g * light, path.color.b * light);
        if (j < segments) {
          const a0 = offset + j * sides + side, a1 = offset + j * sides + (side + 1) % sides;
          indices.push(a0, a1, a0 + sides, a1, a1 + sides, a0 + sides);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  return geometry;
}

function makeTracers(paths, perPath, trailLength, random) {
  const count = paths.length * perPath * trailLength, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), seeds = [];
  let i = 0;
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    const path = paths[pathIndex];
    for (let j = 0; j < perPath; j++) {
      const phase = (j + random()) / perPath;
      for (let tail = 0; tail < trailLength; tail++) {
        seeds.push({ pathIndex, phase, tail });
        const brightness = 1.9 * Math.pow(1 - tail / trailLength, 1.5);
        colors.set([path.color.r * brightness, path.color.g * brightness, path.color.b * brightness], i * 3); i++;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(92.0/-p.z,1.4,8.0);}',
    fragmentShader: 'varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*4.)*smoothstep(1.,.65,r);gl_FragColor=vec4(vColor*1.7,a);}'
  }));
  points.frustumCulled = false;
  return { points, positions, seeds };
}

function makeAmbientDust(random, count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = random() * TAU, r = 5.5 + random() * 4;
    positions.set([Math.cos(a) * r, (random() - .5) * 17, Math.sin(a) * r], i * 3);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x4aaea5, size: .024, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending }));
}

export function createExperiment(ctx) {
  let params = validateParameters(definition.parameters, ctx.params), seed = ctx.seed ?? 42;
  let group, sculpture, tubes, thinLines, paths, tracers, dust, lastMetric = -1;
  const low = ctx.quality === 'low', count = low ? 56 : 96, segments = low ? 108 : 156;

  function camera(top = false) {
    const framing = Math.max(.88, spindleScales(params).axial * .9);
    ctx.setCamera(top ? [0, 19 * framing, .2] : [11.4 * framing, 3.1 * framing, 17.5 * framing], [0, 0, 0]);
  }

  function build() {
    if (group) disposeGroup(group);
    group = new THREE.Group(); ctx.scene.add(group);
    sculpture = new THREE.Group(); sculpture.rotation.z = -.12; group.add(sculpture);
    const random = seededRandom(seed); paths = [];
    const linePositions = [], lineColors = [];
    for (let i = 0; i < count; i++) {
      const shell = .28 + .72 * Math.sqrt((i + .5) / count);
      const phase = i * Math.PI * (3 - Math.sqrt(5)) + (random() - .5) * .11;
      const warm = angularRate(shell, .24) > 1.65;
      const color = new THREE.Color(warm ? '#ffbd61' : '#43d5c2');
      if (!warm) color.lerp(new THREE.Color('#127d99'), (i % 7) / 10);
      const points = [];
      for (let j = 0; j <= segments; j++) points.push(new THREE.Vector3(...spindlePoint(j / segments, shell, phase, { ...params, concentration: 0, stretch: 1 })));
      paths.push({ shell, phase, points, color });
      for (let j = 0; j < segments; j++) {
        linePositions.push(...points[j], ...points[j + 1]);
        for (let end = 0; end < 2; end++) lineColors.push(color.r, color.g, color.b);
      }
    }
    tubes = new THREE.Mesh(buildTubeGeometry(paths, segments, low ? 5 : 7), new THREE.MeshStandardMaterial({
      vertexColors: true, metalness: .52, roughness: .27, emissive: 0x032a28, emissiveIntensity: .32, side: THREE.DoubleSide
    })); sculpture.add(tubes);
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    linesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    thinLines = new THREE.LineSegments(linesGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .24, depthWrite: false, blending: THREE.AdditiveBlending })); sculpture.add(thinLines);
    tracers = makeTracers(paths, low ? 3 : 5, low ? 3 : 5, random); sculpture.add(tracers.points);
    dust = makeAmbientDust(random, low ? 120 : 240); group.add(dust);
    const cool = new THREE.PointLight(0x9cfff0, 140, 35, 2); cool.position.set(5, 4, 6); group.add(cool);
    const gold = new THREE.PointLight(0xffb15e, 180, 35, 2); gold.position.set(-6, 1, 4); group.add(gold);
    const rim = new THREE.PointLight(0x399bdc, 180, 35, 2); rim.position.set(1, 2, -6); group.add(rim);
    lastMetric = -1; applyVisibility();
  }

  function applyVisibility() {
    tubes.visible = params.view === 'sculpture';
    thinLines.material.opacity = params.view === 'sculpture' ? .1 : .4;
  }

  function update(dt, time) {
    const concentration = concentrationAt(time, params.concentration, params.motion === 'loop');
    const scales = spindleScales({ ...params, concentration });
    sculpture.scale.set(scales.radial, scales.axial, scales.radial);
    dust.rotation.y = time * .008;
    for (let i = 0; i < tracers.seeds.length; i++) {
      const tracer = tracers.seeds[i], path = paths[tracer.pathIndex];
      const speed = .035 * params.speed * angularRate(path.shell, params.concentration);
      const u = ((tracer.phase + time * speed - tracer.tail * .0028) % 1 + 1) % 1;
      const index = u * segments, j = Math.floor(index), fraction = index - j;
      const a = path.points[j], b = path.points[Math.min(segments, j + 1)];
      const x = a.x + (b.x - a.x) * fraction, z = a.z + (b.z - a.z) * fraction;
      const surface = 1 + .07 / Math.hypot(x, z);
      tracers.positions[i * 3] = x * surface;
      tracers.positions[i * 3 + 1] = a.y + (b.y - a.y) * fraction;
      tracers.positions[i * 3 + 2] = z * surface;
    }
    tracers.points.geometry.attributes.position.needsUpdate = true;
    if (Math.floor(time * 3) !== lastMetric) {
      lastMetric = Math.floor(time * 3);
      ctx.onMetrics({ '流管': `${count} 根`, '径向比例': `${scales.radial.toFixed(2)} ×`, '轴向比例': `${scales.axial.toFixed(2)} ×`, '当前集中 c': concentration.toFixed(2), '模型': '有限几何示意' });
    }
  }

  function setParameters(fullParams) {
    const next = validateParameters(definition.parameters, fullParams), needsGeometry = next.winding !== params.winding;
    params = next;
    if (needsGeometry) build();
    applyVisibility(); camera(); lastMetric = -1; update(0, 0);
  }

  build(); camera(); update(0, 0);
  return {
    update, setParameters,
    reset(nextSeed) { seed = nextSeed ?? seed; build(); camera(); update(0, 0); },
    dispose() { disposeGroup(group); },
    action(key) {
      if (key === 'top') { camera(true); return; }
      if (PRESETS[key]) { setParameters({ ...params, ...PRESETS[key] }); return { params: { ...params } }; }
    }
  };
}
