export const CM_POINTS=Object.freeze([
  {key:'square',label:'i · D = −4',tau:{re:0,im:1},discriminant:-4,polynomial:'τ² + 1 = 0'},
  {key:'hexagon',label:'ρ · D = −3',tau:{re:-.5,im:Math.sqrt(3)/2},discriminant:-3,polynomial:'τ² + τ + 1 = 0'},
  {key:'sqrt2',label:'i√2 · D = −8',tau:{re:0,im:Math.sqrt(2)},discriminant:-8,polynomial:'τ² + 2 = 0'},
]);
function validateTau(tau){
  if(!tau||![tau.re,tau.im].every(Number.isFinite)||tau.im<=0)throw new RangeError('τ must belong to the upper half-plane');
  return tau;
}
function validateMatrix(matrix){
  if(!Array.isArray(matrix)||matrix.length!==4||!matrix.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1e6)||matrix[0]*matrix[3]-matrix[1]*matrix[2]!==1)throw new RangeError('Matrix must be a bounded integer SL₂ matrix');
  return matrix;
}
export function multiplySL2(left,right){
  const [a,b,c,d]=validateMatrix(left),[e,f,g,h]=validateMatrix(right);
  return validateMatrix([a*e+b*g,a*f+b*h,c*e+d*g,c*f+d*h]);
}
export function modularTransform(tau,matrix){
  const {re:x,im:y}=validateTau(tau),[a,b,c,d]=validateMatrix(matrix);
  const real=c*x+d,imag=c*y,denominator=real*real+imag*imag;
  const image={re:((a*x+b)*real+a*y*imag)/denominator,im:y/denominator};
  return validateTau(image);
}
export function reduceToFundamental(tau){
  let image={...validateTau(tau)},matrix=[1,0,0,1],iterations=0;
  for(;iterations<128;iterations++){
    const shift=Math.floor(image.re+.5);
    if(shift){const translation=[1,-shift,0,1];image=modularTransform(image,translation);matrix=multiplySL2(translation,matrix);}
    if(image.re*image.re+image.im*image.im>=1-1e-12)return {tau:image,matrix,iterations};
    const inversion=[0,-1,1,0];image=modularTransform(image,inversion);matrix=multiplySL2(inversion,matrix);
  }
  throw new RangeError('Modular reduction did not converge within its bounded budget');
}
export function normalizedLatticeBasis(tau){
  const {re,im}=validateTau(tau),root=Math.sqrt(im);
  return {u:[1/root,0],v:[re/root,root],area:1};
}
export function latticePoint(m,n,tau){
  if(![m,n].every(Number.isSafeInteger))throw new RangeError('Lattice indices must be integers');
  const {u,v}=normalizedLatticeBasis(tau);
  return [m*u[0]+n*v[0],m*u[1]+n*v[1]];
}
export function classifyCM(tau){
  const reduced=reduceToFundamental(tau).tau;
  return CM_POINTS.find(point=>{
    const target=reduceToFundamental(point.tau).tau;
    return Math.abs(reduced.im-target.im)<1e-9&&Math.abs(Math.abs(reduced.re)-Math.abs(target.re))<1e-9;
  })??null;
}

export function boundedModuliGrid(horizontalExtent,top,limit=40){
  if(![horizontalExtent,top].every(value=>Number.isFinite(value)&&value>0)||!Number.isInteger(limit)||limit<4||limit>128)throw new RangeError('Use positive finite grid extents and a line budget from 4 to 128');
  const requested=Math.max(1,(2*horizontalExtent+top)/(limit-3));
  const magnitude=10**Math.floor(Math.log10(requested)),fraction=requested/magnitude;
  const step=[1,2,5,10].find(value=>value>=fraction)*magnitude;
  const halfCount=Math.floor(horizontalExtent/step),rowCount=Math.ceil(top/step);
  return {step,vertical:Array.from({length:2*halfCount+1},(_,i)=>(i-halfCount)*step),horizontal:Array.from({length:rowCount},(_,i)=>i*step)};
}
