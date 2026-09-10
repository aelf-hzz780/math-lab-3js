import * as THREE from '../../vendor/three.module.js';
import {disposeGroup} from '../core/resources.js';
import {validateParameters} from '../core/state.js';
import {CM_POINTS,modularTransform,multiplySL2,reduceToFundamental,normalizedLatticeBasis,latticePoint,classifyCM,boundedModuliGrid} from '../math/moduli.js';

export const definition={
  id:'moduli',title:'复环面的万花筒',enTitle:'MODULI / MANY LATTICES, ONE TORUS',kicker:'TSIMERMAN · A_g / GENUS 1 SLICE',year:'2015 · 2026 获奖背景',category:'算术与模空间',
  description:'剪切一个晶格，改变复环面的形状。S 与 T 重选基底；不同的 τ 可以指向同一个复环面。',
  formula:'Eτ = ℂ / (ℤ + τℤ),  Im τ > 0\nτ ↦ (aτ+b)/(cτ+d),  ad−bc = 1\nℱ = { |Re τ| ≤ ½, |τ| ≥ 1 }',
  explanation:'左下上半平面标出标准基本域与三个已知 CM 点；右下显示把面积归一为 1 的晶格，金色平行四边形是一个基本胞。S: τ→−1/τ 与 T: τ→τ+1 改变晶格基底，表示同构的复环面。参数给出基准 τ，按钮累积当前 SL₂(ℤ) 变换；修改 τ 的实部、虚部或重置会清空变换，晶格截取半径和曲面显示设置则保留它。上方环面和两种周期只是商空间的拓扑示意。Tsimerman 2015 的 A_g André–Oort 结果是高维算术几何定理；这里仅取 g=1 教学切片来认识模参数、基本域和特殊点。',
  limitations:'三维甜甜圈不是平坦复环面的等距嵌入，不能从外形量出复结构。晶格为了容纳在画面中会统一缩放，指标面积 1 指未显示缩放前的数学晶格。基本域上方在有限高度截断；CM 标记仅识别 i、ρ、i√2 及其模群等价点，“未标注”不表示不是 CM 点。这里没有计算所有特殊点，也不复现 A_g 的 André–Oort 证明。',
  parameters:[{key:'tauReal',label:'基准 τ 的实部',type:'range',min:-2,max:2,step:.05,value:0},{key:'tauImag',label:'基准 τ 的虚部',type:'range',min:.25,max:3,step:.05,value:1},{key:'extent',label:'晶格截取半径',type:'range',min:2,max:6,step:1,value:4},{key:'surface',label:'拓扑商空间',type:'select',value:'surface',options:[{value:'surface',label:'曲面与两个周期'},{value:'cycles',label:'只看周期网格'}]}],
  presets:[{label:'方形 CM 晶格',params:{tauReal:0,tauImag:1,extent:4,surface:'surface'}},{label:'六角 CM 晶格',params:{tauReal:-.5,tauImag:Math.sqrt(3)/2,extent:4,surface:'surface'}},{label:'剪切后的基底',params:{tauReal:1.35,tauImag:.65,extent:5,surface:'cycles'}}],
  actions:[{key:'S',label:'S · −1/τ'},{key:'T',label:'T · τ+1'},{key:'reduce',label:'归约到标准基本域'},{key:'cm',label:'切换已标记 CM 点'}],
  sources:[{label:'Tsimerman · The André–Oort conjecture for A_g (v5)',url:'https://arxiv.org/abs/1506.01466v5'},{label:'Modular group · 基本域与生成元',url:'https://en.wikipedia.org/wiki/Modular_group'},{label:'Complex multiplication · 算术特殊点',url:'https://en.wikipedia.org/wiki/Complex_multiplication'},{label:'IMU · 2026 Fields Medals',url:'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026'}],
};

