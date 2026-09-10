import * as THREE from '../../vendor/three.module.js';
import { disposeGroup, seededRandom } from '../core/resources.js';
import { WAVES, waveSample, makeBody, stepBuoyancy, impactEvent, fixedSteps } from '../math/ocean.js';

export const definition={
  id:'ocean',title:'海水、浮力与尾流',enTitle:'Waves & Wakes',kicker:'05 / FLUID MOTION',year:'经典模型 · 深水重力波',category:'自然与计算',
  description:'五组深水波相遇，船体逐点响应，尾流记录运动的轨迹。',
  formula:'η(x,z,t) = Σ Aⱼ cos(kⱼ·x − ωⱼt + φⱼ),  ωⱼ² = g|kⱼ|',
  explanation:'波长越短，角频率越高。船底四个采样点分别计算浸没深度，通过线性浮力和阻尼更新升沉、俯仰与横摇。尾部浅色泡沫由航速触发；从空中投放的浮体在快速穿越水面时另外产生弹道飞溅。',
  limitations:'波面是线性深水波叠加，不是完整 Navier–Stokes 求解器。尾流采用约 19.47° 的 Kelvin 楔形视觉近似；泡沫和飞溅不反作用于波场，浮力采用离散船底和小角度近似。',
  parameters:[
    {key:'amplitude',label:'波浪振幅',type:'range',min:0,max:1.4,step:.05,value:.85},
    {key:'speed',label:'航速',type:'range',min:0,max:4,step:.1,value:2.6},
    {key:'turn',label:'转向角速度',type:'range',min:-.6,max:.6,step:.02,value:.18},
    {key:'body',label:'浮体形状',type:'select',value:'boat',options:[{value:'boat',label:'动力小船'},{value:'buoy',label:'球形浮标'},{value:'crate',label:'木质浮箱'}]},
  ],actions:[{key:'drop',label:'投放浮体'},{key:'left',label:'左转'},{key:'right',label:'右转'},{key:'stop',label:'停船 / 继续'}],
  presets:[{label:'逐浪航行',params:{amplitude:.85,speed:2.6,turn:.18,body:'boat'}},{label:'风平浪静',params:{amplitude:.15,speed:1.5,turn:.08,body:'boat'}},{label:'大浪浮标',params:{amplitude:1.35,speed:0,turn:0,body:'buoy'}}],
  sources:[{label:'MIT · Deep Water Waves',url:'https://web.mit.edu/fluids-modules/www/waves.html'},{label:'Kelvin ship-wave pattern · Encyclopedia of Mathematics',url:'https://encyclopediaofmath.org/wiki/Kelvin_ship-wave_pattern'},{label:'GPU Gems · Effective Water Simulation',url:'https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models'}],
};

