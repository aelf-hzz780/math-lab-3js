import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {auditKissing,projectionBasis,projectConfiguration} from '../math/kissing.js';
import data from '../../data/kissing.json' with {type:'json'};

export const definition={
 id:'kissing',title:'高维接吻构型',enTitle:'THE 604 CONFIGURATION',kicker:'离散几何 · 2026',year:'2026',category:'新数学构造',
 description:'604 个邻居，围绕一个十一维球体。转动投影，观察三个不等距构型的不同秩序。',
 formula:'xᵢ ∈ ℝ¹¹  ·  ‖xᵢ‖² = 4  ·  ⟨xᵢ,xⱼ⟩ ≤ 2',
 explanation:'每个点来自公开精确坐标 (P + Q√2)/6。蓝色是 496 点整数核心，金色是 108 点扩展。亮线连接选中点在十一维中真正相接的邻居；暗线稀疏抽取其余真实接触关系；投影旋转不会改变这些关系。',
 limitations:'这是十一维结构的三维正交投影；画面距离与重叠不代表原空间中的距离。604 是下界，尚未宣称接吻数恰为 604。',
 parameters:[{key:'configuration',label:'精确构型',type:'select',value:'0',options:[{value:'0',label:'I · 19,704 次接触'},{value:'1',label:'II · 22,904 次接触'},{value:'2',label:'III · 22,840 次接触'}]},{key:'rotation',label:'高维旋转速度',type:'range',min:0,max:1,step:0.01,value:0.18},{key:'selected',label:'观察点编号',type:'range',min:0,max:603,step:1,value:17},{key:'pointSize',label:'点的尺度',type:'range',min:0.06,max:0.26,step:0.01,value:0.18}],
 presets:[{label:'晶格星云',params:{configuration:'0',rotation:.22,selected:17,pointSize:.18}},{label:'第二种秩序',params:{configuration:'1',rotation:.15,selected:502,pointSize:.18}},{label:'异形对称',params:{configuration:'2',rotation:.28,selected:570,pointSize:.16}}],
 actions:[{key:'projection',label:'换一个投影视角'}],sources:[{label:'Station · 论文与三套精确构造',url:'https://arxiv.org/abs/2608.23691'},{label:'原始坐标与验证证书',url:'https://github.com/dualverse-ai/station_data_v2/tree/main/artifacts/kissing_number'}]
};

export async function createExperiment(ctx){
 let params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),...ctx.params},seed=ctx.seed??42,angle=0,basis=projectionBasis(seed),configuration,contacts,selectedEdges=[],contextEdges=[],lastMetric='';
 const audits=new Map();
 const group=new THREE.Group();ctx.scene.add(group);ctx.setCamera([0,1.2,12.5],[0,0,0]);
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(604*3),colors=new Float32Array(604*3);
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const material=new THREE.PointsMaterial({size:Number(params.pointSize),vertexColors:true,transparent:true,opacity:0.98,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','float radius = length(gl_PointCoord - vec2(0.5)); if (radius > 0.5) discard; diffuseColor.a *= smoothstep(0.5, 0.12, radius); diffuseColor.rgb *= 1.2 + exp(-radius * radius * 70.0);\n#include <opaque_fragment>');};
 const cloud=new THREE.Points(geometry,material);group.add(cloud);
 const lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(603*6),3));const lines=new THREE.LineSegments(lineGeometry,new THREE.LineBasicMaterial({color:0x73fff3,transparent:true,opacity:0.62,depthWrite:false,blending:THREE.AdditiveBlending}));group.add(lines);
 const contextGeometry=new THREE.BufferGeometry();contextGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((ctx.quality==='low'?500:1500)*6),3));const contextLines=new THREE.LineSegments(contextGeometry,new THREE.LineBasicMaterial({color:0x27c6dd,transparent:true,opacity:.055,depthWrite:false,blending:THREE.AdditiveBlending}));group.add(contextLines);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(0.045,16,12),new THREE.MeshBasicMaterial({color:0xffecb3}));group.add(marker);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(0.067,16,12),new THREE.MeshBasicMaterial({color:0xf8d385,wireframe:true,transparent:true,opacity:0.22}));group.add(halo);
 function configure(){
  const index=Number(params.configuration),selected=Number(params.selected);if(!Number.isInteger(index)||index<0||index>2||!Number.isInteger(selected)||selected<0||selected>603)throw new RangeError('Invalid kissing configuration or selected point');
  configuration=data.configurations[index];if(!audits.has(index))audits.set(index,auditKissing(configuration));contacts=audits.get(index);const contextCount=ctx.quality==='low'?500:1500,step=Math.ceil(contacts.contacts.length/contextCount);contextEdges=contacts.contacts.filter((_,i)=>i%step===0);contextGeometry.setDrawRange(0,contextEdges.length*2);selectedEdges=contacts.contacts.filter(edge=>edge.includes(selected));
  const neighbors=new Set(selectedEdges.flat());
  for(let i=0;i<604;i++){const c=new THREE.Color(i===selected?0xffefb6:neighbors.has(i)?0xc7ffff:i<496?0x36d9f0:0xffb44c);colors.set([c.r,c.g,c.b],i*3);}
  geometry.attributes.color.needsUpdate=true;lineGeometry.setDrawRange(0,selectedEdges.length*2);
  const metric=JSON.stringify([index,selected]);if(metric!==lastMetric){lastMetric=metric;ctx.onMetrics({'精确点数':'604','原始维度':'11 D','总接触数':contacts.contacts.length.toLocaleString(),'选中点邻居':String(selectedEdges.length)});}
 }
 function frame(){const projected=projectConfiguration(configuration,basis,angle);for(let i=0;i<positions.length;i++)positions[i]=projected[i]*1.8;geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();
  const linePositions=lineGeometry.attributes.position.array;for(let e=0;e<selectedEdges.length;e++)for(let endpoint=0;endpoint<2;endpoint++){const source=selectedEdges[e][endpoint]*3;linePositions.set(positions.subarray(source,source+3),e*6+endpoint*3);}lineGeometry.attributes.position.needsUpdate=true;lineGeometry.computeBoundingSphere();const contextPositions=contextGeometry.attributes.position.array;for(let e=0;e<contextEdges.length;e++)for(let endpoint=0;endpoint<2;endpoint++){const source=contextEdges[e][endpoint]*3;contextPositions.set(positions.subarray(source,source+3),e*6+endpoint*3);}contextGeometry.attributes.position.needsUpdate=true;contextGeometry.computeBoundingSphere();marker.position.fromArray(positions,Number(params.selected)*3);halo.position.copy(marker.position);
 }
 configure();frame();return{
  update(dt){angle+=Math.min(dt,0.05)*Number(params.rotation)*0.55;frame();},
  setParameters(full){params={...params,...full};material.size=Number(params.pointSize);configure();frame();},
  reset(nextSeed=seed){seed=nextSeed;angle=0;basis=projectionBasis(seed);frame();},
  action(key){if(key==='projection'){seed=(seed+1)>>>0;basis=projectionBasis(seed);angle=0;frame();return{seed};}},
  pick(raycaster){raycaster.params.Points.threshold=0.1;const hit=raycaster.intersectObject(cloud)[0];if(hit){params.selected=hit.index;configure();frame();return {params:{selected:hit.index}};}},
  dispose(){disposeGroup(group);}
 };
}
