import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {validateParameters} from '../core/state.js';
import {K4_EDGES,matroidState,matroidBases,basisPolynomial,logSlice,derivativeHessian,symmetricEigenvalues} from '../math/matroid.js';

const EDGE_NAMES=['AB','AC','AD','BC','BD','CD'];
export const definition={
 id:'matroid',title:'拟阵 · 组合的曲率',enTitle:'MATROIDS / LORENTZIAN POLYNOMIALS',kicker:'FIELDS 2022 · JUNE HUH',year:'1935 拟阵 · 2019/2020 Lorentzian · 2022 Fields',category:'Fields 数学结构',
 description:'在四个顶点之间挑选边，生成树就变成一个多项式。右侧的弯曲曲面，让离散选择中的凹性变得可以测量。',
 formula:'b(w) = Σₜ∈生成树 ∏ₑ∈ₜ wₑ    b(1,1,1,1,1,1) = 16\nr(A) = 4 − 连通分量数    A 独立 ⇔ |A| = r(A)\nz = log b(x,y,λ,λ,λ,λ)    Hess(log b) ⪯ 0',
 explanation:'左侧是 K₄ 图拟阵：金色边为当前选边，选中图无环时独立；3 条边连接所有顶点时是一组基，即生成树。点击边切换选择；下拉框也可指定边再切换。程序枚举并计算全部 16 个基的三次单项式，选边不会删改全体基多项式。右侧横轴 x=wAB、纵深 y=wAC，另外四个权重等于 λ；实际高度是 0.52·log b + 0.25，点与金色截线对应当前权重。对数函数在该截面上的局部凹性由其 Hessian 特征值检验。下方六根柱展示所选偏导 ∂ₑb 的 Hessian 谱：1+√5、1−√5、−2、0、0、0，只有一个正方向。这是 Lorentzian 条件在三次多项式上的可算例子。Brändén 与 Huh 的理论证明拟阵基多项式属于 Lorentzian 类；Huh 获 2022 Fields Medal，相关理论是获奖工作的组成部分。',
 limitations:'K₄ 是经典的小型图拟阵，三维四面体布局只是图的画法。右侧只是六变量多项式的二维正权重截面，图像或有限采样本身不证明普遍对数凹性。实验采用生成树枚举和解析导数；谱值的数值计算与已知精确值对照，不复现全部 Hodge 理论或 Lorentzian 定理证明。这里的 Lorentzian 不表示物理时空或相对论。',
 parameters:[
  {key:'selection',label:'选边组合（也可直接点边）',type:'range',min:0,max:63,step:1,value:7},
  {key:'edge',label:'当前边 / 偏导方向',type:'select',value:'0',options:EDGE_NAMES.map((label,i)=>({value:String(i),label}))},
  {key:'weightA',label:'AB 权重 x',type:'range',min:.1,max:3.5,step:.05,value:1.2},
  {key:'weightB',label:'AC 权重 y',type:'range',min:.1,max:3.5,step:.05,value:1.8},
  {key:'others',label:'其余四边权重 λ',type:'range',min:.1,max:3.5,step:.05,value:1},
  {key:'view',label:'观察主题',type:'select',value:'both',options:[{value:'both',label:'图与多项式'},{value:'surface',label:'对数凹曲面'},{value:'graph',label:'只看拟阵选边'}]}
 ],
 presets:[{label:'十六棵生成树',params:{selection:7,edge:'0',weightA:1.2,weightB:1.8,others:1,view:'both'}},{label:'环为何不独立',params:{selection:11,edge:'3',weightA:.45,weightB:2.8,others:.6,view:'both'}},{label:'单一正方向',params:{selection:38,edge:'5',weightA:2.6,weightB:.5,others:1.8,view:'surface'}}],
 actions:[{key:'toggle',label:'切换当前边'},{key:'next-basis',label:'下一棵生成树'},{key:'clear',label:'清空选边'}],
 sources:[{label:'IMU · June Huh / 2022 Fields Medal',url:'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2022'},{label:'Brändén–Huh · Lorentzian polynomials',url:'https://arxiv.org/abs/1902.03719'},{label:'IMU · Huh 获奖工作详述',url:'https://www.mathunion.org/fileadmin/IMU/Prizes/Fields/2022/IMU_Fields22_Huh_citation.pdf'}]
};

