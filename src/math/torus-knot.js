const TAU=2*Math.PI;
export function torusLinkInfo(p,q){
  if(![p,q].every(n=>Number.isInteger(n)&&n>=1&&n<=12))throw new RangeError('Windings must be integers from 1 to 12');
  let a=p,b=q;while(b){const next=a%b;a=b;b=next;}
  return {components:a,pReduced:p/a,qReduced:q/a,isKnot:a===1};
}
function validate(model,component){
  const info=torusLinkInfo(model.p,model.q);
  if(!Number.isFinite(model.majorRadius)||!Number.isFinite(model.minorRadius)||model.minorRadius<=0||model.majorRadius<=model.minorRadius)throw new RangeError('A ring torus requires majorRadius > minorRadius > 0');
  if(!Number.isInteger(component)||component<0||component>=info.components)throw new RangeError('Invalid link component');
  return info;
}
function pointAt(t,model,component,info){
  const alpha=info.pReduced*t,beta=info.qReduced*t+TAU*component/model.p;
  const radius=model.majorRadius+model.minorRadius*Math.cos(beta);
  return [radius*Math.cos(alpha),model.minorRadius*Math.sin(beta),radius*Math.sin(alpha)];
}
function speedAt(t,model,component,info){
  const beta=info.qReduced*t+TAU*component/model.p;
  return Math.hypot(model.minorRadius*info.qReduced,info.pReduced*(model.majorRadius+model.minorRadius*Math.cos(beta)));
}
export function torusKnotPoint(t,model,component=0){
  if(!Number.isFinite(t))throw new RangeError('Curve parameter must be finite');
  return pointAt(t,model,component,validate(model,component));
}
export function torusKnotSpeed(t,model,component=0){
  if(!Number.isFinite(t))throw new RangeError('Curve parameter must be finite');
  return speedAt(t,model,component,validate(model,component));
}
function simpson(start,end,steps,model,component,info){
  const h=(end-start)/steps;
  let sum=speedAt(start,model,component,info)+speedAt(end,model,component,info);
  for(let i=1;i<steps;i++)sum+=(i%2?4:2)*speedAt(start+i*h,model,component,info);
  return sum*h/3;
}
export function measureKnotPair(first,second,model,component=0,steps=1024){
  const info=validate(model,component);
  if(![first,second].every(Number.isFinite)||!Number.isInteger(steps)||steps<32||steps>8192||steps%2)throw new RangeError('Use finite phases and an even integration count from 32 to 8192');
  const wrap=value=>((value%1)+1)%1,a=wrap(first)*TAU,span=wrap(second-first)*TAU;
  const start=pointAt(a,model,component,info),end=pointAt(a+span,model,component,info);
  const chord=Math.hypot(...start.map((value,i)=>value-end[i]));
  const totalLength=simpson(a,a+TAU,steps,model,component,info);
  const forward=simpson(a,a+span,steps,model,component,info),backward=Math.max(0,totalLength-forward);
  const shortArc=Math.min(forward,backward),forwardIsShorter=forward<=backward;
  return {start,end,chord,totalLength,shortArc,ratio:chord<1e-12?null:shortArc/chord,forwardIsShorter,startParameter:a,parameterSpan:forwardIsShorter?span:span-TAU};
}