const waveGLSL=WAVES.map(w=>`addWave(p.xz,${w.amplitude.toFixed(3)},${w.k.toFixed(3)},${w.direction.toFixed(3)},${w.phase.toFixed(3)},h,gradient);`).join('\n');
function makeVessel() {
  const group=new THREE.Group();
  const white=new THREE.MeshStandardMaterial({color:0xf3f4e6,roughness:.25,metalness:.22});
  const dark=new THREE.MeshStandardMaterial({color:0x084959,roughness:.22,metalness:.4});
  const wood=new THREE.MeshStandardMaterial({color:0xbe8050,roughness:.72});
  const shape=new THREE.Shape();shape.moveTo(0,-1.85);shape.bezierCurveTo(.5,-1.65,.79,-.95,.79,.5);shape.lineTo(.64,1.45);shape.lineTo(-.64,1.45);shape.lineTo(-.79,.5);shape.bezierCurveTo(-.79,-.95,-.5,-1.65,0,-1.85);
  const hull=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.55,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.1,bevelThickness:.08}),dark);hull.rotation.x=Math.PI/2;hull.position.y=.19;group.add(hull);
  const deck=new THREE.Mesh(new THREE.ShapeGeometry(shape),wood);deck.rotation.x=Math.PI/2;deck.material.side=THREE.DoubleSide;deck.position.y=.22;group.add(deck);
  function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;}
  box(.95,.7,1.1,0,.6,-.16,white);box(1.18,.1,1.42,0,1.0,-.14,white);
  box(.97,.35,.7,0,.67,-.2,new THREE.MeshStandardMaterial({color:0x073c53,metalness:.75,roughness:.12,emissive:0x06405d,emissiveIntensity:.25}));
  box(.72,.27,.27,0,.41,.85,white);box(.43,.62,.3,0,.0,1.58,dark);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.6,8),white);mast.position.set(0,1.35,.16);group.add(mast);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.065,10,6),new THREE.MeshBasicMaterial({color:0xffdca4}));lamp.position.set(0,1.68,.16);group.add(lamp);
  const railMaterial=new THREE.LineBasicMaterial({color:0xd3f5ee});
  for(const side of [-1,1]){const points=[new THREE.Vector3(side*.58,.5,1.1),new THREE.Vector3(side*.69,.5,.5),new THREE.Vector3(side*.62,.5,-.8),new THREE.Vector3(0,.5,-1.65)];group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),railMaterial));for(const z of [-.65,.4,1.05]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.28,6),white);post.position.set(side*.62,.36,z);group.add(post);}}
  const lifeRing=new THREE.Mesh(new THREE.TorusGeometry(.18,.055,8,28),new THREE.MeshStandardMaterial({color:0xff6e37,roughness:.4}));lifeRing.position.set(.67,.44,.85);lifeRing.rotation.y=Math.PI/2;group.add(lifeRing);
  box(.03,.37,.77,0,.68,-.2,white);
  return group;
}

