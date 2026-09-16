import * as THREE from '../../vendor/three.module.js';
import {validateParameters} from '../core/state.js';
import {disposeGroup} from '../core/resources.js';
import {springStep} from '../math/liquid-glass.js';
import {createLiquidGlassMaterial,createLiquidCloudTexture} from '../rendering/liquid-glass-material.js';

export const definition={
  id:'liquid-glass',title:'液态玻璃',enTitle:'LIQUID GLASS',kicker:'20 / LIGHT IN MOTION',
  year:'2026 · 截图视觉参考 / 经典图形与光学',category:'程序化图形',interaction:'field',
  description:'让透明的液态雕塑在指尖延展。云层穿过曲面折转，银白高光沿流环游走。',
  formula:'F = smoothMin(torus₁, torus₂, droplets)；surface: F = 0\nn₁ sinθ₁ = n₂ sinθ₂；ẍ + 2ωẋ + ω²(x − target) = 0',
  explanation:'两个变形环体、水滴与平滑连接形成连续的隐式曲面。逐像素射线步进找到入射点和出射点，再用 Snell 定律折射程序化云层；Fresnel 反射与白色面光源描出透明轮廓。按住并拖动液体可局部牵引，松手后由解析临界阻尼弹簧回到平衡。Shift 拖动或右键可环视，滚轮与双指可缩放。',
  limitations:'根据 Shader Development Studio 的截图创作的独立视觉实验。仅取得静态截图，尚未核验作者的源码、运动细节或其 TSL 流体算法。本实验使用 WebGL 隐式几何和弹簧形变，未求解 Navier–Stokes，不是 WebGPU 计算着色器流体；“黏滞感”控制回弹速度。折射采用有限步数、一次入射和一次出射，色散为有限 RGB 近似；不计算多次内部反射、焦散、真实体积云或质量守恒。',
  parameters:[
    {key:'shape',label:'液体形态',type:'select',value:'mirror',options:[{value:'mirror',label:'云镜交融'},{value:'ribbons',label:'流环相拥'},{value:'rain',label:'银雨悬浮'}]},
    {key:'flow',label:'流动速度',type:'range',min:0,max:1.5,step:.05,value:.45},
    {key:'viscosity',label:'黏滞感',type:'range',min:.2,max:2,step:.05,value:.85},
    {key:'ior',label:'折射率 IOR',type:'range',min:1.05,max:1.8,step:.01,value:1.36},
    {key:'dispersion',label:'棱边色散',type:'range',min:0,max:1,step:.05,value:.25},
  ],
  presets:[
    {label:'云镜交融',params:{shape:'mirror',flow:.45,viscosity:.85,ior:1.36,dispersion:.25}},
    {label:'流环相拥',params:{shape:'ribbons',flow:.7,viscosity:.45,ior:1.46,dispersion:.4}},
    {label:'银雨悬浮',params:{shape:'rain',flow:.3,viscosity:1.6,ior:1.25,dispersion:.15}},
  ],
  actions:[{key:'pulse',label:'轻触液体'},{key:'front',label:'正面观赏'},{key:'new-clouds',label:'更换云境'}],
  sources:[
    {label:'视觉参考 · Shader Development Studio / @shadersweden · 用户提供截图',url:'https://x.com/shadersweden'},
    {label:'Inigo Quilez · distance functions / smooth union',url:'https://iquilezles.org/articles/distfunctions/'},
    {label:'Physically Based Rendering · dielectric reflection and refraction',url:'https://pbr-book.org/4ed/Reflection_Models/Dielectric_BSDF'},
  ],
};

