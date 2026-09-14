export const catalog = [
  {id:'navier',title:'N–S · 涡旋之心',en:'Inside the vortex',section:'NEW / SEPTEMBER 2026',type:'几何机制示意',icon:'vortex'},
  {id:'vortex',title:'有限核涡旋',en:'Vortex dynamics',section:'01 / PHYSICAL WORLDS',type:'解析模型',icon:'vortex'},
  {id:'quantum',title:'量子纠缠',en:'Quantum correlations',type:'概率模型',icon:'quantum'},
  {id:'dunes',title:'风成沙丘',en:'Aeolian landscapes',type:'程序化地形',icon:'dunes'},
  {id:'sparks',title:'火花与轨迹',en:'Particle kinematics',type:'运动模型',icon:'sparks'},
  {id:'ocean',title:'海水与浮力',en:'Ocean & buoyancy',type:'简化物理模型',icon:'ocean'},
  {id:'kissing',title:'11 维接吻构型',en:'604 kissing spheres',section:'02 / NEW CONSTRUCTIONS',type:'高维投影',icon:'kissing'},
  {id:'kakeya',title:'有限域 Kakeya 集',en:'Finite-field Kakeya',type:'精确离散构造',icon:'kakeya'},
  {id:'maxcut',title:'AI 图构造',en:'MAX-4-CUT gadget',type:'论文原始边表',icon:'maxcut'},
  {id:'hat',title:'Hat 非周期铺砌',en:'Aperiodic monotile',type:'正式替换规则',icon:'hat'},
  {id:'real-kakeya',title:'实数三维 Kakeya',en:'Every direction in space',section:'03 / FIELDS MEDAL 2026',type:'有限管束教学模型',icon:'vortex'},
  {id:'boltzmann',title:'碰撞如何成为气体',en:'From collisions to gas',type:'硬球与碰撞历史',icon:'sparks'},
  {id:'torus-knot',title:'环面结与扭曲度',en:'Knots & distortion',type:'拓扑与数值测量',icon:'quantum'},
  {id:'moduli',title:'复环面与模空间',en:'A universe of tori',type:'g = 1 教学切片',icon:'hat'},
  {id:'noperthedron',title:'穿不过自己的多面体',en:'The impossible passage',section:'04 / NEW GEOMETRY 2025–26',type:'原始坐标与投影测试',icon:'maxcut'},
  {id:'e8',title:'E8 · 八维对称',en:'240 roots of symmetry',section:'05 / FIELDS MEDAL 2022',type:'精确根系的三维投影',icon:'kissing'},
  {id:'matroid',title:'拟阵与 Lorentzian',en:'The shape of independence',type:'组合结构与多项式',icon:'maxcut'},
  {id:'iridescent-terrain',title:'虹彩异境',en:'Iridescent strata',section:'06 / PROCEDURAL WORLDS',type:'三维密度场 · 程序化图形',icon:'dunes'},
];

const paths = {
  vortex:'M15 2C0 10 29 10 8 17s16 9 6 13M22 2C8 9 30 16 10 20s16 6 12 10M8 1C3 8 26 6 17 14S3 24 13 30',
  quantum:'M2 17C7-3 10 31 16 15S24 1 30 17M2 17c8 23 13-23 28 0M16 2v29',
  dunes:'M1 24 12 10l11 14 8-9M1 28l12-13 10 12M12 10l-2 18',
  sparks:'M16 13 4 1m14 14 10-8M14 17 1 20m14 0-7 11m12-13 11 9M16 13l2 6-5-2Z',
  ocean:'M1 12q5-5 10 0t10 0t10 0M1 20q5-5 10 0t10 0t10 0M1 28q5-5 10 0t10 0t10 0',
  kissing:'M16 2a14 14 0 1 0 0 28 14 14 0 1 0 0-28M16 2c-13 8-13 20 0 28 13-8 13-20 0-28M2 16h28M5 7l22 18M5 25 27 7',
  kakeya:'M3 5h26M3 12h26M3 19h26M3 26h26M5 3v26M12 3v26M19 3v26M26 3v26M5 26 26 5',
  maxcut:'M4 10 18 2l11 16-10 12L3 23 4 10l25 8L3 23 18 2l1 28M4 10l15 20',
  hat:'M3 10h7l3-6 7 4v7l7 4-4 7-7-4-6 3-3-6H1l2-9Z',
};
export function iconSvg(key) {return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${paths[key]}"/></svg>`;}
export function loadExperiment(id) {
  if(!catalog.some(item=>item.id===id))throw new RangeError('Unknown experiment');
  return import(`./experiments/${id}.js`);
}
