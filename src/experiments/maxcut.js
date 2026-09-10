import * as THREE from '../../vendor/three.module.js';
import {disposeGroup,seededRandom} from '../core/resources.js';
import {validateGraph,cutWeight,improveColoring} from '../math/maxcut.js';
import graph from '../../data/maxcut.json' with {type:'json'};

export const definition={id:'maxcut',title:'AI 图构造',enTitle:'A GRAPH THAT RESISTS',kicker:'组合优化 · 2025—2026',year:'2026',category:'新数学构造',description:'19 个节点，155 条加权边。给节点分配四种颜色，把尽可能多的权重留在不同颜色之间。',formula:'MAX-4-CUT:  max Σ wᵤᵥ · [cᵤ ≠ cᵥ]',explanation:'采用 AlphaEvolve 论文附录 C.1 的完整 gadget。节点 1—3 是原变量，4—7 是全局变量，8—19 是辅助变量。点击节点换色，或执行一次局部改进；明亮边被当前切割跨过。',limitations:'这张图用于近似困难性的归约证明。当前着色与局部搜索只演示目标函数，不是完整归约证明，也不保证达到全局最优。三维布局不改变图的结构。',parameters:[{key:'threshold',label:'仅显示较重的边',type:'range',min:1,max:1000,step:1,value:200},{key:'auto',label:'局部搜索节奏',type:'range',min:0,max:1,step:0.05,value:0},{key:'layout',label:'空间布局',type:'select',value:'sphere',options:[{value:'sphere',label:'球面布局'},{value:'groups',label:'按四种颜色分组'}]}],presets:[{label:'宝石网络',params:{threshold:200,auto:0,layout:'sphere'}},{label:'四色星团',params:{threshold:350,auto:.35,layout:'groups'}},{label:'只看强连接',params:{threshold:800,auto:0,layout:'sphere'}}],actions:[{key:'improve',label:'一次局部改进'},{key:'shuffle',label:'重新随机着色'}],sources:[{label:'AlphaEvolve · 原论文与附录 C.1',url:'https://arxiv.org/html/2509.18057v7'},{label:'论文摘要与版本记录',url:'https://arxiv.org/abs/2509.18057'}]};

export async function createExperiment(ctx){
 const total=validateGraph(graph);
 let params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),...ctx.params},seed=ctx.seed??42,colors=[],elapsed=0,selected=-1;
 const group=new THREE.Group();ctx.scene.add(group);ctx.setCamera([9,6.5,10.5],[0,0,0]);
 const palette=[0x35ffe0,0xffbd4e,0x9d76ff,0xff638b].map(c=>new THREE.Color(c)),nodes=[],labels=[],edges=[],positions=[],targets=[];
 const nodeGeo=new THREE.IcosahedronGeometry(0.235,3),edgeGeo=new THREE.CylinderGeometry(1,1,1,6,1,true),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
 function makeLabel(text){const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const c=canvas.getContext('2d');if(!c)throw new Error('2D label renderer unavailable');c.font='500 30px monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#e7f5f5';c.fillText(text,48,32);const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,opacity:0.85}));sprite.scale.set(0.52,0.35,1);return sprite;}
 for(let i=0;i<19;i++){
  const node=new THREE.Mesh(nodeGeo,new THREE.MeshPhysicalMaterial({roughness:0.16,metalness:0.3,clearcoat:1,clearcoatRoughness:.1,emissiveIntensity:0.52}));node.userData.vertex=i;nodes.push(node);group.add(node);const label=makeLabel(String(i+1));labels.push(label);group.add(label);positions.push(new THREE.Vector3());targets.push(new THREE.Vector3());
 }
 for(const[a,b,w]of graph.edges){const edge=new THREE.Mesh(edgeGeo,new THREE.MeshBasicMaterial({color:0x40717b,transparent:true,opacity:0.2,depthWrite:false}));edges.push({a:a-1,b:b-1,w,mesh:edge});group.add(edge);}
 const selector=new THREE.Mesh(new THREE.SphereGeometry(0.33,16,12),new THREE.MeshBasicMaterial({color:0xffefc5,wireframe:true,transparent:true,opacity:0.6}));selector.visible=false;group.add(selector);
 function metrics(){ctx.onMetrics({'原始节点 / 边':'19 / 155','总权重':total.toLocaleString(),'切割权重':cutWeight(graph,colors).toLocaleString(),'切割比例':`${(100*cutWeight(graph,colors)/total).toFixed(2)}%`});}
 function recolor(){
  nodes.forEach((node,i)=>{node.material.color.copy(palette[colors[i]]);node.material.emissive.copy(palette[colors[i]]);});
  for(const edge of edges){const cut=colors[edge.a]!==colors[edge.b];edge.mesh.material.color.copy(cut?palette[colors[edge.a]]:new THREE.Color(0x22333d));edge.mesh.material.opacity=cut?0.55:0.1;edge.mesh.visible=edge.w>=Number(params.threshold);}
  const counters=[0,0,0,0];for(let i=0;i<19;i++){
   if(params.layout==='groups'){const c=colors[i],n=counters[c]++,a=n*2.39996;targets[i].set((c%2?1:-1)*2.1+Math.cos(a)*0.72,(c<2?1:-1)*1.9+Math.sin(a)*0.72,(n%3-1)*0.85);}
   else {const y=1-2*(i+0.5)/19,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));targets[i].set(Math.cos(a)*r*3.4,y*3.4,Math.sin(a)*r*3.4);}
  }metrics();
 }
 function shuffle(nextSeed){if(nextSeed===undefined){seed=(seed+1)>>>0;nextSeed=seed;}const random=seededRandom(nextSeed);colors=Array.from({length:19},()=>Math.floor(random()*4));recolor();}
 function step(){colors=improveColoring(graph,colors);recolor();}
 function renderPositions(dt=1){for(let i=0;i<19;i++){positions[i].lerp(targets[i],Math.min(1,dt*5));nodes[i].position.copy(positions[i]);labels[i].position.copy(positions[i]).add(new THREE.Vector3(0,0.4,0));}
  for(const{a,b,w,mesh}of edges){direction.subVectors(positions[b],positions[a]);const length=direction.length();mesh.position.copy(positions[a]).add(positions[b]).multiplyScalar(0.5);mesh.quaternion.setFromUnitVectors(up,direction.normalize());const width=0.006+0.027*Math.sqrt(w/1429);mesh.scale.set(width,length,width);}
  if(selected>=0){selector.visible=true;selector.position.copy(positions[selected]);}
 }
 shuffle(seed);renderPositions();return{update(dt){renderPositions(dt);elapsed+=dt*Number(params.auto);if(elapsed>0.6){elapsed=0;step();}},setParameters(full){params={...params,...full};recolor();renderPositions();},reset(nextSeed=seed){seed=nextSeed;elapsed=0;selected=-1;selector.visible=false;shuffle(seed);renderPositions();},action(key){if(key==='improve')step();if(key==='shuffle')shuffle();renderPositions();if(key==='shuffle')return{seed};},pick(raycaster){const hit=raycaster.intersectObjects(nodes)[0];if(hit){selected=hit.object.userData.vertex;colors[selected]=(colors[selected]+1)%4;recolor();renderPositions();return {vertex:selected+1};}},dispose(){disposeGroup(group);}};
}
