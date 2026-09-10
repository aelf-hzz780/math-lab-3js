import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {validateParameters} from '../core/state.js';
import {e8Roots,e8Contacts,projectionBasis8,projectRoots8} from '../math/e8.js';

export const definition={
 id:'e8',title:'E8 · 八维晶格之心',enTitle:'240 ROOTS / EIGHT DIMENSIONS',kicker:'FIELDS 2022 · MARYNA VIAZOVSKA',year:'经典 E8 · 2016 证明 · 2022 Fields',category:'Fields 数学结构',
 description:'240 个最短向量组成八维的对称核心。轻轻转动隐藏的维度，让同一个结构显露不同的星形投影。',
 formula:'R(E₈) = {排列(±1,±1,0⁶)} ∪ {(±½)⁸ : 负号数为偶数}\n|R| = 112 + 128 = 240    ‖r‖² = 2\nrᵢ · rⱼ = 1 ⇔ ‖rᵢ − rⱼ‖² = 2',
 explanation:'青色为 112 个整数根，紫色为 128 个半整数根；金色为选中根，亮青色标记其 56 个最近邻。连线依据原始八维内积精确生成，全图有 6,720 条边；低画质稀疏显示背景边，但完整保留选中点邻接。选择旋转平面会改变八维中的两个坐标，之后由三条正交单位向量投影到三维。E8 晶格是经典对象；Viazovska 在 2016 年证明其给出八维最密等球填充，相关成果获 2022 年 Fields Medal。',
 limitations:'这是 E8 晶格最短向量构成的有限根系，不是完整无限晶格。投影丢失五个维度，画面重叠和距离不代表八维距离；球点半径为显示大小。演示没有复现 Viazovska 的 Fourier 分析最优性证明，也不把 2016 年定理标为 2026 年新发现。',
 parameters:[
  {key:'plane',label:'八维旋转平面',type:'select',value:'03',options:[{value:'03',label:'x₁ ↔ x₄'},{value:'14',label:'x₂ ↔ x₅'},{value:'25',label:'x₃ ↔ x₆'},{value:'36',label:'x₄ ↔ x₇'},{value:'47',label:'x₅ ↔ x₈'}]},
  {key:'angle',label:'初始旋转角 / °',type:'range',min:0,max:360,step:1,value:25},
  {key:'speed',label:'八维旋转速度',type:'range',min:0,max:1,step:.01,value:.17},
  {key:'selected',label:'选中根编号',type:'range',min:0,max:239,step:1,value:126},
  {key:'edges',label:'背景邻接亮度',type:'range',min:0,max:1,step:.05,value:.35},
  {key:'size',label:'根的显示尺度',type:'range',min:.04,max:.16,step:.01,value:.08}
 ],
 presets:[{label:'八维星图',params:{plane:'03',angle:25,speed:.17,selected:126,edges:.35,size:.08}},{label:'邻居的秘密',params:{plane:'25',angle:130,speed:.08,selected:17,edges:.1,size:.1}},{label:'紫晶转生',params:{plane:'47',angle:210,speed:.27,selected:203,edges:.5,size:.07}}],
 actions:[{key:'projection',label:'换一组正交投影'},{key:'neighbor',label:'沿真实邻接游走'}],
 sources:[{label:'IMU · 2022 Fields Medal / Viazovska',url:'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2022'},{label:'Viazovska 2016 · The sphere packing problem in dimension 8',url:'https://arxiv.org/abs/1603.04246'},{label:'Annals of Mathematics · 2017 正式论文',url:'https://annals.math.princeton.edu/2017/185-3/p07'}]
};