export function createExperiment(ctx){
  let params=validateParameters(definition.parameters,ctx.params??{}),matrix=[1,0,0,1],cmIndex=0,time=0,group,tau,beads=[],torusGroup;
  const low=ctx.quality==='low';
  ctx.setCamera([.5,1.7,15.4],[.3,-.1,0]);
  function label(parent,text,position,width=2.5,color='#bcded5'){
    const canvas=document.createElement('canvas');canvas.width=text.length<=6?192:text.length<=18?384:768;canvas.height=96;
    const c=canvas.getContext('2d');if(!c)throw new Error('Canvas labels unavailable');c.fillStyle=color;c.textAlign='center';c.font=`500 ${text.length<=6?52:text.length<=18?42:35}px sans-serif`;c.fillText(text,canvas.width/2,64);
    const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));sprite.position.set(...position);sprite.scale.set(width,width*canvas.height/canvas.width,1);parent.add(sprite);return sprite;
  }
  function line(parent,points,color=0x39717b,opacity=.7){
    const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    const object=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));parent.add(object);return object;
  }
  function panel(position,width,height){
    const board=new THREE.Group();board.position.set(...position);group.add(board);
    board.add(new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:0x0b2330,transparent:true,opacity:.88,side:THREE.DoubleSide})));
    line(board,[[-width/2,-height/2,.01],[width/2,-height/2,.01],[width/2,height/2,.01],[-width/2,height/2,.01],[-width/2,-height/2,.01]],0x417784,.7);return board;
  }
  function buildUpperHalfPlane(){
    const width=3.6,height=3.4,board=panel([-3.0,-.95,.15],width,height);
    const horizontal=Math.max(1.25,Math.abs(tau.re)+.4),vertical=Math.max(2,tau.im+.4),scale=Math.min((width-.5)/(2*horizontal),(height-.65)/vertical);
    const map=(x,y,z=.04)=>[x*scale,-height/2+.25+y*scale,z];
    const top=(height-.45)/scale;
    const shape=new THREE.Shape();shape.moveTo(...map(-.5,top).slice(0,2));
    for(let i=0;i<=40;i++){const theta=Math.PI*(2/3-i/120);shape.lineTo(...map(Math.cos(theta),Math.sin(theta)).slice(0,2));}
    shape.lineTo(...map(.5,top).slice(0,2));shape.closePath();
    const domain=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x38cbb5,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));domain.position.z=.015;board.add(domain);
    const grid=boundedModuliGrid(horizontal,top,40);
    for(const x of grid.vertical)line(board,[map(x,0),map(x,top)],0x203c4b,.45);
    for(const y of grid.horizontal)line(board,[map(-horizontal,y),map(horizontal,y)],0x203c4b,.45);
    line(board,[map(-horizontal,0),map(horizontal,0)],0x74c1c4,.8);line(board,[map(0,0),map(0,top)],0x74c1c4,.6);
    line(board,[map(-.5,top),...Array.from({length:41},(_,i)=>{const theta=Math.PI*(2/3-i/120);return map(Math.cos(theta),Math.sin(theta));}),map(.5,top)],0x69e7c3,.9);
    for(const point of CM_POINTS){
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.044,12,8),new THREE.MeshBasicMaterial({color:0x86e9f4}));dot.position.set(...map(point.tau.re,point.tau.im,.08));board.add(dot);
      label(board,point.key==='square'?'i':point.key==='hexagon'?'ρ':'i√2',[dot.position.x-.19,dot.position.y+.055,.1],.65);
    }
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.07,18,12),new THREE.MeshBasicMaterial({color:0xffd984}));marker.position.set(...map(tau.re,tau.im,.14));board.add(marker);
    const halo=new THREE.Mesh(new THREE.RingGeometry(.095,.11,32),new THREE.MeshBasicMaterial({color:0xffdb8c,side:THREE.DoubleSide,transparent:true,opacity:.85}));halo.position.copy(marker.position);board.add(halo);
    label(board,'H / SL₂(ℤ) · FUNDAMENTAL DOMAIN',[0,height/2+.25,.1],3.8);label(board,'Re τ →',[width/2-.48,-height/2+.02,.1],1);label(board,`Im τ < ${top.toFixed(1)}`,[0,height/2-.16,.1],2,'#dac992');
  }
  function buildLattice(){
    const width=4.8,height=2.3,board=panel([2.1,-2.05,.15],width,height),extent=params.extent;
    const basis=normalizedLatticeBasis(tau),corners=[[-extent,-extent],[extent,-extent],[extent,extent],[-extent,extent]].map(([m,n])=>latticePoint(m,n,tau));
    const spanX=Math.max(...corners.map(p=>Math.abs(p[0]))),spanY=Math.max(...corners.map(p=>Math.abs(p[1]))),scale=Math.min((width-.5)/(2*spanX),(height-.35)/(2*spanY));
    const map=(p,z=.04)=>[p[0]*scale,p[1]*scale,z];
    for(let k=-extent;k<=extent;k++){
      line(board,[map(latticePoint(-extent,k,tau)),map(latticePoint(extent,k,tau))],0x386f7b,.6);
      line(board,[map(latticePoint(k,-extent,tau)),map(latticePoint(k,extent,tau))],0x386f7b,.6);
    }
    const coordinates=[];for(let m=-extent;m<=extent;m++)for(let n=-extent;n<=extent;n++)coordinates.push(...map(latticePoint(m,n,tau),.065));
    const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
    board.add(new THREE.Points(pointGeometry,new THREE.PointsMaterial({color:0xc2fff2,size:.055,sizeAttenuation:true,transparent:true,opacity:.95})));
    const cell=[[0,0],basis.u,[basis.u[0]+basis.v[0],basis.u[1]+basis.v[1]],basis.v],shape=new THREE.Shape();shape.moveTo(...map(cell[0]).slice(0,2));cell.slice(1).forEach(p=>shape.lineTo(...map(p).slice(0,2)));shape.closePath();
    const face=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xffd27b,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));face.position.z=.08;board.add(face);
    line(board,[...cell,cell[0]].map(p=>map(p,.09)),0xffce74,1);
    line(board,[map([0,0],.12),map(basis.u,.12)],0x7bf5f1,1);line(board,[map([0,0],.12),map(basis.v,.12)],0xffcb68,1);
    label(board,'Λτ / √Im τ · AREA = 1',[0,-height/2-.23,.1],3.7);
  }
  function torusPoint(u,v){const R=1.65,r=.52;return new THREE.Vector3((R+r*Math.cos(v))*Math.cos(u),r*Math.sin(v),(R+r*Math.cos(v))*Math.sin(u));}
  function buildTorus(){
    torusGroup=new THREE.Group();torusGroup.position.set(1.8,1.15,-.2);torusGroup.rotation.set(.6,.15,.12);group.add(torusGroup);
    const surface=new THREE.Mesh(new THREE.TorusGeometry(1.65,.52,low?20:36,low?64:104),new THREE.MeshPhysicalMaterial({color:0x167f97,metalness:.42,roughness:.25,clearcoat:1,emissive:0x063944,emissiveIntensity:.4,transparent:true,opacity:.84}));surface.rotation.x=Math.PI/2;surface.visible=params.surface==='surface';torusGroup.add(surface);
    for(let i=0;i<12;i++){
      line(torusGroup,Array.from({length:65},(_,j)=>torusPoint(j/64*Math.PI*2,i/12*Math.PI*2).toArray()),0x70d8d6,.23);
      line(torusGroup,Array.from({length:65},(_,j)=>torusPoint(i/12*Math.PI*2,j/64*Math.PI*2).toArray()),0x70d8d6,.23);
    }
    const loops=[Array.from({length:97},(_,i)=>torusPoint(i/96*Math.PI*2,.1)),Array.from({length:97},(_,i)=>torusPoint(.5,i/96*Math.PI*2))];
    loops.forEach((points,index)=>{
      const curve=new THREE.CatmullRomCurve3(points.slice(0,-1),true),mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,96,.028,8,true),new THREE.MeshBasicMaterial({color:index?0xffcc72:0x8bf7ec}));torusGroup.add(mesh);
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.063,12,8),new THREE.MeshBasicMaterial({color:0xf6ffe0}));torusGroup.add(bead);beads.push(bead);
    });
    label(group,'ℂ / (ℤ + τℤ) · TOPOLOGICAL VIEW',[2,3.35,0],4.7);label(group,'two generators · identified opposite edges',[2,-.95,.5],4.7);
  }
  function refresh(){
    tau=modularTransform({re:params.tauReal,im:params.tauImag},matrix);
    if(group)disposeGroup(group);group=new THREE.Group();ctx.scene.add(group);beads=[];
    buildUpperHalfPlane();buildLattice();buildTorus();
    const light=new THREE.DirectionalLight(0xb9ffff,2.3);light.position.set(-3,6,8);group.add(light);
    const gold=new THREE.PointLight(0xffc16f,24,15,2);gold.position.set(4,4,-2);group.add(gold);
    const cm=classifyCM(tau);
    ctx.onMetrics({'当前 τ':`${tau.re.toFixed(2)} + ${tau.im.toFixed(2)}i`,'晶格基本胞面积':'1.000','已标记 CM':cm?`D = ${cm.discriminant}`:'未标注','当前 SL₂ 基变换':`[${matrix[0]} ${matrix[1]}; ${matrix[2]} ${matrix[3]}]`});updateBeads();
  }
  function updateBeads(){if(beads.length){beads[0].position.copy(torusPoint(time*.35,.1));beads[1].position.copy(torusPoint(.5,time*.55));}}
  refresh();
  return {
    update(dt){time+=Math.max(0,Math.min(.05,dt));updateBeads();},
    setParameters(full){const next=validateParameters(definition.parameters,full);if(next.tauReal!==params.tauReal||next.tauImag!==params.tauImag)matrix=[1,0,0,1];params=next;refresh();},
    reset(){matrix=[1,0,0,1];time=0;cmIndex=0;refresh();},
    action(key){
      if(key==='S')matrix=multiplySL2([0,-1,1,0],matrix);
      else if(key==='T')matrix=multiplySL2([1,1,0,1],matrix);
      else if(key==='reduce')matrix=multiplySL2(reduceToFundamental(tau).matrix,matrix);
      else if(key==='cm'){cmIndex=(cmIndex+1)%CM_POINTS.length;const next=CM_POINTS[cmIndex].tau;params={...params,tauReal:next.re,tauImag:next.im};matrix=[1,0,0,1];refresh();return {params:{tauReal:next.re,tauImag:next.im}};}
      refresh();
    },
    dispose(){disposeGroup(group);},
  };
}