export function createExperiment(ctx){
 let params=validateParameters(definition.parameters,ctx.params??{}),seed=ctx.seed??42;
 const group=new THREE.Group(),graphGroup=new THREE.Group(),surfaceGroup=new THREE.Group(),spectrumGroup=new THREE.Group();group.add(graphGroup,surfaceGroup,spectrumGroup);ctx.scene.add(group);ctx.setCamera([8.1,6.9,11.9],[0,-.15,0]);spectrumGroup.position.set(.65,1.15,-1.35);
 const bases=matroidBases(),baseMasks=bases.map(b=>b.reduce((mask,e)=>mask|1<<e,0)),center=new THREE.Vector3(-3.8,.5,0),vertexPositions=[[1,1,1],[-1,1,-1],[-1,-1,1],[1,-1,-1]].map(v=>new THREE.Vector3(...v).multiplyScalar(1.05).add(center));
 const nodes=[],edges=[],up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),nodeGeometry=new THREE.IcosahedronGeometry(.19,2),edgeGeometry=new THREE.CylinderGeometry(1,1,1,10);
 function label(parent,text,position,width=2.5,color='#d3eee9'){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=112;const c=canvas.getContext('2d');if(!c)throw new Error('2D text rendering unavailable');c.font='500 34px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;
  const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(...position);sprite.scale.set(width,width*112/768,1);parent.add(sprite);sprite.userData.setText=value=>{c.clearRect(0,0,768,112);c.fillText(value,384,56);texture.needsUpdate=true;};sprite.userData.setText(text);return sprite;
 }
 vertexPositions.forEach((position,i)=>{const mesh=new THREE.Mesh(nodeGeometry,new THREE.MeshPhysicalMaterial({color:0x87fff0,metalness:.3,roughness:.18,emissive:0x3bc6b8,emissiveIntensity:.6,clearcoat:1}));mesh.position.copy(position);graphGroup.add(mesh);nodes.push(mesh);label(graphGroup,'ABCD'[i],position.clone().add(new THREE.Vector3(0,.37,0)).toArray(),.65);});
 K4_EDGES.forEach(([a,b],i)=>{const mesh=new THREE.Mesh(edgeGeometry,new THREE.MeshStandardMaterial({color:0x417d99,metalness:.4,roughness:.25,emissive:0x276789,emissiveIntensity:.5}));direction.subVectors(vertexPositions[b],vertexPositions[a]);mesh.position.copy(vertexPositions[a]).add(vertexPositions[b]).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,direction.clone().normalize());mesh.scale.set(.035,direction.length(),.035);mesh.userData.edge=i;graphGroup.add(mesh);edges.push(mesh);label(graphGroup,EDGE_NAMES[i],mesh.position.clone().add(new THREE.Vector3(0,.15,0)).toArray(),.75,'#90c9d9');});
 const graphStatus=label(graphGroup,'',[-3.8,-1.25,0],3.7),basisLabel=label(graphGroup,'',[-3.8,-1.65,0],3.5,'#ffc46c');
 const resolution=ctx.quality==='low'?32:52,span=5.2,offsetX=1.65,geometry=new THREE.PlaneGeometry(span,span,resolution,resolution);geometry.rotateX(-Math.PI/2);geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3),3));
 const surface=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({vertexColors:true,side:THREE.DoubleSide,metalness:.25,roughness:.26,clearcoat:1,emissive:0x091b40,emissiveIntensity:.4}));surface.position.x=offsetX;surface.name='matroid-log-surface';surfaceGroup.add(surface);
 const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18*32*6),3));const grid=new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:0x8ec4ef,transparent:true,opacity:.25,depthWrite:false}));surfaceGroup.add(grid);
 const guideGeometry=new THREE.BufferGeometry();guideGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(65*3),3));const guide=new THREE.Line(guideGeometry,new THREE.LineBasicMaterial({color:new THREE.Color(1.7,1.05,.3),transparent:true,opacity:.95,depthWrite:false}));surfaceGroup.add(guide);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.105,16,12),new THREE.MeshBasicMaterial({color:new THREE.Color(2,1.6,.6)}));marker.name='matroid-weight-marker';surfaceGroup.add(marker);
 label(surfaceGroup,'x = wAB   0.1 → 3.5',[offsetX,.05,3],3.5);label(surfaceGroup,'y = wAC   0.1 → 3.5',[4.8,.25,0],3.4);const curvatureLabel=label(surfaceGroup,'',[offsetX,4,0],5.5,'#b7dff8');
 const spectrumBars=[],eigenGeometry=new THREE.BoxGeometry(.3,1,.3);
 for(let i=0;i<6;i++){const mesh=new THREE.Mesh(eigenGeometry,new THREE.MeshStandardMaterial({color:0x73dddf,emissive:0x246681,emissiveIntensity:.5,metalness:.3,roughness:.25}));mesh.position.set((i-2.5)*.65+.2,-2.15,3.4);spectrumGroup.add(mesh);spectrumBars.push(mesh);}
 const zeroLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.8,-2.15,3.4),new THREE.Vector3(2.2,-2.15,3.4)]),new THREE.LineBasicMaterial({color:0x6f91a8}));spectrumGroup.add(zeroLine);
 const signatureLabel=label(spectrumGroup,'',[.2,-3,3.5],5.7,'#d0bfff');
 const point=(x,y)=>[offsetX+(x-.1)/3.4*span-span/2,logSlice(x,y,params.others).value*.52+.25,(y-.1)/3.4*span-span/2];
 function refreshSurface(){
  const attribute=geometry.attributes.position,colors=geometry.attributes.color,shade=new THREE.Color();
  for(let i=0;i<attribute.count;i++){const x=.1+(attribute.getX(i)/span+.5)*3.4,y=.1+(attribute.getZ(i)/span+.5)*3.4,slice=logSlice(x,y,params.others);attribute.setY(i,slice.value*.52+.25);shade.setHSL(.76-(slice.value+5.8)/12.5*.32,.72,.29+(slice.value+5.8)/12.5*.17);colors.setXYZ(i,shade.r,shade.g,shade.b);}
  attribute.needsUpdate=true;colors.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  let count=0;const positions=gridGeometry.attributes.position;
  for(let fixed=0;fixed<=8;fixed++)for(let i=0;i<32;i++)for(let axis=0;axis<2;axis++)for(let endpoint=0;endpoint<2;endpoint++){const x=.1+3.4*(axis?(i+endpoint)/32:fixed/8),y=.1+3.4*(axis?fixed/8:(i+endpoint)/32),p=point(x,y);positions.setXYZ(count++,...[p[0],p[1]+.018,p[2]]);}positions.needsUpdate=true;gridGeometry.computeBoundingSphere();
 }
 function refresh(){
  const state=matroidState(params.selection),selectedEdges=K4_EDGES.map((_,i)=>i).filter(i=>params.selection&(1<<i)),focus=Number(params.edge);
  edges.forEach((edge,i)=>{const active=selectedEdges.includes(i);edge.material.color.set(active?(state.independent?0xffbd59:0xff6688):0x305c7b);edge.material.emissive.copy(edge.material.color);edge.material.emissiveIntensity=active?.65:.17;edge.scale.x=edge.scale.z=i===focus?.07:active?.055:.026;});
  graphStatus.userData.setText(`${state.basis?'生成树 · 一组基':state.independent?'独立集 · 无环':'相关集 · 含环'}   rank ${state.rank}`);
  basisLabel.userData.setText(state.basis?selectedEdges.map(i=>`w${EDGE_NAMES[i]}`).join(' · '):`${state.size} 条选边 / ${state.components} 个连通分量`);
  const current=logSlice(params.weightA,params.weightB,params.others);marker.position.set(...point(params.weightA,params.weightB));marker.position.y+=.045;for(let i=0;i<=64;i++){const p=point(.1+i/64*3.4,params.weightB);guideGeometry.attributes.position.setXYZ(i,p[0],p[1]+.03,p[2]);}guideGeometry.attributes.position.needsUpdate=true;guideGeometry.computeBoundingSphere();curvatureLabel.userData.setText(`log b = ${current.value.toFixed(3)}   Hessian λ = ${current.eigenvalues.map(v=>v.toFixed(3)).join(' / ')}`);
  const eigenvalues=symmetricEigenvalues(derivativeHessian(focus));spectrumBars.forEach((bar,i)=>{const value=eigenvalues[i],height=Math.max(.025,Math.abs(value)*.31);bar.scale.y=height;bar.position.y=-2.15+Math.sign(value)*height/2;bar.material.color.set(value>1e-8?0xffba56:value<-1e-8?0x9d77ed:0x648c9d);bar.material.emissive.copy(bar.material.color);});signatureLabel.userData.setText(`D²(∂${EDGE_NAMES[focus]} b) :  1 positive · 2 negative · 3 zero`);
  graphGroup.visible=params.view!=='surface';surfaceGroup.visible=params.view!=='graph';spectrumGroup.visible=params.view!=='graph';
  ctx.onMetrics({'选边 / 秩':`${state.size} / ${state.rank}`,'独立性':state.basis?'基 · 生成树':state.independent?'独立 · 无环':'相关 · 含环','全部基多项式 b':basisPolynomial([params.weightA,params.weightB,...Array(4).fill(params.others)]).toFixed(3),'Lorentzian 谱':'1 正 / 2 负 / 3 零'});
 }
 function apply(full){const next=validateParameters(definition.parameters,full);matroidState(next.selection);const changed=next.others!==params.others;params=next;if(changed)refreshSurface();refresh();}
 refreshSurface();refresh();
 return{update(){},setParameters:apply,reset(nextSeed=seed){if(!Number.isInteger(nextSeed)||nextSeed<0||nextSeed>0xffffffff)throw new RangeError('Invalid seed');seed=nextSeed;refresh();},action(key){let mask=params.selection;if(key==='toggle')mask^=1<<Number(params.edge);else if(key==='clear')mask=0;else if(key==='next-basis')mask=baseMasks[(baseMasks.indexOf(mask)+1)%baseMasks.length];else return;params.selection=mask;refresh();return{params:{selection:mask}};},pick(raycaster){if(!graphGroup.visible)return;const hit=raycaster.intersectObjects(edges)[0];if(hit){const i=hit.object.userData.edge;params.selection^=1<<i;params.edge=String(i);refresh();return{params:{selection:params.selection,edge:params.edge}};}},dispose(){disposeGroup(group);}};
}