export function createExperiment(ctx){
 let params=validateParameters(definition.parameters,ctx.params??{}),seed=ctx.seed??42,basis=projectionBasis8(seed),phase=0,neighbors=[];
 const roots=e8Roots(),edges=e8Contacts(roots),backgroundEdges=ctx.quality==='low'?edges.filter((_,i)=>i%3===0):edges;
 const group=new THREE.Group();ctx.scene.add(group);ctx.setCamera([0,2,14],[0,0,0]);
 const object=new THREE.Object3D(),rootGeometry=new THREE.IcosahedronGeometry(1,ctx.quality==='low'?1:2),rootMaterial=new THREE.MeshPhysicalMaterial({metalness:.25,roughness:.22,clearcoat:1,emissive:0x33878d,emissiveIntensity:.45});
 const cloud=new THREE.InstancedMesh(rootGeometry,rootMaterial,240);cloud.name='e8-roots';cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);cloud.frustumCulled=false;group.add(cloud);
 function makeEdges(count,color,opacity){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6),3).setUsage(THREE.DynamicDrawUsage));const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));lines.frustumCulled=false;group.add(lines);return lines;}
 const contextLines=makeEdges(backgroundEdges.length,0x458bc4,.05),contactLines=makeEdges(56,0x61ffdf,.7);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12),new THREE.MeshBasicMaterial({color:0xffd481,wireframe:true,transparent:true,opacity:.35}));group.add(halo);
 const globe=new THREE.Mesh(new THREE.SphereGeometry(Math.SQRT2*3,28,16),new THREE.MeshBasicMaterial({color:0x3d7792,wireframe:true,transparent:true,opacity:.022,depthWrite:false}));group.add(globe);
 const palette=[new THREE.Color(0x39d8ff),new THREE.Color(0xac6eff),new THREE.Color(0x9affed),new THREE.Color(0xffd084)];
 function refreshSelection(){
  if(!Number.isInteger(params.selected))throw new RangeError('Selected E8 root must be an integer');
  neighbors=edges.filter(([a,b])=>a===params.selected||b===params.selected);const ids=new Set(neighbors.flat());
  roots.forEach((_,i)=>cloud.setColorAt(i,palette[i===params.selected?3:ids.has(i)?2:i<112?0:1]));cloud.instanceColor.needsUpdate=true;
  contextLines.material.opacity=params.edges*.16;
  ctx.onMetrics({'精确根 / 维度':'240 / 8D','选中根邻居':String(neighbors.length),'最近距离²':'2','最密填充密度':'π⁴/384 ≈ 0.25367'});
 }
 function setLines(lines,list,positions){const a=lines.geometry.attributes.position;for(let i=0;i<list.length;i++){const[u,v]=list[i];for(let k=0;k<3;k++){a.array[i*6+k]=positions[u*3+k]*3;a.array[i*6+3+k]=positions[v*3+k]*3;}}a.needsUpdate=true;}
 function render(){const positions=projectRoots8(roots,basis,params.angle*Math.PI/180+phase,params.plane.split('').map(Number));
  for(let i=0;i<240;i++){object.position.fromArray(positions,i*3).multiplyScalar(3);object.scale.setScalar(params.size*(i===params.selected?1.65:1));object.updateMatrix();cloud.setMatrixAt(i,object.matrix);}cloud.instanceMatrix.needsUpdate=true;halo.position.fromArray(positions,params.selected*3).multiplyScalar(3);setLines(contextLines,backgroundEdges,positions);setLines(contactLines,neighbors,positions);
 }
 refreshSelection();render();
 return{update(dt=0){if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid frame delta');phase+=Math.min(dt,.05)*params.speed;render();},setParameters(full){const next=validateParameters(definition.parameters,full);if(!Number.isInteger(next.selected))throw new RangeError('Selected E8 root must be an integer');params=next;refreshSelection();render();},reset(nextSeed=seed){basis=projectionBasis8(nextSeed);seed=nextSeed;phase=0;refreshSelection();render();},action(key){if(key==='projection'){seed=(seed+1)>>>0;basis=projectionBasis8(seed);phase=0;render();return{seed};}if(key==='neighbor'){const pair=neighbors[(seed+params.selected)%neighbors.length];params.selected=pair[0]===params.selected?pair[1]:pair[0];refreshSelection();render();return{params:{selected:params.selected}};}},pick(raycaster){const hit=raycaster.intersectObject(cloud)[0];if(hit){params.selected=hit.instanceId;refreshSelection();render();return{params:{selected:params.selected}};}},dispose(){disposeGroup(group);}};
}
