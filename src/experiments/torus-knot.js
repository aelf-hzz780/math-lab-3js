import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {validateParameters} from '../core/state.js';
import {torusLinkInfo,torusKnotPoint,measureKnotPair} from '../math/torus-knot.js';

export const definition={
  id:'torus-knot',title:'结，绕了多远',enTitle:'TORUS KNOTS / DISTORTION',kicker:'PARDON · 2011 / FIELDS 2026',year:'2011 · 2026 获奖背景',category:'拓扑与几何',
  description:'两点看起来很近，沿着结走却很远。捏住金色短弧与白色直线，比较弯曲路径和空间捷径。',
  formula:'γ(t) = ((R+r cos qt) cos pt, r sin qt, (R+r cos qt) sin pt)\nδ(γ) = supₓ≠ᵧ dγ(x,y) / ‖x−y‖',
  explanation:'互素 p、q 给出一个环面结；有公因数 d 时展示 d 个分支的环面 link，每个分支使用约分后的绕数与不同相位。金色只覆盖选中分支两点之间较短的弧，白色虚线是空间弦。滑动 A/B 或依次点选结上的位置测量；“切换分支”用于 link。当前比值通过解析速度的 Simpson 积分计算，未搜索所有点对。Pardon 2011 的工作研究结的 distortion，表明某些结型无法通过重嵌入把 distortion 一致压低；此处固定一类显式嵌入来理解问题。',
  limitations:'当前数值是一个选定点对的短弧/弦长比，不是该曲线的全局 distortion，也不是结型在所有嵌入中的最优值。管壁厚度仅为显示；测量对象是管的中心曲线。多分支 link 的测量始终在同一分支内。有限管面网格和弧长积分有数值误差；本实验不复现 Pardon 的证明。',
  parameters:[{key:'p',label:'绕主轴 p',type:'range',min:2,max:9,step:1,value:3},{key:'q',label:'绕管截面 q',type:'range',min:2,max:11,step:1,value:5},{key:'minor',label:'承载环面的管半径 r',type:'range',min:.35,max:1.2,step:.05,value:.85},{key:'first',label:'测量点 A / 一圈比例',type:'range',min:0,max:1,step:.005,value:.06},{key:'second',label:'测量点 B / 一圈比例',type:'range',min:0,max:1,step:.005,value:.39},{key:'carrier',label:'承载环面',type:'select',value:'show',options:[{value:'show',label:'显示透明环面'},{value:'hide',label:'只看中心曲线'}]}],
  presets:[{label:'三叶结',params:{p:2,q:3,minor:.85,first:.08,second:.58,carrier:'show'}},{label:'层层绕行',params:{p:5,q:7,minor:.65,first:.04,second:.24,carrier:'hide'}},{label:'双分支 link',params:{p:4,q:6,minor:1.05,first:.12,second:.62,carrier:'show'}}],
  actions:[{key:'opposite',label:'B 移到参数半圈处'},{key:'component',label:'切换测量分支'}],
  sources:[{label:'Pardon · On the distortion of knots on embedded surfaces (2011)',url:'https://annals.math.princeton.edu/2011/174-1/p21'},{label:'原始预印本 arXiv:1010.1972',url:'https://arxiv.org/abs/1010.1972'},{label:'IMU · 2026 Fields Medals',url:'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026'}],
};