const shapes={mirror:0,ribbons:1,rain:2};
const shapeLabels={mirror:'云镜',ribbons:'流环',rain:'银雨'};
const validSeed=seed=>{if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Invalid liquid seed');return seed;};

export function createExperiment(ctx) {
  let params=validateParameters(definition.parameters,ctx.params||{}),seed=validSeed(ctx.seed??42),disposed=false,time=0,metricTime=0,lastMetric=-1,pressed=false;
  const group=new THREE.Group();ctx.scene.add(group);
  const {material,uniforms}=createLiquidGlassMaterial({seed,low:ctx.quality==='low',params});
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);screen.frustumCulled=false;screen.renderOrder=-100;group.add(screen);
  const spring=[0,1,2].map(()=>({position:0,velocity:0})),target=new THREE.Vector3(),anchor=new THREE.Vector3();
  const hit=new THREE.Vector3(),ray=new THREE.Raycaster(),plane=new THREE.Plane(),viewNormal=new THREE.Vector3(),ndc=new THREE.Vector2();
  function frontView(){const offset=ctx.camera.aspect>1.2?-1.65:0;ctx.setCamera([offset+.3,.12,9.65],[offset,-.05,0]);}

  function updateCamera(){ctx.camera.updateMatrixWorld();uniforms.liquidCameraWorld.value.copy(ctx.camera.matrixWorld);uniforms.liquidProjectionInverse.value.copy(ctx.camera.projectionMatrixInverse);uniforms.liquidCameraPosition.value.copy(ctx.camera.position);}
  // Runs for renders while paused as well, keeping manual orbit and zoom honest.
  screen.onBeforeRender=updateCamera;
  function metrics(){ctx.onMetrics({'折射率':`IOR ${params.ior.toFixed(2)}`,'形态':shapeLabels[params.shape],'牵引':`${uniforms.liquidPull.value.length().toFixed(2)} m`,'黏滞感':params.viscosity.toFixed(2)});}
  function apply(){uniforms.liquidIOR.value=params.ior;uniforms.liquidDispersion.value=params.dispersion;uniforms.liquidShape.value=shapes[params.shape];metrics();}
  function reset(nextSeed=seed) {
    if(disposed)return;
    const checked=validSeed(nextSeed);
    if(checked!==seed){const texture=createLiquidCloudTexture(checked,ctx.quality==='low');uniforms.liquidClouds.value.dispose();uniforms.liquidClouds.value=texture;}
    seed=checked;time=0;metricTime=0;lastMetric=-1;pressed=false;target.set(0,0,0);anchor.set(0,0,0);
    for(const state of spring){state.position=0;state.velocity=0;}
    uniforms.liquidPull.value.set(0,0,0);uniforms.liquidAnchor.value.set(0,0,0);uniforms.liquidTime.value=((seed%997)/997-.5)*.7;
    metrics();
  }
  function pointer(input){
    if(disposed)return;
    if(!input||!Number.isFinite(input.x)||!Number.isFinite(input.y)||Math.abs(input.x)>1.01||Math.abs(input.y)>1.01)throw new RangeError('Invalid liquid pointer');
    if(!input.active||!input.pressed){pressed=false;target.set(0,0,0);return;}
    ctx.camera.getWorldDirection(viewNormal);plane.setFromNormalAndCoplanarPoint(viewNormal,new THREE.Vector3());
    ndc.set(input.x,input.y);ray.setFromCamera(ndc,ctx.camera);
    if(!ray.ray.intersectPlane(plane,hit))return;
    if(!pressed){anchor.copy(hit).clampLength(0,3.8);pressed=true;}
    target.copy(hit).sub(anchor).clampLength(0,1.35);
  }
  function dispose(){if(disposed)return;disposed=true;ctx.signal?.removeEventListener('abort',dispose);screen.onBeforeRender=()=>{};disposeGroup(group);}
  ctx.signal?.addEventListener('abort',dispose,{once:true});
  if(ctx.signal?.aborted){dispose();throw new DOMException('Scene aborted','AbortError');}
  frontView();reset();apply();updateCamera();
  return {
    pointer,
    update(dt){
      if(disposed)return;if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid liquid timestep');
      if(dt===0)return;
      time+=dt*params.flow;uniforms.liquidTime.value=time+((seed%997)/997-.5)*.7;
      uniforms.liquidAnchor.value.copy(anchor);
      for(let i=0;i<3;i++){spring[i]=springStep(spring[i],target.getComponent(i),dt,7/params.viscosity);uniforms.liquidPull.value.setComponent(i,spring[i].position);}
      metricTime+=dt;if(Math.floor(metricTime*5)!==lastMetric){lastMetric=Math.floor(metricTime*5);metrics();}
    },
    setParameters(next){params=validateParameters(definition.parameters,{...params,...next});apply();},
    reset,dispose,
    action(key){
      if(key==='pulse'){anchor.set(.4,.3,0);spring[0].velocity=Math.min(8,spring[0].velocity+5);spring[1].velocity=Math.min(8,spring[1].velocity+3);}
      else if(key==='front')frontView();
      else if(key==='new-clouds'){const next=(seed+2654435761)>>>0;reset(next);return {seed:next};}
      else throw new RangeError('Unknown liquid action');
    },
  };
}