export function createExperiment(ctx) {
  let params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),...ctx.params},random=seededRandom(ctx.seed??42);
  const group=new THREE.Group();ctx.scene.add(group);ctx.setCamera([12,7.4,15],[2,0,-1]);
  const modelGroup=new THREE.Group();group.add(modelGroup);
  const vessel=makeVessel();modelGroup.add(vessel);
  const buoy=new THREE.Mesh(new THREE.SphereGeometry(.82,28,18),new THREE.MeshStandardMaterial({color:0xf2a248,roughness:.28,metalness:.2}));modelGroup.add(buoy);
  const crate=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.15,1.4),new THREE.MeshStandardMaterial({color:0xae794e,roughness:.8}));modelGroup.add(crate);
  const crateEdges=new THREE.LineSegments(new THREE.EdgesGeometry(crate.geometry),new THREE.LineBasicMaterial({color:0x56381c}));crate.add(crateEdges);
  const sun=new THREE.Vector3(-.45,.28,-.85).normalize();
  const uniforms={uTime:{value:0},uAmplitude:{value:params.amplitude},uBoat:{value:new THREE.Vector3(5,0,0)},uHeading:{value:0},uSpeed:{value:2.6},uSun:{value:sun}};
  const waterGeometry=new THREE.PlaneGeometry(130,130,ctx.quality==='low'?128:224,ctx.quality==='low'?128:224);waterGeometry.rotateX(-Math.PI/2);
  const waterMaterial=new THREE.ShaderMaterial({uniforms,
    vertexShader:`uniform float uTime,uAmplitude,uSpeed,uHeading;uniform vec3 uBoat;varying vec3 vWorld,vNormal;varying float vWake;
    void addWave(vec2 p,float a,float k,float direction,float phase,inout float h,inout vec2 gradient){vec2 d=vec2(cos(direction),sin(direction));float theta=k*dot(d,p)-sqrt(9.81*k)*uTime+phase;h+=uAmplitude*a*cos(theta);gradient-=uAmplitude*a*k*d*sin(theta);}
    void main(){vec3 p=position;float h=0.;vec2 gradient=vec2(0.);${waveGLSL}
    vec2 d=p.xz-uBoat.xz;float c=cos(uHeading),s=sin(uHeading);vec2 q=vec2(c*d.x-s*d.y,s*d.x+c*d.y);float stern=max(0.,q.y-1.);float arm=abs(q.x)-stern*.35355;float wake=exp(-arm*arm*2.)*exp(-stern*.09)*smoothstep(.5,3.,stern)*(1.-smoothstep(18.,26.,stern));vWake=wake*min(1.,uSpeed*.3);h+=sin(arm*7.-uTime*4.)*vWake*.095;
    p.y=h;vWorld=(modelMatrix*vec4(p,1.)).xyz;vNormal=normalize(vec3(-gradient.x,1.,-gradient.y));gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`uniform float uTime;uniform vec3 uSun;varying vec3 vWorld,vNormal;varying float vWake;
    vec3 sky(vec3 d){float h=max(0.,d.y);vec3 col=mix(vec3(.37,.28,.23),vec3(.03,.16,.25),pow(h,.45));col+=vec3(.5,.25,.10)*pow(max(0.,dot(d,uSun)),35.);return col;}
    void main(){vec2 ripple=vec2(sin(vWorld.x*12.+vWorld.z*7.+uTime*1.3),cos(vWorld.z*16.-vWorld.x*9.-uTime*1.5))*.024;vec3 n=normalize(vNormal+vec3(ripple.x,0.,ripple.y));vec3 eye=normalize(cameraPosition-vWorld);float fresnel=.025+.975*pow(1.-max(0.,dot(n,eye)),4.);vec3 reflected=sky(reflect(-eye,n));vec3 deep=mix(vec3(.004,.065,.09),vec3(.012,.24,.27),clamp(vWorld.y*.55+.42,0.,1.));vec3 col=mix(deep,reflected,fresnel*.84);float halfDot=max(0.,dot(n,normalize(eye+uSun)));float glint=pow(halfDot,170.);col+=vec3(1.,.77,.47)*(glint*1.7+pow(halfDot,24.)*.13);col+=vec3(.01,.1,.12)*pow(max(0.,1.-clamp(n.y,0.,1.)),.65);float foam=vWake*(.55+.45*sin(vWorld.x*17.+vWorld.z*11.+uTime*4.));col=mix(col,vec3(.58,.88,.80),foam*.44);float fog=1.-exp(-length(cameraPosition-vWorld)*.012);col=mix(col,vec3(.065,.15,.18),fog);gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const water=new THREE.Mesh(waterGeometry,waterMaterial);water.frustumCulled=false;group.add(water);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(170,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uSun:uniforms.uSun},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform vec3 uSun;varying vec3 vDir;void main(){vec3 d=normalize(vDir);vec3 c=mix(vec3(.065,.15,.18),vec3(.012,.045,.095),pow(max(0.,d.y),.4));c+=vec3(.38,.23,.13)*pow(max(0.,dot(d,uSun)),9.);c+=vec3(1.,.78,.48)*smoothstep(.9993,.9997,dot(d,uSun))*2.;gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`}));sky.renderOrder=-5;group.add(sky);
  const localLight=new THREE.DirectionalLight(0xffe0b2,2.7);localLight.position.copy(sun).multiplyScalar(20);group.add(localLight);
  const foamCapacity=ctx.quality==='low'?170:380,splashCapacity=ctx.quality==='low'?160:400;
  const foams=Array.from({length:foamCapacity},()=>({age:99,x:0,z:0,life:1,size:1}));let foamIndex=0;
  const foamMesh=new THREE.InstancedMesh(new THREE.CircleGeometry(1,8),new THREE.MeshBasicMaterial({color:0xcee9dd,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide}),foamCapacity);foamMesh.frustumCulled=false;group.add(foamMesh);
  const dummy=new THREE.Object3D();
  const splashes=Array.from({length:splashCapacity},()=>({age:99,life:1,x:0,y:0,z:0,vx:0,vy:0,vz:0}));let splashIndex=0;
  const splashPositions=new Float32Array(splashCapacity*3),splashAlpha=new Float32Array(splashCapacity);
  const splashGeometry=new THREE.BufferGeometry();splashGeometry.setAttribute('position',new THREE.BufferAttribute(splashPositions,3));splashGeometry.setAttribute('alpha',new THREE.BufferAttribute(splashAlpha,1));splashGeometry.setDrawRange(0,0);
  const splashMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uSize:{value:ctx.quality==='low'?15:21}},vertexShader:'attribute float alpha;uniform float uSize;varying float vAlpha;void main(){vAlpha=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uSize/max(1.,-mv.z),1.,7.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vAlpha;void main(){if(vAlpha<=0.)discard;float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.75,.94,.93,(1.-smoothstep(.12,.5,d))*vAlpha);}' });
  const splashPoints=new THREE.Points(splashGeometry,splashMaterial);splashPoints.frustumCulled=false;group.add(splashPoints);
  const drops=[];const dropGeometry=new THREE.SphereGeometry(.34,16,10),dropMaterial=new THREE.MeshStandardMaterial({color:0xf0a552,roughness:.4});
  // Keep shared drop assets attached for uniform disposal, even before first drop.
  const assetHolder=new THREE.Mesh(dropGeometry,dropMaterial);assetHolder.visible=false;group.add(assetHolder);
  let body=makeBody(5,0),carry=0,simulationTime=0,stopped=false,steeringOffset=0,lastMetrics=-1,splashCount=0;
  function emitSplash(x,y,z,intensity=3){splashCount++;for(let i=0;i<48;i++){const p=splashes[splashIndex++%splashCapacity],a=random()*Math.PI*2,v=.6+random()*intensity;Object.assign(p,{age:0,life:.6+random()*.9,x,y:y+.08,z,vx:Math.cos(a)*v,vy:1+random()*intensity,vz:Math.sin(a)*v});}}
  function emitFoam(x,z,size=.12){Object.assign(foams[foamIndex++%foamCapacity],{age:0,life:2.8+random()*2,x,z,size:size*(.6+random()*.9)});}
  function emitVelocityFoam(movingBody,dt,width,rear){if(movingBody.speed<=.25)return;movingBody.wakeCarry=(movingBody.wakeCarry||0)+dt*movingBody.speed*19;while(movingBody.wakeCarry>=1){movingBody.wakeCarry--;const side=(random()-.5)*width;emitFoam(movingBody.x+Math.sin(movingBody.heading)*rear+Math.cos(movingBody.heading)*side,movingBody.z+Math.cos(movingBody.heading)*rear-Math.sin(movingBody.heading)*side,.08+width*.03);}}
  function setParameters(next){const prior=params.body;params={...params,...next};uniforms.uAmplitude.value=Number(params.amplitude);vessel.visible=params.body==='boat';buoy.visible=params.body==='buoy';crate.visible=params.body==='crate';if(prior!==params.body)body=makeBody(body.x,body.z);if(params.body==='buoy')body.points=[[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]];if(params.body==='crate')body.points=[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]];}
  setParameters(params);
  function integrate(dt){simulationTime+=dt;body.speed=stopped?0:Number(params.speed);body.heading+=(Number(params.turn)+steeringOffset)*dt;body.x-=Math.sin(body.heading)*body.speed*dt;body.z-=Math.cos(body.heading)*body.speed*dt;
    // The bounded demonstration basin keeps the vessel inside the orbit view.
    if(Math.hypot(body.x,body.z)>19){body.heading=Math.atan2(body.x,body.z);}
    stepBuoyancy(body,dt,(x,z)=>waveSample(x,z,simulationTime,params.amplitude).height);
    emitVelocityFoam(body,dt,1.3,1.7);
    for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.age+=dt;const previous=d.body.y-.32-waveSample(d.body.x,d.body.z,simulationTime-dt,params.amplitude).height;d.body.x-=Math.sin(d.body.heading)*d.body.speed*dt;d.body.z-=Math.cos(d.body.heading)*d.body.speed*dt;const surface=waveSample(d.body.x,d.body.z,simulationTime,params.amplitude).height;if(!d.hit){d.body.vy-=9.81*dt;d.body.y+=d.body.vy*dt;const current=d.body.y-.32-surface;if(impactEvent(previous,current,d.body.vy)){d.hit=true;emitSplash(d.body.x,surface,d.body.z,Math.min(5,Math.abs(d.body.vy)*.55));}}else{d.body.speed*=Math.exp(-.22*dt);emitVelocityFoam(d.body,dt,.45,.3);stepBuoyancy(d.body,dt,(x,z)=>waveSample(x,z,simulationTime,params.amplitude).height);}d.mesh.position.set(d.body.x,d.body.y,d.body.z);if(d.age>15){d.mesh.removeFromParent();drops.splice(i,1);}}
  }
  function renderParticles(dt){let visibleFoam=0,visibleSplash=0;
    for(let i=0;i<foamCapacity;i++){const p=foams[i];p.age+=dt;if(p.age<p.life){const progress=p.age/p.life;dummy.position.set(p.x,waveSample(p.x,p.z,simulationTime,params.amplitude).height+.045,p.z);dummy.rotation.set(-Math.PI/2,0,0);const size=p.size*(1+progress*2)*(1-progress*.9);dummy.scale.setScalar(size);visibleFoam++;}else dummy.scale.setScalar(0);dummy.updateMatrix();foamMesh.setMatrixAt(i,dummy.matrix);}foamMesh.instanceMatrix.needsUpdate=true;
    for(let i=0;i<splashCapacity;i++){const p=splashes[i];p.age+=dt;if(p.age>=p.life)continue;const offset=visibleSplash*3;splashPositions[offset]=p.x+p.vx*p.age;splashPositions[offset+1]=p.y+p.vy*p.age-4.905*p.age*p.age;splashPositions[offset+2]=p.z+p.vz*p.age;splashAlpha[visibleSplash]=Math.max(0,1-p.age/p.life);visibleSplash++;}
    // Only live drops enter the draw range; dormant slots never reach the rasterizer.
    splashGeometry.setDrawRange(0,visibleSplash);splashGeometry.attributes.position.needsUpdate=true;splashGeometry.attributes.alpha.needsUpdate=true;return {visibleFoam,visibleSplash};
  }
  return {
    update(dt,time){carry=fixedSteps(dt,carry,integrate);uniforms.uTime.value=simulationTime;uniforms.uBoat.value.set(body.x,body.y,body.z);uniforms.uHeading.value=body.heading;uniforms.uSpeed.value=body.speed;modelGroup.position.set(body.x,body.y,body.z);modelGroup.rotation.set(body.pitch,body.heading,body.roll,'YXZ');const counts=renderParticles(dt);if(Math.floor(time*2)!==lastMetrics){lastMetrics=Math.floor(time*2);ctx.onMetrics({'航速':`${body.speed.toFixed(1)} m/s`,'四点升沉':`${body.y.toFixed(2)} m`,'尾流泡沫':`${counts.visibleFoam} 粒`,'入水飞溅':`${splashCount} 次`});}},
    setParameters,
    action(key){if(key==='left')steeringOffset+=.12;if(key==='right')steeringOffset-=.12;if(key==='stop')stopped=!stopped;if(key==='drop'){const b=makeBody(body.x-2+(random()-.5)*2,body.z+(random()-.5)*3);b.y=4.5;b.speed=1.4+random()*1.2;b.heading=random()*Math.PI*2;b.draft=.32;b.stiffness=42;b.points=[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]];const mesh=new THREE.Mesh(dropGeometry,dropMaterial);mesh.position.set(b.x,b.y,b.z);group.add(mesh);drops.push({body:b,mesh,hit:false,age:0});if(drops.length>8){drops.shift().mesh.removeFromParent();}}},
    reset(seed){random=seededRandom(seed??42);body=makeBody(5,0);carry=simulationTime=0;steeringOffset=0;stopped=false;splashCount=0;lastMetrics=-1;for(const p of foams)p.age=99;for(const p of splashes)p.age=99;for(const d of drops)d.mesh.removeFromParent();drops.length=0;setParameters(params);},
    dispose(){disposeGroup(group);},
  };
}
