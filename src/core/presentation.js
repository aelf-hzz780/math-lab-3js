/** Keep each captured gesture assigned to either the camera or the simulated field. */
export function isFieldPointerActive(event,pointers) {
  if(!event||!(pointers instanceof Map))throw new TypeError('Invalid pointer gesture');
  return !['pointerleave','pointercancel'].includes(event.type)&&!event.shiftKey&&!(event.buttons&2)&&
    !pointers.get(event.pointerId)?.orbit&&pointers.size<2&&
    !(event.pointerType==='touch'&&event.type==='pointerup');
}

/** Camera animation policy is independent of the scene and simulation clock. */
export class CameraMotion {
  constructor({enabled=false}={}) { this.enabled=enabled; this.idle=5; }
  interact() { this.idle=0; }
  step(delta,running,holding) {
    const dt=Number.isFinite(delta)?Math.max(0,Math.min(.05,delta)):0;
    if(holding)this.idle=0;
    if(!running||holding)return 0;
    this.idle=Math.min(5,this.idle+dt);
    return this.enabled&&this.idle>=5-1e-9?dt*.035:0;
  }
}
