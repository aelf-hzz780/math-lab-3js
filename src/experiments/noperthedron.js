import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {validateParameters} from '../core/state.js';
import {noperthedronVertices,cubeVertices,convexFaces3D,projectionComparison} from '../math/noperthedron.js';

export const definition={
  id:'noperthedron',title:'穿不过自己的多面体',enTitle:'THE IMPOSSIBLE PASSAGE',kicker:'Noperthedron · 2025 / 2026',year:'2025 / 2026',
  description:'一个立方体可以让同样大小的自己穿过。这个 90 顶点的凸多面体却不行。转动两种姿态，比较它们的影子。',
  formula:'Rα πᵤ(sP) ⊂ int(πᵥ(P))  ·  同尺寸条件 s = 1',
  explanation:'左侧青色、右侧金色是两个投影姿态的同一凸体；下方叠加它们的正交投影。金色多边形严格落在青色内部，才满足直洞穿越判据。余量是金色顶点到青色各边内侧半平面的最小有向距离。正值意味着严格包含，负值意味着越界。立方体预设给出同尺寸的实际包含见证。',
  limitations:'Noperthedron 来自 Steininger–Yurkevich 2025 预印本（2026 v2），不属菲尔兹奖成果。原始整数系数保留，三角函数及投影测试使用浮点数；这里的有限姿态搜索不替代论文的计算机辅助全局证明。s < 1 时允许缩小副本，不能当成同尺寸穿越。',
  parameters:[
    {key:'solid',label:'对照形体',type:'select',value:'nop',options:[{value:'nop',label:'Noperthedron · 90 顶点'},{value:'cube',label:'立方体 · 可以穿越'}]},
    {key:'outerTheta',label:'青色姿态 · 方位',type:'range',min:0,max:6.283185307179586,step:.01,value:.78},
    {key:'outerPhi',label:'青色姿态 · 倾角',type:'range',min:0,max:3.141592653589793,step:.01,value:.96},
    {key:'innerTheta',label:'金色姿态 · 方位',type:'range',min:0,max:6.283185307179586,step:.01,value:.2},
    {key:'innerPhi',label:'金色姿态 · 倾角',type:'range',min:0,max:3.141592653589793,step:.01,value:.6},
    {key:'spin',label:'金色投影 · 平面旋转',type:'range',min:0,max:6.283185307179586,step:.01,value:.18},
    {key:'scale',label:'金色副本比例 s',type:'range',min:.65,max:1.15,step:.01,value:1},
    {key:'scan',label:'姿态扫描速度',type:'range',min:0,max:1,step:.01,value:.1}
  ],
  presets:[
    {label:'不可能的穿越',params:{solid:'nop',outerTheta:.78,outerPhi:.96,innerTheta:.2,innerPhi:.6,spin:.18,scale:1,scan:.1}},
    {label:'立方体的秘密',params:{solid:'cube',outerTheta:Math.PI/4,outerPhi:Math.acos(1/Math.sqrt(3)),innerTheta:0,innerPhi:0,spin:0,scale:1,scan:0}},
    {label:'缩小以后',params:{solid:'nop',outerTheta:.78,outerPhi:.96,innerTheta:.78,innerPhi:.96,spin:0,scale:.85,scan:0}}
  ],
  actions:[{key:'equal',label:'恢复同样大小'},{key:'align',label:'对齐两种投影'}],
  sources:[{label:'Steininger & Yurkevich · 原论文 v2',url:'https://arxiv.org/abs/2508.18475v2'},{label:'作者的 90 顶点坐标 · 固定版本',url:'https://github.com/Jakob256/Rupert/blob/1009a4c451dbdbb1a1705d18461cbabd534a0a6c/src/noperthedron.py'},{label:'作者的验证 Notebook',url:'https://github.com/Jakob256/Rupert/blob/1009a4c451dbdbb1a1705d18461cbabd534a0a6c/src/noperthedron_verification.ipynb'}]
};

const solids=new Map();
function solidModel(kind){
  if(!solids.has(kind)){
    const points=kind==='cube'?cubeVertices():noperthedronVertices();
    solids.set(kind,{points,faces:convexFaces3D(points)});
  }
  return solids.get(kind);
}