class KnotCurve extends THREE.Curve{
  constructor(model,component,start=0,span=2*Math.PI){super();Object.assign(this,{model,component,start,span});}
  getPoint(u,target=new THREE.Vector3()){return target.fromArray(torusKnotPoint(this.start+u*this.span,this.model,this.component));}
}
export function createExperiment(ctx){
  let params=validateParameters(definition.parameters,ctx.params??{}),component=0,phase=0,selectFirst=true,model,info,measure,group,bodyGroup,measureGroup,curveMeshes=[],tracers=[];
  const quality=ctx.quality==='low'?'low':'high';
  ctx.setCamera([9.1,7,12.9],[.55,0,0]);
  function caption(text,position,color='#d8f7ee'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const context=canvas.getContext('2d');if(!context)throw new Error('Canvas labels unavailable');
    context.font='500 34px sans-serif';context.textAlign='center';context.fillStyle=color;context.fillText(text,256,61);
    const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));
    sprite.scale.set(2.8,.525,1);sprite.position.copy(position);measureGroup.add(sprite);
  }
  function build(){
    if(group)disposeGroup(group);group=new THREE.Group();group.position.x=.65;ctx.scene.add(group);
    bodyGroup=new THREE.Group();bodyGroup.rotation.x=.3;group.add(bodyGroup);
    model={p:params.p,q:params.q,majorRadius:2.4,minorRadius:params.minor};info=torusLinkInfo(params.p,params.q);component%=info.components;
    const carrier=new THREE.Mesh(new THREE.TorusGeometry(model.majorRadius,model.minorRadius,quality==='low'?12:20,quality==='low'?48:80),new THREE.MeshBasicMaterial({color:0x207981,wireframe:true,transparent:true,opacity:.06,depthWrite:false}));carrier.rotation.x=Math.PI/2;carrier.visible=params.carrier==='show';bodyGroup.add(carrier);
    curveMeshes=[];tracers=[];
    const segments=Math.max(160,Math.max(info.pReduced,info.qReduced)*(quality==='low'?48:96));
    for(let branch=0;branch<info.components;branch++){
      const curve=new KnotCurve(model,branch),geometry=new THREE.TubeGeometry(curve,segments,.073,quality==='low'?6:10,true),colors=[];
      for(let i=0;i<geometry.attributes.position.count;i++){
        const t=Math.floor(i/(quality==='low'?7:11))/segments,c=new THREE.Color().setHSL((.44+.11*Math.sin(t*Math.PI*2)+branch*.18)%1,.8,.46);
        colors.push(c.r,c.g,c.b);
      }
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      const mesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({vertexColors:true,metalness:.42,roughness:.22,clearcoat:1,emissive:0x0b4050,emissiveIntensity:.35}));
      Object.assign(mesh.userData,{component:branch,segments,radialSegments:quality==='low'?6:10,curve});bodyGroup.add(mesh);curveMeshes.push(mesh);
      const tracer=new THREE.Mesh(new THREE.SphereGeometry(.095,12,8),new THREE.MeshBasicMaterial({color:0xddfff4}));bodyGroup.add(tracer);tracers.push(tracer);
    }
    const base=new THREE.Mesh(new THREE.CylinderGeometry(4.05,4.18,.12,96),new THREE.MeshStandardMaterial({color:0x091a25,metalness:.55,roughness:.45}));base.position.y=-1.9;group.add(base);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(4.09,.012,8,128),new THREE.MeshBasicMaterial({color:0x276975}));ring.rotation.x=Math.PI/2;ring.position.y=-1.83;group.add(ring);
    const light=new THREE.DirectionalLight(0xb4ffeb,2.2);light.position.set(-4,6,5);group.add(light);
    const rim=new THREE.PointLight(0xffbd6b,28,18,2);rim.position.set(4,3,-4);group.add(rim);
    measureGroup=undefined;refreshMeasurement();updateTracers();
  }
  function refreshMeasurement(){
    if(measureGroup)disposeGroup(measureGroup);measureGroup=new THREE.Group();bodyGroup.add(measureGroup);
    measure=measureKnotPair(params.first,params.second,model,component,quality==='low'?512:1024);
    if(measure.ratio!==null){
      const arc=new THREE.Mesh(new THREE.TubeGeometry(new KnotCurve(model,component,measure.startParameter,measure.parameterSpan),quality==='low'?180:360,.088,8,false),new THREE.MeshBasicMaterial({color:0xffc95f}));measureGroup.add(arc);
      const chord=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3().fromArray(measure.start),new THREE.Vector3().fromArray(measure.end)]),new THREE.LineDashedMaterial({color:0xf4fcff,dashSize:.12,gapSize:.08,depthTest:false,transparent:true,opacity:.95}));chord.computeLineDistances();measureGroup.add(chord);
    }
    [measure.start,measure.end].forEach((position,index)=>{
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.13,18,12),new THREE.MeshBasicMaterial({color:index?0xffd67a:0xf2ffff}));dot.position.fromArray(position);measureGroup.add(dot);
      caption(index?'B':'A',dot.position.clone().add(new THREE.Vector3(0,.3,0)));
    });
    caption(`T(${params.p}, ${params.q})  ·  ${info.isKnot?'KNOT':`${info.components} COMPONENTS`}  ·  ${component+1}`,new THREE.Vector3(0,-2.1,3));
    ctx.onMetrics({'结 / link 分支':info.isKnot?'1 · knot':`${info.components} · link`,'所选短弧 s':measure.shortArc.toFixed(3),'空间弦长 c':measure.chord.toFixed(3),'此点对 s / c':measure.ratio===null?'重合 · 未定义':measure.ratio.toFixed(3)});
  }
  function updateTracers(){tracers.forEach((tracer,branch)=>tracer.position.fromArray(torusKnotPoint(phase+branch*.6,model,branch)));}
  build();
  return {
    update(dt){phase+=Math.max(0,Math.min(.05,dt))*.4;updateTracers();},
    setParameters(full){const next=validateParameters(definition.parameters,full),rebuild=['p','q','minor','carrier'].some(key=>next[key]!==params[key]);params=next;if(rebuild)build();else refreshMeasurement();},
    reset(){phase=0;component=0;selectFirst=true;refreshMeasurement();updateTracers();},
    action(key){if(key==='component'){component=(component+1)%info.components;refreshMeasurement();}else if(key==='opposite'){params.second=(params.first+.5)%1;refreshMeasurement();return {params:{second:params.second}};}},
    pick(raycaster){
      const hit=raycaster.intersectObjects(curveMeshes)[0];if(!hit)return;component=hit.object.userData.component;
      // TubeGeometry samples by normalized arc length, whereas the controls use phase t / 2π.
      const {curve,segments,radialSegments}=hit.object.userData;
      const u=hit.uv?.x??Math.floor(hit.faceIndex/(2*radialSegments))/segments;
      const phase=curve.getUtoTmapping(Math.max(0,Math.min(1,u))),key=selectFirst?'first':'second';
      params[key]=phase;selectFirst=!selectFirst;refreshMeasurement();return {params:{[key]:phase}};
    },
    dispose(){disposeGroup(group);},
  };
}
