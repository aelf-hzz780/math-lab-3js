import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {generateHatPatch} from '../math/hat.js';

export const definition={id:'hat',title:'Hat 非周期铺砌',enTitle:'ORDER WITHOUT REPETITION',kicker:'几何与铺砌 · 2023 / 2024',year:'2023',category:'新数学构造',description:'一种形状，无穷种延展。每块都遵循同一规则，却永远无法靠平移重复整个平面。',formula:'H → 3H + T + 3P + 3F  ·  aperiodic monotile',explanation:'采用 Smith、Myers、Kaplan、Goodman-Strauss 的真实 Hat 替换系统。四种 metatile 按固定边匹配组合。金色标出镜像 Hat，它们是这种铺砌的必要组成。',limitations:'画面是无限非周期铺砌的一块有限区域；有限图案或动画本身不能证明非周期性。高度只用于展示，不属于原始平面数学定义。',parameters:[{key:'depth',label:'替换次数',type:'select',value:'3',options:[{value:'0',label:'0 · 4 块'},{value:'1',label:'1 · 25 块'},{value:'2',label:'2 · 169 块'},{value:'3',label:'3 · 1,156 块'}]},{key:'height',label:'展示厚度',type:'range',min:0.02,max:0.25,step:0.01,value:0.09},{key:'growth',label:'生长速度',type:'range',min:0.1,max:1,step:0.05,value:0.35}],presets:[{label:'无尽翡翠',params:{depth:'3',height:.09,growth:.35}},{label:'二阶拼图',params:{depth:'2',height:.16,growth:.25}},{label:'规则的种子',params:{depth:'0',height:.2,growth:.15}}],actions:[{key:'grow',label:'重播规则生长'}],sources:[{label:'Hat · 作者与论文',url:'https://cs.uwaterloo.ca/~csk/hat/'},{label:'BSD 3-Clause 原始生成器',url:'https://github.com/isohedral/hatviz'}]};

export function createExperiment(ctx){
 let params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),...ctx.params},group=new THREE.Group(),progress=0,mesh,line,tileCount=0,edgeEnds=[];
 ctx.scene.add(group);ctx.setCamera([0,9.3,7.8],[0,0,0]);const growthUniform={value:0};
 function build(){
  disposeGroup(group);group=new THREE.Group();ctx.scene.add(group);const tiles=generateHatPatch(Number(params.depth));tileCount=tiles.length;
  const vertices=tiles.flatMap(t=>t.vertices),xs=vertices.map(p=>p.x),ys=vertices.map(p=>p.y),cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2,scale=8/Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  for(const tile of tiles){tile.center=tile.vertices.reduce((s,p)=>({x:s.x+p.x/13,y:s.y+p.y/13}),{x:0,y:0});tile.distance=Math.hypot(tile.center.x-cx,tile.center.y-cy);}
  tiles.sort((a,b)=>a.distance-b.distance);const positions=[],normals=[],colors=[],births=[],edgePositions=[];edgeEnds=[];
  const palette={H:new THREE.Color(0x087c91),H1:new THREE.Color(0xffc16e),P:new THREE.Color(0x29d4b7),F:new THREE.Color(0x19537b),T:new THREE.Color(0x91f2d5)};
  function addVertex(x,y,z,n,color,birth){positions.push(x,y,z);normals.push(...n);colors.push(color.r,color.g,color.b);births.push(birth);}
  tiles.forEach((tile,index)=>{
   const points=tile.vertices.map(p=>new THREE.Vector2((p.x-cx)*scale,(p.y-cy)*scale)),faces=THREE.ShapeUtils.triangulateShape(points,[]),birth=index/tiles.length,color=palette[tile.label],h=Number(params.height);
   for(const face of faces)for(const k of [...face].reverse())addVertex(points[k].x,h,points[k].y,[0,1,0],color,birth);
   for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.y-a.y,length=Math.hypot(dx,dz),n=[dz/length,0,-dx/length],shade=color.clone().multiplyScalar(0.48);
    for(const[v,y]of [[a,0],[a,h],[b,h],[a,0],[b,h],[b,0]])addVertex(v.x,y,v.y,n,shade,birth);
    edgePositions.push(a.x,h+0.002,a.y,b.x,h+0.002,b.y);
   }edgeEnds.push(edgePositions.length/3);
  });
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('birth',new THREE.Float32BufferAttribute(births,1));
  const material=new THREE.MeshPhysicalMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:0.23,metalness:0.42,clearcoat:1,clearcoatRoughness:.2,emissive:0x05212a,emissiveIntensity:.2});
  material.onBeforeCompile=shader=>{shader.uniforms.uGrowth=growthUniform;shader.vertexShader='attribute float birth; varying float vBirth; uniform float uGrowth;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBirth = birth; transformed.y -= max(0.0, 1.0 - (uGrowth - birth) * 22.0) * 0.18;');shader.fragmentShader='varying float vBirth; uniform float uGrowth;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vBirth > uGrowth) discard;');};
  mesh=new THREE.Mesh(geometry,material);group.add(mesh);const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(edgePositions,3));line=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:0xa1f6df,transparent:true,opacity:0.4}));line.geometry.setDrawRange(0,0);group.add(line);
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.65,4.665,128),new THREE.MeshBasicMaterial({color:0x34545a,transparent:true,opacity:0.5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-0.02;group.add(ring);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.6,.18,96),new THREE.MeshStandardMaterial({color:0x10232d,roughness:.4,metalness:.65}));plinth.position.y=-.115;group.add(plinth);
  const keyLight=new THREE.DirectionalLight(0xffd6a1,1.5);keyLight.position.set(-5,7,3);group.add(keyLight);
  progress=1.08;growthUniform.value=progress;line.geometry.setDrawRange(0,edgeEnds[tileCount-1]);ctx.onMetrics({'同形拼块':String(tileCount),'替换次数':String(params.depth),'镜像拼块':String(tiles.filter(t=>t.label==='H1').length),'单块顶点':'13'});
 }
 build();return{update(dt){progress=Math.min(1.08,progress+Math.min(dt,0.05)*Number(params.growth));growthUniform.value=progress;const visible=Math.min(tileCount,Math.floor(progress*tileCount));line.geometry.setDrawRange(0,visible?edgeEnds[visible-1]:0);},setParameters(full){const old={...params};params={...params,...full};if(old.depth!==params.depth||old.height!==params.height)build();},reset(){progress=1.08;growthUniform.value=progress;line.geometry.setDrawRange(0,edgeEnds[tileCount-1]);},action(key){if(key==='grow'){progress=0;growthUniform.value=0;}},dispose(){disposeGroup(group);}};
}