function faceGeometry(model){
  const positions=[],colors=[],color=new THREE.Color();
  model.faces.forEach((face,index)=>{
    color.setHSL(.49+(index%15)/110,.6,.34+(index%3)*.08);
    for(let i=1;i<face.length-1;i++)for(const vertex of [face[0],face[i],face[i+1]]){
      positions.push(...model.points[vertex]);colors.push(color.r,color.g,color.b);
    }
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

function pose(object,theta,phi,spin){
  const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(phi),sp=Math.sin(phi),c=Math.cos(spin),s=Math.sin(spin);
  const a=[ct*cp,st*cp,-sp],b=[-st,ct,0],n=[ct*sp,st*sp,cp];
  object.setRotationFromMatrix(new THREE.Matrix4().set(c*a[0]-s*b[0],c*a[1]-s*b[1],c*a[2]-s*b[2],0,s*a[0]+c*b[0],s*a[1]+c*b[1],s*a[2]+c*b[2],0,...n,0,0,0,0,1));
}

export function createExperiment(ctx){
  let params=validateParameters(definition.parameters,ctx.params),phase=0,group,model,bodies,shadows,metricElapsed=0;
  ctx.setCamera([0,2.8,17],[0,-.15,0]);
  function build(){
    if(group)disposeGroup(group);group=new THREE.Group();ctx.scene.add(group);model=solidModel(params.solid);bodies=[];shadows=[];
    const geometry=faceGeometry(model),size=params.solid==='cube'?1.1:1.85;
    for(let i=0;i<2;i++){
      const body=new THREE.Group();body.position.set(i?2.55:-2.55,.7,0);body.scale.setScalar(size);group.add(body);bodies.push(body);
      body.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:i?0xffc979:0x8bedec,vertexColors:!i,metalness:.4,roughness:.3,transparent:true,opacity:.8,side:THREE.DoubleSide,emissive:i?0x874b20:0x146c78,emissiveIntensity:.38})));
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,1),new THREE.LineBasicMaterial({color:i?0xffc569:0x83ffec,transparent:true,opacity:.82})));
      const dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.021,8,6),new THREE.MeshBasicMaterial({color:i?0xffdfab:0xc3fffb}),model.points.length),dummy=new THREE.Object3D();
      model.points.forEach((point,index)=>{dummy.position.fromArray(point);dummy.updateMatrix();dots.setMatrixAt(index,dummy.matrix);});body.add(dots);
      const projectionGeometry=new THREE.BufferGeometry();projectionGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(91*3),3));
      const shadow=new THREE.Line(projectionGeometry,new THREE.LineBasicMaterial({color:i?0xffba4a:0x55f1e0,transparent:true,opacity:1,depthTest:false}));
      shadow.position.set(0,-2.15,1.6+i*.025);shadow.scale.setScalar(1.2);group.add(shadow);shadows.push(shadow);
      const hoop=new THREE.Mesh(new THREE.TorusGeometry(2.2,.007,6,120),new THREE.MeshBasicMaterial({color:i?0x785f31:0x245e65,transparent:true,opacity:.65}));hoop.position.copy(body.position);hoop.position.z=-1;group.add(hoop);
    }
    const grid=new THREE.GridHelper(13,26,0x315252,0x17383c);grid.position.y=-3.45;grid.material.transparent=true;grid.material.opacity=.32;group.add(grid);
    render();
  }
  function render(){
    const p={...params,innerTheta:params.innerTheta+phase};
    pose(bodies[0],p.outerTheta,p.outerPhi,0);pose(bodies[1],p.innerTheta,p.innerPhi,p.spin);
    bodies[1].scale.setScalar((params.solid==='cube'?1.1:1.85)*params.scale);
    const result=projectionComparison(model.points,p);
    [result.outer,result.inner].forEach((polygon,index)=>{
      const attr=shadows[index].geometry.attributes.position;
      [...polygon,polygon[0]].forEach(([x,y],i)=>attr.setXYZ(i,x,y,0));
      attr.needsUpdate=true;shadows[index].geometry.setDrawRange(0,polygon.length+1);shadows[index].geometry.computeBoundingSphere();
    });
    ctx.onMetrics({'顶点数':String(model.points.length),'副本比例':`${params.scale.toFixed(2)} ×`,'投影余量':result.margin.toFixed(4),'当前姿态':result.fits?'严格包含':Math.abs(result.margin)<1e-9?'边界接触':'投影越界'});
  }
  build();
  return {
    update(dt){if(dt>0&&params.scan>0){phase+=dt*params.scan;metricElapsed+=dt;if(metricElapsed>=1/30){metricElapsed=0;render();}}},
    setParameters(next){const old=params.solid;params=validateParameters(definition.parameters,{...params,...next});phase=0;if(old!==params.solid)build();else render();},
    reset(){phase=0;metricElapsed=0;render();},
    action(key){if(key==='equal')params.scale=1;else if(key==='align'){params.innerTheta=params.outerTheta;params.innerPhi=params.outerPhi;params.spin=0;params.scan=0;}else return;phase=0;render();return{params};},
    dispose(){disposeGroup(group);}
  };
}
