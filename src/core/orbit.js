import * as THREE from '../../vendor/three.module.js';

export class OrbitController {
  constructor(camera, element, onClick) {
    this.camera=camera; this.element=element; this.target=new THREE.Vector3();
    this.spherical=new THREE.Spherical(); this.pointers=new Map(); this.onClick=onClick;
    this.abort=new AbortController(); const options={signal:this.abort.signal};
    element.addEventListener('pointerdown',e=>this.down(e),options);
    element.addEventListener('pointermove',e=>this.move(e),options);
    element.addEventListener('pointerup',e=>this.up(e),options);
    element.addEventListener('pointercancel',e=>this.pointers.delete(e.pointerId),options);
    element.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(e.deltaY*.001));},{...options,passive:false});
    element.addEventListener('contextmenu',e=>e.preventDefault(),options);
    this.set([9,6,11],[0,0,0]);
  }
  set(position,target) {
    this.target.fromArray(target); this.camera.position.fromArray(position);
    this.spherical.setFromVector3(this.camera.position.clone().sub(this.target)); this.apply();
  }
  down(e) {
    this.element.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    this.start={x:e.clientX,y:e.clientY};this.travel=0;
  }
  move(e) {
    const previous=this.pointers.get(e.pointerId); if(!previous)return;
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;this.travel+=Math.hypot(dx,dy);
    if(this.pointers.size===2){
      const other=[...this.pointers.entries()].find(([id])=>id!==e.pointerId)[1];
      const before=Math.hypot(previous.x-other.x,previous.y-other.y);
      const after=Math.hypot(e.clientX-other.x,e.clientY-other.y);
      if(after>0)this.zoom(before/after);
    }else{
      this.spherical.theta-=dx*.005;this.spherical.phi-=dy*.005;this.apply();
    }
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  }
  up(e) {if(this.pointers.has(e.pointerId)&&this.travel<5)this.onClick?.(e);this.pointers.delete(e.pointerId);}
  zoom(factor){this.spherical.radius=Math.max(1,Math.min(150,this.spherical.radius*factor));this.apply();}
  apply(){this.spherical.phi=Math.max(.025,Math.min(Math.PI-.025,this.spherical.phi));this.camera.position.setFromSpherical(this.spherical).add(this.target);this.camera.lookAt(this.target);}
  dispose(){this.abort.abort();this.pointers.clear();}
}
