import * as THREE from '../../vendor/three.module.js';
import { disposeGroup, seededRandom } from '../core/resources.js';
import { coreRadius, burgersVorticity, vortexTrajectory } from '../math/vortex.js';

export const definition={
  id:'vortex',title:'有限核涡旋',enTitle:'VORTEX / AXIAL STRAIN',kicker:'FLOW SYSTEMS',year:'1948 · 2026 研究背景',category:'截图重建',
  description:'沿着旋转的流线，观察轴向拉伸如何集中涡量。青绿与琥珀色的光点追踪同一个光滑解析流场。',
  formula:'uᵣ = −ar/2    uᵧ = ay    uθ = Γ(1 − e^(−r²/r꜀²))/(2πr)\nr꜀ = √(4ν/a)    ωᵧ = Γe^(−r²/r꜀²)/(πr꜀²)',
  explanation:'Burgers vortex 将径向汇聚、轴向拉伸和黏性扩散结合起来。y 是轴向，光点沿积分流线移动；中央环标记特征核心半径 r꜀。增大拉伸率会缩小核心，增大黏度会扩散核心。截面模式显示 y = 0 平面的轴向涡量，颜色从暗青到亮琥珀对应低到高；环仍标记 r꜀。显示的是无量纲模型值。2026-09-08 的 OpenAI 公告声明得到光滑外力下的有限时间奇点证明（C/D 分支）；2026-09-09 核验时 Clay 页面仍标 Unsolved。这里的 Burgers 解析模型仅解释径向收缩与轴向拉伸机制。',
  limitations:'解析教学模型，不是 LBM、DNS 或 OpenAI 2026 证明的复现。所有有限正黏度、正拉伸参数下核心光滑；画面收缩不表示有限时间奇点。流线以有限时间与有限空间截断，边缘重新出现的点是可视化示踪粒子。',
  parameters:[{key:'view',label:'观察方式',type:'select',value:'streamlines',options:[{value:'streamlines',label:'流线与示踪'},{value:'particles',label:'粒子流'},{value:'section',label:'涡量截面'}]},{key:'strain',label:'轴向拉伸 a',type:'range',min:.2,max:1.6,step:.05,value:.65},{key:'viscosity',label:'黏度 ν',type:'range',min:.03,max:.4,step:.01,value:.12},{key:'circulation',label:'环量 Γ',type:'range',min:2,max:24,step:.5,value:14}],actions:[],
  presets:[{label:'翡翠风暴',params:{view:'streamlines',strain:.65,viscosity:.12,circulation:18}},{label:'金色细旋',params:{view:'streamlines',strain:1.2,viscosity:.05,circulation:22}},{label:'剖开涡心',params:{view:'section',strain:.85,viscosity:.2,circulation:16}}],
  sources:[{label:'Burgers vortex · 模型与方程',url:'https://en.wikipedia.org/wiki/Burgers_vortex'},{label:'2026-09-08 · OpenAI 原始研究公告',url:'https://openai.com/index/navier-stokes-solution/'},{label:'Clay Mathematics Institute · 问题与状态',url:'https://www.claymath.org/millennium/navier-stokes-equation/'}]
};
const defaults=Object.fromEntries(definition.parameters.map(p=>[p.key,p.value]));
function validatedParameters(input){
  const result={...defaults,...input};for(const p of definition.parameters){if(p.type==='select'){if(!p.options.some(o=>o.value===result[p.key]))throw new RangeError(`${p.key} is outside the supported range`);}else if(!Number.isFinite(result[p.key])||result[p.key]<p.min||result[p.key]>p.max)throw new RangeError(`${p.key} is outside the supported range`);}return result;
}
export function createExperiment(ctx){
  let params=validatedParameters(ctx.params),group,paths=[],particles,particlePositions,seeds=[],radiusRing,flowLines,section,seed=ctx.seed??42,lastMetric=-1;
  const count=ctx.quality==='low'?70:136,segments=ctx.quality==='low'?140:220,perPath=ctx.quality==='low'?8:14;
  ctx.setCamera([9.2,3.4,12],[0,0,0]);
  function build(){
    if(group)disposeGroup(group);group=new THREE.Group();ctx.scene.add(group);paths=[];seeds=[];const random=seededRandom(seed),vertices=[],colors=[];
    const teal=new THREE.Color('#40ffe2'),gold=new THREE.Color('#ffad48');
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2*1.618+random()*.2,sign=i%2?1:-1,startY=sign*(.12+random()*.65),startR=3.25+random()*1.3,duration=Math.log(5.2/Math.abs(startY))/params.strain;
      const color=i%5===0?gold:teal.clone().lerp(new THREE.Color('#209dbe'),random()*.6);
      const points=vortexTrajectory([Math.cos(angle)*startR,startY,Math.sin(angle)*startR],duration,segments,params);paths.push({points,duration,color});
      for(let k=0;k<segments;k++){const brightness=.18+.64*Math.sin(Math.PI*(k/segments))**.45;vertices.push(...points[k],...points[k+1]);for(let j=0;j<2;j++)colors.push(color.r*brightness,color.g*brightness,color.b*brightness);}
      for(let k=0;k<perPath;k++)seeds.push({path:i,phase:(k+random()*.3)/perPath,color});
    }
    const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));lineGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    flowLines=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(flowLines);flowLines.visible=params.view==='streamlines';
    // Tube centerlines use the same integrated trajectories; their radius is a display width.
    const tubePositions=[],tubeNormals=[],tubeColors=[],tubeIndices=[],sides=ctx.quality==='low'?4:6;
    const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),reference=new THREE.Vector3(0,1,0);
    for(let pathIndex=0;pathIndex<paths.length;pathIndex+=3){const {points,color}=paths[pathIndex],base=tubePositions.length/3;
      for(let k=0;k<=segments;k+=2){const before=points[Math.max(0,k-1)],after=points[Math.min(segments,k+1)];tangent.set(after[0]-before[0],after[1]-before[1],after[2]-before[2]).normalize();reference.set(Math.abs(tangent.y)>.94?1:0,Math.abs(tangent.y)>.94?0:1,0);normal.crossVectors(tangent,reference).normalize();binormal.crossVectors(tangent,normal);const radius=.013+.012*Math.sin(Math.PI*k/segments);
        for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,n=normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal,Math.sin(a));tubePositions.push(points[k][0]+n.x*radius,points[k][1]+n.y*radius,points[k][2]+n.z*radius);tubeNormals.push(n.x,n.y,n.z);tubeColors.push(color.r,color.g,color.b);}
        if(k<segments)for(let j=0;j<sides;j++){const a=base+k/2*sides+j,b=base+k/2*sides+(j+1)%sides;tubeIndices.push(a,b,a+sides,b,b+sides,a+sides);}
      }
    }
    const tubeGeometry=new THREE.BufferGeometry();tubeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tubePositions,3));tubeGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(tubeNormals,3));tubeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(tubeColors,3));tubeGeometry.setIndex(tubeIndices);
    const tubes=new THREE.Mesh(tubeGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:.45,emissive:0x26a99c,emissiveIntensity:.28}));tubes.visible=params.view==='streamlines';group.add(tubes);
    particlePositions=new Float32Array(seeds.length*3);const pointColors=new Float32Array(seeds.length*3);seeds.forEach((s,i)=>{s.color.toArray(pointColors,i*3);});
    const pointGeo=new THREE.BufferGeometry();pointGeo.setAttribute('position',new THREE.BufferAttribute(particlePositions,3).setUsage(THREE.DynamicDrawUsage));pointGeo.setAttribute('color',new THREE.BufferAttribute(pointColors,3));
    particles=new THREE.Points(pointGeo,new THREE.ShaderMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
      vertexShader:'varying vec3 vColor; void main(){vColor=color; vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(100.0/-p.z,2.0,11.0);}',
      fragmentShader:'varying vec3 vColor; void main(){float r=length(gl_PointCoord-0.5)*2.0;float a=exp(-r*r*4.0)*smoothstep(1.0,0.7,r);gl_FragColor=vec4(vColor*2.1,a);}'
    }));particles.frustumCulled=false;group.add(particles);particles.visible=params.view!=='section';
    const core=coreRadius(params),ringPoints=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;ringPoints.push(new THREE.Vector3(core*Math.cos(a),0,core*Math.sin(a)));}
    radiusRing=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPoints),new THREE.LineBasicMaterial({color:0xffc988,transparent:true,opacity:.85}));group.add(radiusRing);radiusRing.position.y=params.view==='section'?.025:0;
    const axis=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-5.7,0),new THREE.Vector3(0,5.7,0)]);group.add(new THREE.Line(axis,new THREE.LineBasicMaterial({color:0x48897f,transparent:true,opacity:.26})));
    const floor=new THREE.GridHelper(14,28,0x1d4847,0x113435);floor.position.y=-5.4;floor.material.transparent=true;floor.material.opacity=.25;group.add(floor);floor.visible=params.view!=='section';
    const sectionGeo=new THREE.PlaneGeometry(8,8,80,80);sectionGeo.rotateX(-Math.PI/2);const sectionColors=new Float32Array(sectionGeo.attributes.position.count*3),sectionColor=new THREE.Color(),maxVorticity=burgersVorticity(0,params);
    for(let i=0;i<sectionGeo.attributes.position.count;i++){const r=Math.hypot(sectionGeo.attributes.position.getX(i),sectionGeo.attributes.position.getZ(i)),fraction=burgersVorticity(r,params)/maxVorticity;sectionColor.setHSL(.5-fraction*.4,.7,.06+fraction*.56);sectionColor.toArray(sectionColors,i*3);}
    sectionGeo.setAttribute('color',new THREE.BufferAttribute(sectionColors,3));section=new THREE.Mesh(sectionGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));section.visible=params.view==='section';group.add(section);if(params.view==='section')ctx.setCamera([0,11,.2],[0,0,0]);else ctx.setCamera([9.2,3.4,12],[0,0,0]);lastMetric=-1;
  }
  function update(dt,time){
    for(let i=0;i<seeds.length;i++){const s=seeds[i],path=paths[s.path],index=((time/path.duration+s.phase)%1)*segments,k=Math.floor(index),f=index-k,a=path.points[k],b=path.points[Math.min(k+1,segments)];for(let j=0;j<3;j++)particlePositions[i*3+j]=a[j]+(b[j]-a[j])*f;}
    particles.geometry.attributes.position.needsUpdate=true;
    if(Math.floor(time*2)!==lastMetric){lastMetric=Math.floor(time*2);ctx.onMetrics({'核心半径 r꜀':coreRadius(params).toFixed(3),'轴心涡量 ω':burgersVorticity(0,params).toFixed(3),'拉伸率 a':params.strain.toFixed(2),'流线数':String(paths.length)});}
  }
  build();update(0,0);
  return {update,setParameters(fullParams){params=validatedParameters(fullParams);coreRadius(params);build();update(0,0);},reset(nextSeed){seed=nextSeed??seed;build();update(0,0);},dispose(){disposeGroup(group);},action(){}};
}
