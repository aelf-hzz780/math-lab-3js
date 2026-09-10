import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {constructKakeya,fieldLine} from '../math/kakeya.js';

export const definition={id:'kakeya',title:'有限域 Kakeya 集',enTitle:'EVERY DIRECTION, LESS SPACE',kicker:'有限几何 · 2026',year:'2026',category:'新数学构造',description:'一个稀疏的点集，却容纳每个方向的一整条直线。数字在边界环绕，空间出现不同的秩序。',formula:'Kₚ ⊂ 𝔽ₚ³  ·  |Kₚ| = (2p³ + 7p² + 3) / 8',explanation:'素数 p ≡ 3 (mod 4)。青色点来自平方剩余构造，金色点是补齐边界的新增部分。每个方向都有 p 个点组成的模 p 直线；切换方向可看到精确见证。',limitations:'有限域里的直线是模运算点集。白色光点按参数 t 遍历整条直线，跨边界时不会画出误导性的欧式长线。该家族不代表每个 p 的最小可能点集。',parameters:[{key:'prime',label:'有限域的素数 p',type:'select',value:'7',options:[{value:'7',label:'7 · 129 个点'},{value:'11',label:'11 · 439 个点'},{value:'19',label:'19 · 2,031 个点'}]},{key:'direction',label:'扫描起始方向',type:'range',min:0,max:1,step:0.001,value:0.19},{key:'scan',label:'自动扫描速度',type:'range',min:0,max:1,step:0.01,value:0.1},{key:'spacing',label:'点的大小',type:'range',min:0.035,max:0.15,step:0.005,value:0.12}],presets:[{label:'七阶光晶',params:{prime:'7',direction:.19,scan:.14,spacing:.12}},{label:'十一阶迷宫',params:{prime:'11',direction:.48,scan:.1,spacing:.08}},{label:'十九阶宇宙',params:{prime:'19',direction:.63,scan:.07,spacing:.05}}],actions:[{key:'next',label:'下一个方向'}],sources:[{label:'Station · 新无限家族论文',url:'https://arxiv.org/abs/2608.23691'},{label:'精确公式与方向见证',url:'https://github.com/dualverse-ai/station_data_v2/tree/main/artifacts/finite_kakeya'}]};

export function createExperiment(ctx){
 let params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),...ctx.params},group=new THREE.Group(),cloud,active,runner,activePoints=[],model,index=0,scanElapsed=0,phase=0;
 ctx.scene.add(group);ctx.setCamera([11.5,9.5,13.5],[0,0,0]);const object=new THREE.Object3D();
 function coordinate(point,p){return point.map(x=>(x-(p-1)/2)*6/(p-1));}
 function build(){disposeGroup(group);group=new THREE.Group();ctx.scene.add(group);const p=Number(params.prime);model=constructKakeya(p);const colors=[new THREE.Color(0x36dce9),new THREE.Color(0xffb349)];
  cloud=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(Number(params.spacing),1),new THREE.MeshStandardMaterial({roughness:0.2,metalness:0.4,emissive:0x1d8c9d,emissiveIntensity:0.55}),model.points.length);
  model.points.forEach((point,i)=>{object.position.fromArray(coordinate(point,p));object.updateMatrix();cloud.setMatrixAt(i,object.matrix);cloud.setColorAt(i,colors[model.boundary[i]?1:0]);});group.add(cloud);
  active=new THREE.InstancedMesh(new THREE.SphereGeometry(Number(params.spacing)*1.65,12,8),new THREE.MeshStandardMaterial({color:0xffcd68,emissive:0xffa22c,emissiveIntensity:1,roughness:.18,metalness:.4}),p);group.add(active);
  runner=new THREE.Mesh(new THREE.SphereGeometry(Number(params.spacing)*2.15,16,10),new THREE.MeshBasicMaterial({color:new THREE.Color(2,2,1.6)}));runner.name="modular-traveler";group.add(runner);
  const box=new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(-3.1,-3.1,-3.1),new THREE.Vector3(3.1,3.1,3.1)),0x397b8d);box.material.transparent=true;box.material.opacity=0.5;group.add(box);
  const grid=new THREE.GridHelper(6,p-1,0x25454e,0x193039);grid.position.y=-3.15;grid.material.transparent=true;grid.material.opacity=0.35;group.add(grid);
  index=Math.min(model.witnesses.length-1,Math.round(Number(params.direction)*(model.witnesses.length-1)));showDirection();
 }
 function showDirection(){const p=Number(params.prime),witness=model.witnesses[index],points=fieldLine(witness.anchor,witness.direction,p);activePoints=points.map(point=>coordinate(point,p));runner.position.fromArray(activePoints[Math.floor(phase*3)%p]);points.forEach((point,i)=>{object.position.fromArray(coordinate(point,p));object.scale.setScalar(1);object.updateMatrix();active.setMatrixAt(i,object.matrix);});active.instanceMatrix.needsUpdate=true;
  ctx.onMetrics({'集合点数':String(model.points.length),'空间占比':`${(100*model.points.length/p**3).toFixed(1)}%`,'方向总数':String(model.witnesses.length),'当前方向':`(${witness.direction.join(', ')})`});
 }
 build();return{
  update(dt){phase+=dt;scanElapsed+=dt*Number(params.scan);if(scanElapsed>0.16){scanElapsed=0;index=(index+1)%model.witnesses.length;showDirection();}runner.position.fromArray(activePoints[Math.floor(phase*3)%Number(params.prime)]);},
  setParameters(full){const old={...params};params={...params,...full};if(old.prime!==params.prime||old.spacing!==params.spacing)build();else if(old.direction!==params.direction){index=Math.round(Number(params.direction)*(model.witnesses.length-1));showDirection();}},
  reset(){phase=0;scanElapsed=0;index=Math.round(Number(params.direction)*(model.witnesses.length-1));showDirection();},
  action(key){if(key==='next'){index=(index+1)%model.witnesses.length;params.direction=index/(model.witnesses.length-1);showDirection();return{params:{direction:params.direction}};}},
  dispose(){disposeGroup(group);}
 };
}
