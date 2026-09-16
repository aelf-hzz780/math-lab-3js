import * as THREE from '../../vendor/three.module.js';
import {validateParameters} from '../core/state.js';
import {disposeGroup} from '../core/resources.js';
import {createParticleSeeds,compositionWeights,resolveParticleCount} from '../math/particle-paint.js';
import {createParticlePaintMaterial,createPaintBackdropMaterial} from '../rendering/particle-paint-material.js';

export const definition={
 id:'particle-paint',title:'流彩粒子画',enTitle:'Living Pigment',kicker:'19 / PARTICLE ART',interaction:'field',
 year:'2026 · 截图视觉参考 / 程序化图形',category:'程序化图形',
 description:'把花潮、绸带与漩涡织成一幅有深度的流动画。靠近画面，拨动成千上万根微光纤维。',
 formula:'p = Σ wᵢ(t) Pᵢ(s) + a · curl A(p,t)；Σ wᵢ = 1',
 explanation:'固定 seed 为每根纤维分配稳定身份。GPU 将同一批纤维连续变形到三种原创构图，再以解析 curl 场弯动细笔触。紫罗兰、珊瑚红与浅粉沿空间缓慢晕染；不同深度的纤维产生视差。移动指针轻轻推开纤维，按住则吸引；Shift 或右键拖动环视，滚轮与双指缩放。',
 limitations:'视觉参考来自所提供的 Carolina Aiazzi（@Cora_Mat）截图；尚未核验原帖地址、视频或作者源码。这里的三种图像均由参数曲面原创生成，不读取照片，不复现作者算法。curl 场是无散度的解析向量场，但用它直接位移粒子并不等于求解不可压缩流体。半透明笔触采用近似混合，不进行逐粒子排序或真实毛发散射。默认桌面 24 万粒子，手机最多 12 万；200 万为可选高负载档，不承诺所有设备实时。',
 parameters:[
  {key:'composition',label:'构图变形',type:'range',min:0,max:2,step:.01,value:0},
  {key:'morph',label:'自动换画',type:'range',min:0,max:1,step:.05,value:.65},
  {key:'flow',label:'纤维流动',type:'range',min:0,max:1.5,step:.05,value:.8},
  {key:'depth',label:'空间深度',type:'range',min:.3,max:1.8,step:.05,value:1.1},
  {key:'brush',label:'笔触尺度',type:'range',min:.5,max:2,step:.05,value:1},
  {key:'particles',label:'粒子数量',type:'range',min:60000,max:2000000,step:20000,value:240000},
 ],
 presets:[
  {label:'绛紫花潮',params:{composition:0,morph:.65,flow:.8,depth:1.1,brush:1,particles:240000}},
  {label:'蓝调绸带',params:{composition:1,morph:.4,flow:1.1,depth:1.4,brush:1.15,particles:300000}},
  {label:'珊瑚漩涡',params:{composition:2,morph:.5,flow:.65,depth:.8,brush:.85,particles:360000}},
 ],
 actions:[{key:'next-art',label:'下一幅画'},{key:'front',label:'正面欣赏'},{key:'detail',label:'靠近纤维'}],
 sources:[
  {label:'视觉参考 · @Cora_Mat（所提供截图，原帖未核验）',url:'https://x.com/Cora_Mat'},
  {label:'Bridson et al. · Curl-Noise for Procedural Fluid Flow · 2007',url:'https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf'},
  {label:'Three.js · InstancedBufferGeometry',url:'https://threejs.org/docs/#api/en/core/InstancedBufferGeometry'},
 ],
};

