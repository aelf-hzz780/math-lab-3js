import * as THREE from '../../vendor/three.module.js';
import { disposeGroup, seededRandom } from '../core/resources.js';
import { jointProbabilities, quantumMetrics, sampleOutcomes, chsh } from '../math/quantum.js';

export const definition={
  id:'quantum',title:'纠缠的概率曲面',enTitle:'ENTANGLEMENT / BORN RULE',kicker:'QUANTUM GEOMETRY',year:'1935 · 1964',category:'截图重建',
  description:'看见测量角度之间的关联。每一个高度都是联合概率，两个局部状态则随纠缠增加而变得更混合。',
  formula:'|ψ⟩ = cosχ |00⟩ + eⁱᵠ sinχ |11⟩\nP(a,b) = [1 + a cos2χ cosα + b cos2χ cosβ + ab E(α,β)] / 4\nE = cosα cosβ + sin2χ cosφ sinα sinβ',
  explanation:'曲面横轴 α、纵深 β 是两端在 x–z 平面中的测量角（0°–180°），高度为 P(++ )（0–1）。亮点是当前测量设置；金色与青色截线分别固定 α、β 展示另一个测量角变化时的概率；暗色网格对应每隔 15° 的测量角；左、右小球显示约化态的 Bloch 向量，最大纠缠时箭头收缩为球心。局部标签给出 P(A+) 和 P(B+)，远端角度变化不会改变本端边缘值。CHSH 演示使用固定设置 A = 0° / 90°、B = 45° / −45°，比较 S 与经典界 2。点击测量从 Born 分布采样，累计 ++ / +− / −+ / −− 的次数。',
  limitations:'这是一张概率函数曲面，不是粒子的实际空间形状，也不是完整 Hilbert 空间的三维等价物。远端测量设置不改变本端边缘概率，不能用于超光速通信。改变任一参数会清空旧设置的采样统计。',
  parameters:[{key:'chi',label:'纠缠参数 χ / °',type:'range',min:0,max:45,step:1,value:45},{key:'phi',label:'相对相位 φ / °',type:'range',min:0,max:360,step:5,value:0},{key:'alpha',label:'测量角 α / °',type:'range',min:0,max:180,step:1,value:45},{key:'beta',label:'测量角 β / °',type:'range',min:0,max:180,step:1,value:70}],
  presets:[{label:'完美纠缠',params:{chi:45,phi:0,alpha:45,beta:45}},{label:'相位翻转',params:{chi:45,phi:180,alpha:65,beta:115}},{label:'回到经典',params:{chi:0,phi:0,alpha:45,beta:70}}],
  actions:[{key:'chsh',label:'CHSH 与经典界'},{key:'sample',label:'测量 100 次'},{key:'clear-samples',label:'清空统计'}],sources:[{label:'Bell 1964 · On the Einstein Podolsky Rosen paradox',url:'https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195'}]
};
const defaults=Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),rad=Math.PI/180;
function validatedParameters(input){
  const result={...defaults,...input};for(const p of definition.parameters)if(!Number.isFinite(result[p.key])||result[p.key]<p.min||result[p.key]>p.max)throw new RangeError(`${p.key} is outside the supported range`);return result;
}
export function createExperiment(ctx){
  let params=validatedParameters(ctx.params),group,geometry,surface,marker,markerStem,guideA,guideB,angleGrid,arrows=[],bars=[],counts=[0,0,0,0],seed=ctx.seed??42,random=seededRandom(seed),marginalLabels=[],chshLabels=[],showChsh=false;
  const segments=ctx.quality==='low'?48:80,span=6.4,height=4;
  ctx.setCamera([9.7,8.5,11.5],[0,1.2,0]);
  function label(text,position,scale=1.5,color='#abd7d1'){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=100;const c=canvas.getContext('2d');c.font='500 36px sans-serif';c.fillStyle=color;c.textAlign='center';c.fillText(text,320,62);const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(...position);sprite.scale.set(scale,scale/6.4,1);sprite.userData.setText=value=>{c.clearRect(0,0,640,100);c.fillText(value,320,62);texture.needsUpdate=true;};group.add(sprite);return sprite;
  }
  function build(){
    group=new THREE.Group();ctx.scene.add(group);geometry=new THREE.PlaneGeometry(span,span,segments,segments);geometry.rotateX(-Math.PI/2);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3),3));
    surface=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({vertexColors:true,side:THREE.DoubleSide,metalness:.3,roughness:.22,clearcoat:1,clearcoatRoughness:.15,emissive:0x062934,emissiveIntensity:.55,transparent:true,opacity:.92}));group.add(surface);
    const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(26*48*6),3));angleGrid=new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:0x7ddcdf,transparent:true,opacity:.16,depthWrite:false}));group.add(angleGrid);
    function makeGuide(color){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(96*4*3),3));const indices=[];for(let i=0;i<96;i++){const k=i*4;indices.push(k,k+1,k+2,k+2,k+1,k+3);}g.setIndex(indices);const ribbon=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:1,depthWrite:false}));ribbon.renderOrder=2;group.add(ribbon);return ribbon;}
    guideA=makeGuide(new THREE.Color(2,1.05,.15));guideB=makeGuide(new THREE.Color(.3,1.8,2));
    const base=new THREE.GridHelper(span,16,0x315754,0x183d3d);base.material.transparent=true;base.material.opacity=.55;base.position.y=-.035;group.add(base);
    const axisGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.2,0,3.2),new THREE.Vector3(3.7,0,3.2),new THREE.Vector3(-3.2,0,3.2),new THREE.Vector3(-3.2,4.3,3.2),new THREE.Vector3(-3.2,0,3.2),new THREE.Vector3(-3.2,0,-3.7)]);
    group.add(new THREE.LineSegments(axisGeo,new THREE.LineBasicMaterial({color:0x7bada7,transparent:true,opacity:.8})));
    label('α  0° → 180°',[0,-.3,3.85],2.9);label('β  0° → 180°',[-4.05,-.3,0],2.9);label('P(++ )  0 → 1',[-3.35,4.65,3.1],3.1);
    marker=new THREE.Mesh(new THREE.SphereGeometry(.12,20,14),new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,1.8,.8)}));group.add(marker);
    markerStem=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0xf7c680,dashSize:.1,gapSize:.08,transparent:true,opacity:.8}));group.add(markerStem);
    for(let i=0;i<2;i++){
      const x=i===0?-4.6:4.6;const sphere=new THREE.Mesh(new THREE.SphereGeometry(.65,24,18),new THREE.MeshBasicMaterial({color:i===0?0x42edff:0xffb557,wireframe:true,transparent:true,opacity:.25}));sphere.position.set(x,1.25,-.7);group.add(sphere);
      const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(x,1.25,-.7),.5,i===0?0x91f9f1:0xffd799,.12,.06);arrows.push(arrow);group.add(arrow);
      const center=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:0xd6eeea}));center.position.copy(sphere.position);group.add(center);label(i===0?'ρA · local state':'ρB · local state',[x,.4,-.7],2.3);marginalLabels.push(label('',[x,.08,-.7],2.6));
    }
    for(let i=0;i<4;i++){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.36,1,.36),new THREE.MeshStandardMaterial({color:i%2?0xdaa558:0x62d3c7,metalness:.3,roughness:.4}));mesh.position.set((i-1.5)*.85,-1.15,4.9);group.add(mesh);bars.push(mesh);label(['++','+−','−+','−−'][i],[(i-1.5)*.85,-1.62,5.15],.8);
    }
    label('OBSERVED FREQUENCIES',[0,-1.95,4.9],4.8);chshLabels=[label('',[0,5.7,0],6.4,'#f1cc8d'),label('A: 0° / 90°    B: 45° / −45°',[0,5.3,0],5.8)];refresh();
  }
  function probabilities(){return jointProbabilities(params.chi*rad,params.phi*rad,params.alpha*rad,params.beta*rad);}
  function metrics(){const q=quantumMetrics(params.chi*rad),p=probabilities();ctx.onMetrics({'纠缠度 C':q.concurrence.toFixed(3),'局部纯度 Tr(ρ²)':q.purity.toFixed(3),'P(++ )':(p[0]*100).toFixed(1)+'%','采样 ++ / +− / −+ / −−':counts.join(' / ')});}
  function updateBars(){const total=counts.reduce((a,b)=>a+b,0);bars.forEach((bar,i)=>{const h=total?counts[i]/total*.9:.015;bar.scale.y=h;bar.position.y=-1.35+h/2;});}
  function refresh(){
    const positions=geometry.attributes.position,color=geometry.attributes.color,shade=new THREE.Color();
    for(let i=0;i<positions.count;i++){
      const alpha=(positions.getX(i)/span+.5)*Math.PI,beta=(.5-positions.getZ(i)/span)*Math.PI,p=jointProbabilities(params.chi*rad,params.phi*rad,alpha,beta)[0];positions.setY(i,p*height);shade.setHSL(.72-p*.67,.82,.26+p*.28);color.setXYZ(i,shade.r,shade.g,shade.b);
    }
    positions.needsUpdate=true;color.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
    marker.position.set((params.alpha/180-.5)*span,probabilities()[0]*height+.045,(.5-params.beta/180)*span);
    const probability=(alpha,beta)=>jointProbabilities(params.chi*rad,params.phi*rad,alpha,beta)[0];
    const grid=angleGrid.geometry.attributes.position;let gridIndex=0;
    for(let fixed=0;fixed<=12;fixed++)for(let i=0;i<48;i++)for(let axis=0;axis<2;axis++)for(let endpoint=0;endpoint<2;endpoint++){const a=axis?((i+endpoint)/48):fixed/12,b=axis?fixed/12:((i+endpoint)/48);grid.setXYZ(gridIndex++,(a-.5)*span,probability(a*Math.PI,b*Math.PI)*height+.018,(.5-b)*span);}
    grid.needsUpdate=true;angleGrid.geometry.computeBoundingSphere();
    for(let i=0;i<96;i++)for(let endpoint=0;endpoint<2;endpoint++)for(let side=0;side<2;side++){const fraction=(i+endpoint)/96,offset=(side-.5)*.025,k=i*4+endpoint*2+side;guideA.geometry.attributes.position.setXYZ(k,marker.position.x+offset,probability(params.alpha*rad,fraction*Math.PI)*height+.045,(.5-fraction)*span);guideB.geometry.attributes.position.setXYZ(k,(fraction-.5)*span,probability(fraction*Math.PI,params.beta*rad)*height+.045,marker.position.z+offset);}
    for(const line of [guideA,guideB]){line.geometry.attributes.position.needsUpdate=true;line.geometry.computeBoundingSphere();}
    const linePositions=markerStem.geometry.attributes.position;linePositions.setXYZ(0,marker.position.x,0,marker.position.z);linePositions.setXYZ(1,...marker.position.toArray());linePositions.needsUpdate=true;markerStem.computeLineDistances();
    const q=quantumMetrics(params.chi*rad);arrows.forEach(arrow=>{arrow.visible=q.blochLength>1e-6;arrow.setLength(Math.max(.0001,q.blochLength*.5),Math.min(.12,q.blochLength*.2),Math.min(.07,q.blochLength*.1));});const p=probabilities();marginalLabels[0].userData.setText(`P(A+) = ${((p[0]+p[1])*100).toFixed(1)}%`);marginalLabels[1].userData.setText(`P(B+) = ${((p[0]+p[2])*100).toFixed(1)}%`);chshLabels[0].userData.setText(`CHSH  S = ${chsh(params.chi*rad,params.phi*rad).toFixed(3)}   ·   classical ≤ 2`);chshLabels.forEach(label=>label.visible=showChsh);updateBars();metrics();
  }
  build();
  return {update(){},setParameters(fullParams){params=validatedParameters(fullParams);counts=[0,0,0,0];refresh();},reset(nextSeed){seed=nextSeed??seed;random=seededRandom(seed);counts=[0,0,0,0];refresh();},action(key){if(key==='chsh'){showChsh=!showChsh;refresh();}else if(key==='sample'){const next=sampleOutcomes(probabilities(),100,random);counts=counts.map((n,i)=>n+next[i]);updateBars();metrics();}else if(key==='clear-samples'){counts=[0,0,0,0];updateBars();metrics();}},dispose(){disposeGroup(group);}};
}
