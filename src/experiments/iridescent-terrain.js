import * as THREE from '../../vendor/three.module.js';
import {validateParameters} from '../core/state.js';
import {disposeGroup} from '../core/resources.js';
import {createTerrainGenerator,desiredTerrainChunks} from '../core/terrain-stream.js';
import {createStrataEnvironment,createStrataMaterial} from '../rendering/strata-material.js';

export const definition={
  id:'iridescent-terrain',title:'虹彩异境',enTitle:'Iridescent Strata',kicker:'18 / PROCEDURAL WORLDS',
  year:'2026 · 视频视觉参考 / 经典图形算法',category:'程序化图形',
  description:'穿过连绵的悬浮云屿，让雾蓝、淡紫和浅桃色缓缓交融。',
  formula:'F = smoothMin(volume bands, openings, envelope)；surface: F(x,y,z) = 0',
  explanation:'低频噪声扭曲三维体积层，平滑交集把孔洞与层体圆润地连接。Marching Tetrahedra 提取连续等值面，相邻区块共用世界坐标采样与法线。雾蓝、淡紫和浅桃色沿空间缓慢晕染；宽光源与粗糙漫反射让轮廓更加柔和。拖动可环视，滚轮可拉近，播放时云屿从身边掠过。',
  limitations:'这是受 Cristian Peñas 的程序化地形视频启发的原创图形实验。我们尚未取得或核验作者的具体算法，不声称复现其 Unity 实现，也不把它作为 AI 发现的新数学结构。孔洞由有限网格近似，小于网格的细节可能消失；虹彩包含艺术化着色，并非测量所得物理光谱。这是云团般的表面近似，不计算真实云雾的体积散射。持续生成只覆盖相机附近的有限窗口，手动远离该窗口可能看到边缘；不模拟碰撞、岩石物理或地质演化。',
  parameters:[
    {key:'layers',label:'地层密度',type:'range',min:.65,max:1.55,step:.05,value:1},
    {key:'holes',label:'孔洞尺度',type:'range',min:.65,max:1.8,step:.05,value:1.1},
    {key:'iridescence',label:'色彩晕染',type:'range',min:0,max:1,step:.05,value:.8},
    {key:'roughness',label:'表面粗糙度',type:'range',min:.3,max:.9,step:.01,value:.68},
    {key:'speed',label:'穿行速度',type:'range',min:0,max:6,step:.1,value:2.4},
  ],
  presets:[
    {label:'晨雾云屿',params:{layers:1,holes:1.1,iridescence:.8,roughness:.68,speed:2.4}},
    {label:'层叠梦境',params:{layers:1.4,holes:.85,iridescence:1,roughness:.75,speed:1.7}},
    {label:'月白浮岛',params:{layers:.7,holes:1.65,iridescence:.25,roughness:.58,speed:3.8}},
  ],
  actions:[{key:'fly',label:'贴近穿行'},{key:'overview',label:'俯瞰群岛'},{key:'new-world',label:'另一片异境'}],
  sources:[
    {label:'视觉参考 · Cristian Peñas / @ilumine_ai · 2026-09-11',url:'https://x.com/ilumine_ai/status/2098342499865821654'},
    {label:'作者相关说明 · procedural latent space / Unity',url:'https://x.com/ilumine_ai/status/2098052245900448127'},
    {label:'Paul Bourke · Polygonising a scalar field / tetrahedrons',url:'https://paulbourke.net/geometry/polygonise/'},
    {label:'Three.js · MeshPhysicalMaterial / iridescence',url:'https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial'},
  ],
};

const size=24,height=20;
const flightView={position:[15,13,25],target:[0,-1,-16]};

function validSeed(seed){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Invalid terrain seed');
  return seed;
}

