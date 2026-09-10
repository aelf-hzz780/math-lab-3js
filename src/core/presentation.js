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
