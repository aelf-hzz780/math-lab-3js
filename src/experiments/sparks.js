import * as THREE from '../../vendor/three.module.js';
import { disposeGroup, seededRandom } from '../core/resources.js';
import { particleAt, emissionState } from '../math/sparks.js';

export const definition={
  id:'sparks',title:'火花的轨迹',enTitle:'PARTICLES / DRAG & GRAVITY',kicker:'PARTICLE SYSTEMS',year:'经典力学 · 实时渲染',category:'截图重建',
  description:'每束火花都沿着重力与阻力决定的轨迹飞行。改变发射锥和阻力，看解析运动如何变成光的雕塑。',
  formula:'dv/dt = g − λv\nv(t) = v₀e^(−λt) + g(1 − e^(−λt))/λ\nx(t) = x₀ + v₀(1 − e^(−λt))/λ + g[t − (1 − e^(−λt))/λ]/λ',
  explanation:'模型用重力、线性阻力和固定发射锥决定每颗粒子的运动。λ = 0 时使用抛体运动的连续极限。细线连接当前与稍早的位置；粒子随寿命变暗并在固定容量池中重新发射。每次开始和重置都先将发射时间偏移一个粒子池周期，使时间 0 即能看见稳定喷泉；同一 seed 和参数可复现。画面采用模型单位。',
  limitations:'用于解释运动和粒子系统，不模拟真实燃烧、热传导或复杂空气湍流。粒子互不碰撞；轨迹池持续循环，颜色与亮度是视觉编码。发射率受当前画质的粒子池预算限制，指标显示实际发射率。',
  parameters:[{key:'speed',label:'发射速度',type:'range',min:3,max:12,step:.25,value:9},{key:'drag',label:'线性阻力 λ',type:'range',min:0,max:2,step:.05,value:.25},{key:'gravity',label:'重力 g',type:'range',min:0,max:12,step:.25,value:5},{key:'rate',label:'发射速率 / 粒·s⁻¹',type:'range',min:20,max:1000,step:20,value:700},{key:'direction',label:'发射仰角 / °',type:'range',min:5,max:85,step:1,value:58},{key:'spread',label:'发射锥半角 / °',type:'range',min:5,max:65,step:1,value:30},{key:'lifetime',label:'寿命 / s',type:'range',min:.5,max:3,step:.1,value:2.6}],actions:[],
  presets:[{label:'金色喷泉',params:{speed:9,drag:.25,gravity:5,rate:700,direction:58,spread:30,lifetime:2.6}},{label:'失重星尘',params:{speed:6,drag:.45,gravity:0,rate:800,direction:40,spread:60,lifetime:3}},{label:'流星焊花',params:{speed:11,drag:.1,gravity:9,rate:1000,direction:25,spread:15,lifetime:1.8}}],
  sources:[{label:'Linear drag · 解析运动模型',url:'https://en.wikipedia.org/wiki/Projectile_motion#Trajectory_of_a_projectile_with_air_resistance'}]
};
const defaults=Object.fromEntries(definition.parameters.map(p=>[p.key,p.value]));
function validatedParameters(input){
  const result={...defaults,...input};for(const p of definition.parameters)if(!Number.isFinite(result[p.key])||result[p.key]<p.min||result[p.key]>p.max)throw new RangeError(`${p.key} is outside the supported range`);return result;
}
export function createExperiment(ctx){
  let params=validatedParameters(ctx.params),seed=ctx.seed??42,group,particles,trails,pointPositions,pointColors,trailPositions,trailColors,initial=[],lastMetric=-1;
  const count=ctx.quality==='low'?700:2000,origin=[-4,-1,0],axis=new THREE.Vector3(.78,.625,0).normalize(),side=new THREE.Vector3(-axis.y,axis.x,0),forward=new THREE.Vector3(0,0,1);
  ctx.setCamera([10,6.6,18],[.6,1.5,0]);
  function build(){
    if(group)disposeGroup(group);group=new THREE.Group();ctx.scene.add(group);const random=seededRandom(seed);initial=[];axis.set(Math.cos(params.direction*Math.PI/180),Math.sin(params.direction*Math.PI/180),0);side.set(-axis.y,axis.x,0);
    for(let i=0;i<count;i++){
      const azimuth=random()*Math.PI*2,cone=Math.acos(1-random()*(1-Math.cos(params.spread*Math.PI/180))),direction=axis.clone().multiplyScalar(Math.cos(cone)).addScaledVector(side,Math.sin(cone)*Math.cos(azimuth)).addScaledVector(forward,Math.sin(cone)*Math.sin(azimuth)),speed=params.speed*(.65+random()*.5);
      initial.push({position:[origin[0]+(random()-.5)*.055,origin[1]+(random()-.5)*.055,(random()-.5)*.055],velocity:direction.multiplyScalar(speed).toArray(),phase:random(),lifetime:params.lifetime*(.6+random()*.4),color:new THREE.Color().setHSL(.055+random()*.08,1,.64+random()*.15)});
    }
    pointPositions=new Float32Array(count*3);pointColors=new Float32Array(count*3);trailPositions=new Float32Array(count*6);trailColors=new Float32Array(count*6);
    const pointGeo=new THREE.BufferGeometry();pointGeo.setAttribute('position',new THREE.BufferAttribute(pointPositions,3).setUsage(THREE.DynamicDrawUsage));pointGeo.setAttribute('color',new THREE.BufferAttribute(pointColors,3).setUsage(THREE.DynamicDrawUsage));
    particles=new THREE.Points(pointGeo,new THREE.ShaderMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
      vertexShader:'varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(150.0/-p.z,2.0,14.0);}',
      fragmentShader:'varying vec3 vColor;void main(){float d=length(gl_PointCoord-0.5)*2.0;float a=exp(-d*d*3.8)*smoothstep(1.0,0.65,d);gl_FragColor=vec4(vColor*2.2,a);}'
    }));particles.frustumCulled=false;group.add(particles);
    const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage));trailGeo.setAttribute('color',new THREE.BufferAttribute(trailColors,3).setUsage(THREE.DynamicDrawUsage));trails=new THREE.LineSegments(trailGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));trails.frustumCulled=false;group.add(trails);
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,.7,20),new THREE.MeshStandardMaterial({color:0x4c554f,metalness:.8,roughness:.3}));nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);nozzle.position.fromArray(origin).addScaledVector(axis,-.36);group.add(nozzle);
    const opening=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,10,32),new THREE.MeshBasicMaterial({color:0xffc982}));opening.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),axis);opening.position.fromArray(origin);group.add(opening);
    const emitter=new THREE.Mesh(new THREE.SphereGeometry(.09,18,12),new THREE.MeshBasicMaterial({color:0xffedbc}));emitter.position.fromArray(origin);group.add(emitter);
    const glow=new THREE.PointLight(0xffa342,5,8,2);glow.position.fromArray(origin);group.add(glow);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.25,.16,64),new THREE.MeshStandardMaterial({color:0x142c32,metalness:.75,roughness:.3}));disc.position.set(origin[0],-1.75,0);group.add(disc);
    const baseRing=new THREE.Mesh(new THREE.TorusGeometry(1.15,.012,8,96),new THREE.MeshBasicMaterial({color:0xf29344}));baseRing.rotation.x=Math.PI/2;baseRing.position.set(origin[0],-1.66,0);group.add(baseRing);
    const floor=new THREE.GridHelper(18,36,0x493d31,0x222c29);floor.position.set(1,-2.8,0);floor.material.transparent=true;floor.material.opacity=.28;group.add(floor);lastMetric=-1;
  }
  function update(dt,time){
    let totalSpeed=0,activeCount=0;const rate=Math.min(params.rate,count/params.lifetime);
    for(let i=0;i<count;i++){
      const particle=initial[i],{age,active}=emissionState(i,time+count/rate,{rate,capacity:count,lifetime:particle.lifetime});if(!active){pointPositions.set(origin,i*3);trailPositions.set(origin,i*6);trailPositions.set(origin,i*6+3);pointColors.fill(0,i*3,i*3+3);trailColors.fill(0,i*6,i*6+6);continue;}activeCount++;const current=particleAt(particle.position,particle.velocity,age,params),previous=particleAt(particle.position,particle.velocity,Math.max(0,age-.15),params),fade=Math.pow(1-age/particle.lifetime,.65);
      pointPositions.set(current.position,i*3);trailPositions.set(previous.position,i*6);trailPositions.set(current.position,i*6+3);
      for(let j=0;j<3;j++){const component=j===0?particle.color.r:j===1?particle.color.g:particle.color.b;pointColors[i*3+j]=component*fade;trailColors[i*6+j]=component*fade*.07;trailColors[i*6+3+j]=component*fade;}
      totalSpeed+=Math.hypot(...current.velocity);
    }
    particles.geometry.attributes.position.needsUpdate=true;particles.geometry.attributes.color.needsUpdate=true;trails.geometry.attributes.position.needsUpdate=true;trails.geometry.attributes.color.needsUpdate=true;
    if(Math.floor(time*3)!==lastMetric){lastMetric=Math.floor(time*3);ctx.onMetrics({'活动粒子 / 池容量':`${activeCount} / ${count}`,'实际发射率':rate.toFixed(0)+' / s','向下终端速率':params.drag>0?(params.gravity/params.drag).toFixed(2):'无有限终端值','阻力 λ':params.drag.toFixed(2)});}
  }
  build();update(0,0);
  return {update,setParameters(fullParams){params=validatedParameters(fullParams);particleAt(origin,[0,0,0],0,params);build();update(0,0);},reset(nextSeed){seed=nextSeed??seed;build();update(0,0);},dispose(){disposeGroup(group);},action(){}};
}