export function createExperiment(ctx){
 let params=validateParameters(definition.parameters,ctx.params||{}),seed=ctx.seed??42,time=0,morphPhase=0,disposed=false,particleCount=0,lastMetric=-1;
 const group=new THREE.Group();ctx.scene.add(group);
 const previousBackground=ctx.scene.background;ctx.scene.background=new THREE.Color(0x030408);
 const {material,uniforms}=createParticlePaintMaterial();
 const strokes=new THREE.Mesh(new THREE.InstancedBufferGeometry(),material);strokes.frustumCulled=false;strokes.renderOrder=2;group.add(strokes);
 const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3();
 let pointerTarget=0;const pointerPosition=new THREE.Vector3();
 function frameLayout(){group.position.x=ctx.camera.aspect>1.1?2.3:0;group.updateMatrixWorld(true);}
 function box(width,height,depth,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 const caseMaterial=new THREE.MeshStandardMaterial({color:0x11131a,roughness:.43,metalness:.5});
 const frameMaterial=new THREE.MeshStandardMaterial({color:0x9eabc1,roughness:.27,metalness:.72});
 box(5.08,7.1,.19,0,0,-1.05,caseMaterial);
 box(.065,7.16,.34,-2.56,0,-.70,frameMaterial);box(.065,7.16,.34,2.56,0,-.70,frameMaterial);
 box(5.18,.065,.34,0,3.57,-.70,frameMaterial);box(5.18,.065,.34,0,-3.57,-.70,frameMaterial);
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(5.05,7.05),createPaintBackdropMaterial());backdrop.position.z=-.94;group.add(backdrop);
 const glow=new THREE.PointLight(0xb9caff,13,15,2);glow.position.set(-3,4,5);group.add(glow);
 const rim=new THREE.PointLight(0xbc8de4,8,13,2);rim.position.set(4,-3,1);group.add(rim);
 function metrics(){const names=['花潮','绸带','漩涡'],phase=((params.composition+morphPhase)%3+3)%3,index=Math.floor(phase);ctx.onMetrics({'绘画粒子':`${(particleCount/10000).toFixed(particleCount%10000?1:0)} 万`,'当前构图':phase-index<.03?names[index]:`${names[index]} → ${names[(index+1)%3]}`,'空间深度':`${params.depth.toFixed(2)} ×`,'交互力场':pointerTarget<0?'吸引':pointerTarget>0?'轻推':'待触碰'});}
 function rebuild(){
  const count=resolveParticleCount(params.particles,ctx.quality==='low'?'low':'high');
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));geometry.setIndex([0,1,2,0,2,3]);
  geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(createParticleSeeds(count,seed),4));geometry.instanceCount=count;
  const old=strokes.geometry;strokes.geometry=geometry;old.dispose();particleCount=count;
  uniforms.uOpacity.value=Math.min(.65,.48*Math.sqrt(240000/count));metrics();
 }
 function applyUniforms(){uniforms.uWeights.value.fromArray(compositionWeights(params.composition+morphPhase));uniforms.uDepth.value=params.depth;uniforms.uFlow.value=params.flow;uniforms.uBrush.value=params.brush*(ctx.quality==='low'?1.65:1);uniforms.uTime.value=time;}
 function setParameters(next){
  const checked=validateParameters(definition.parameters,{...params,...next}),changed=checked.particles!==params.particles;
  if(checked.composition!==params.composition)morphPhase=0;
  params=checked;if(changed)rebuild();applyUniforms();
 }
 function reset(nextSeed=seed){
  if(!Number.isInteger(nextSeed)||nextSeed<0||nextSeed>4294967295)throw new RangeError('Invalid particle seed');
  const changed=nextSeed!==seed;seed=nextSeed;time=0;morphPhase=0;pointerTarget=0;pointerPosition.set(0,0,0);uniforms.uPointerStrength.value=0;uniforms.uPointer.value.set(0,0,0);if(changed)rebuild();applyUniforms();metrics();
 }
 function dispose(){if(disposed)return;disposed=true;ctx.signal?.removeEventListener('abort',dispose);disposeGroup(group);if(ctx.scene.background?.getHex()===0x030408)ctx.scene.background=previousBackground;}
 ctx.signal?.addEventListener('abort',dispose,{once:true});
 if(ctx.signal?.aborted){dispose();throw new DOMException('Scene aborted','AbortError');}
 try{rebuild();applyUniforms();frameLayout();ctx.setCamera([3.5,.35,12.5],[0,0,0]);}catch(error){dispose();throw error;}
 return {
  update(dt){if(disposed)return;frameLayout();if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid particle time step');const step=Math.min(dt,.05);time+=step;morphPhase+=step*params.morph*.06;if(step>0)uniforms.uPointer.value.lerp(pointerPosition,1-Math.exp(-step*15));uniforms.uPointerStrength.value+=(pointerTarget-uniforms.uPointerStrength.value)*(1-Math.exp(-step*9));applyUniforms();if(Math.floor(time)!==lastMetric){lastMetric=Math.floor(time);metrics();}},
  pointer(input){
   if(disposed)return;if(!input||!Number.isFinite(input.x)||!Number.isFinite(input.y))throw new RangeError('Invalid particle pointer');
   raycaster.setFromCamera(new THREE.Vector2(Math.max(-1,Math.min(1,input.x)),Math.max(-1,Math.min(1,input.y))),ctx.camera);
   if(raycaster.ray.intersectPlane(plane,hit))pointerPosition.copy(group.worldToLocal(hit));
   pointerTarget=input.active?(input.pressed?-.65:.55):0;
   // Record the field target; a paused clock keeps all rendered uniforms unchanged.
   metrics();
  },
  setParameters,reset,dispose,
  action(key){if(key==='front')ctx.setCamera([0,0,13],[0,0,0]);else if(key==='detail')ctx.setCamera([1.4,.3,7.8],[0,.15,0]);else if(key==='next-art'){params.composition=(Math.round(params.composition)+1)%3;morphPhase=0;applyUniforms();return{params:{composition:params.composition}};}else throw new RangeError('Unknown particle painting action');},
 };
}