export async function createExperiment(ctx,{generatorFactory=createTerrainGenerator}={}){
  if(typeof generatorFactory!=='function')throw new TypeError('Invalid terrain generator factory');
  let params=validateParameters(definition.parameters,ctx.params||{}),seed=validSeed(ctx.seed??42);
  let distance=0,visibleDistance=0,windowStep=0,disposed=false,generation=0,generator,timer,lastMeter=-1,rebuilding=false,streaming=false;
  let meshes=new Map(),pendingError=null;
  const staged=new Map();
  const group=new THREE.Group();ctx.scene.add(group);
  const environment=createStrataEnvironment();
  const previousEnvironment=ctx.scene.environment,previousBackground=ctx.scene.background,previousFog=ctx.scene.fog;
  ctx.scene.environment=environment;ctx.scene.background=new THREE.Color(0x010105);
  ctx.scene.fog=new THREE.FogExp2(0x060812,.022);
  // The scene's broad neutral light avoids small saturated specular highlights.
  ctx.scene.children.filter(object=>object.isLight).forEach(light=>{light.intensity*=.2;});
  const {material,uniforms}=createStrataMaterial(params);
  const cyan=new THREE.DirectionalLight(0xf2f0ff,1.65);cyan.position.set(-8,9,4);group.add(cyan);
  const violet=new THREE.DirectionalLight(0xf4dbe9,.45);violet.position.set(9,3,-15);group.add(violet);
  const resolution=ctx.quality==='low'?32:48;
  const plan=(at=distance)=>desiredTerrainChunks(at,{size,columns:3,ahead:3,behind:1});

  function metrics(){
    if(disposed)return;
    let triangles=0;for(const mesh of meshes.values())triangles+=mesh.geometry.index.count/3;
    ctx.onMetrics({'已穿行':`${distance.toFixed(1)} m`,'常驻地层':`${meshes.size} 区块`,'表面三角形':Math.round(triangles).toLocaleString('en-US'),
      '生成状态':rebuilding?'雕刻新异境…':streaming?(distance>=(windowStep+1)*size?'等待前方地层…':'预载前方地层…'):generator?.backend==='worker'?'后台生成 · 就绪':'兼容生成 · 就绪'});
  }
  function discard(map){for(const mesh of map.values()){mesh.removeFromParent();mesh.geometry.dispose();}map.clear();}
  function makeMesh(chunk,shape){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(shape.positions,3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(shape.normals,3));
    geometry.setAttribute('strataOcclusion',new THREE.BufferAttribute(shape.occlusion||new Float32Array(shape.positions.length/3).fill(1),1));
    geometry.setIndex(new THREE.BufferAttribute(shape.indices,1));geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,material);mesh.userData.chunk=chunk;
    mesh.position.set((chunk.ix-.5)*size,0,chunk.iz*size+distance);
    return mesh;
  }
  function report(error){
    if(disposed||error.name==='AbortError')return;
    pendingError=error;
    ctx.onError?.(error);
  }
  function ordered(chunks){return [...chunks].sort((a,b)=>Math.abs(a.iz*size+distance+12)+Math.abs(a.ix)*12-Math.abs(b.iz*size+distance+12)-Math.abs(b.ix)*12);}

  async function rebuild(){
    clearTimeout(timer);
    const version=++generation;
    generator?.dispose();generator=generatorFactory();
    discard(staged);
    const worker=generator;
    const next=new Map(),snapshot={seed,layers:params.layers,holes:params.holes,resolution,size,height};
    rebuilding=true;streaming=false;metrics();
    try{
      for(const chunk of ordered(plan())){
        const shape=await worker.generate({...snapshot,...chunk});
        if(disposed||version!==generation)return;
        next.set(chunk.key,makeMesh(chunk,shape));
      }
      if(disposed||version!==generation)return;
      discard(meshes);meshes=next;
      windowStep=Math.floor(distance/size);
      visibleDistance=distance;uniforms.strataTravel.value=visibleDistance;
      for(const mesh of meshes.values())group.add(mesh);
      rebuilding=false;metrics();
    }finally{
      if(meshes!==next)discard(next);
    }
  }

  function commitPrefetch(){
    if(staged.size!==3)return false;
    const desired=plan((windowStep+1)*size),keep=new Set(desired.map(chunk=>chunk.key));
    const incoming=desired.filter(chunk=>!meshes.has(chunk.key));
    if(incoming.length!==3||incoming.some(chunk=>!staged.has(chunk.key)))return false;
    // Swap a complete row in one task; partial prefetch never changes the mounted window.
    for(const [key,mesh]of meshes)if(!keep.has(key)){mesh.removeFromParent();mesh.geometry.dispose();meshes.delete(key);}
    for(const chunk of incoming){
      const mesh=staged.get(chunk.key);staged.delete(chunk.key);
      mesh.position.z=chunk.iz*size+visibleDistance;meshes.set(chunk.key,mesh);group.add(mesh);
    }
    windowStep++;
    return true;
  }

  async function prefetch(){
    if(disposed||rebuilding||streaming||staged.size===3||distance<(windowStep+.5)*size)return;
    const targetStep=windowStep+1,missing=ordered(plan(targetStep*size).filter(chunk=>!meshes.has(chunk.key)));
    const version=generation,worker=generator,snapshot={seed,layers:params.layers,holes:params.holes,resolution,size,height};
    streaming=true;metrics();
    try{
      for(const chunk of missing){
        const shape=await worker.generate({...chunk,...snapshot});
        if(disposed||version!==generation||targetStep!==windowStep+1)return;
        staged.set(chunk.key,makeMesh(chunk,shape));
      }
      if(distance>=targetStep*size)commitPrefetch();
    }catch(error){if(version===generation)report(error);}
    finally{if(version===generation){streaming=false;metrics();}}
  }

  function requestRebuild(){
    // Coalesce slider events and the preset's immediate reset; preserve visible geometry until replacement.
    clearTimeout(timer);++generation;generator?.dispose();discard(staged);rebuilding=true;streaming=false;metrics();
    timer=setTimeout(()=>{
      const task=rebuild(),version=generation;
      task.catch(error=>{if(version===generation)report(error);});
    },100);
  }
  function setParameters(next){
    const checked=validateParameters(definition.parameters,{...params,...next});
    const changed=checked.layers!==params.layers||checked.holes!==params.holes;
    const changesShader=(params.iridescence===0)!==(checked.iridescence===0);
    params=checked;material.iridescence=params.iridescence*.08;material.roughness=params.roughness;
    if(changesShader)material.needsUpdate=true;
    uniforms.strataIridescence.value=params.iridescence;
    if(changed)requestRebuild();
  }
  function reset(nextSeed=seed){
    // Keep the displayed world and its shader coordinates fixed until the replacement is ready.
    seed=validSeed(nextSeed);distance=0;lastMeter=-1;
    requestRebuild();
  }
  function dispose(){
    if(disposed)return;disposed=true;++generation;clearTimeout(timer);generator?.dispose();
    ctx.signal?.removeEventListener('abort',dispose);
    discard(staged);discard(meshes);disposeGroup(group);material.dispose();environment.dispose();
    if(ctx.scene.environment===environment){ctx.scene.environment=previousEnvironment;ctx.scene.background=previousBackground;ctx.scene.fog=previousFog;}
  }
  ctx.signal?.addEventListener('abort',dispose,{once:true});
  if(ctx.signal?.aborted){dispose();throw new DOMException('Scene aborted','AbortError');}
  ctx.setCamera(flightView.position,flightView.target,{fitAspect:false});
  try{await rebuild();}catch(error){dispose();throw error;}
  return {
    update(dt){
      if(disposed)return;
      if(pendingError)throw pendingError;
      if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid terrain time step');
      if(!rebuilding){
        const next=distance+Math.min(dt,.05)*params.speed,boundary=(windowStep+1)*size;
        distance=next>=boundary&&!commitPrefetch()?boundary:next;
        visibleDistance=distance;
      }
      uniforms.strataTravel.value=visibleDistance;
      for(const mesh of meshes.values())mesh.position.z=mesh.userData.chunk.iz*size+visibleDistance;
      if(!rebuilding)prefetch().catch(report);
      if(Math.floor(distance*5)!==lastMeter){lastMeter=Math.floor(distance*5);metrics();}
    },
    setParameters,reset,dispose,
    action(key){
      if(key==='fly')ctx.setCamera([0,2.2,8],[0,.9,-18],{fitAspect:false});
      else if(key==='overview')ctx.setCamera([20,17,23],[0,-1,-15],{fitAspect:false});
      else if(key==='new-world'){const nextSeed=(seed+2654435761)>>>0;reset(nextSeed);return {seed:nextSeed};}
      else throw new RangeError('Unknown terrain action');
    },
  };
}
