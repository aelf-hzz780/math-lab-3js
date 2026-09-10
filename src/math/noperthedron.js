import data from '../../data/noperthedron.json' with {type:'json'};

function finitePoints(points, dimension) {
  if (!Array.isArray(points) || !points.length || points.some(p=>!Array.isArray(p)||p.length!==dimension||p.some(x=>!Number.isFinite(x)))) throw new RangeError(`Expected finite ${dimension}D points`);
}

export function noperthedronVertices() {
  const points=Array(90);
  for(let i=0;i<3;i++) for(let k=0;k<15;k++) for(let l=0;l<2;l++) {
    const [x,y,z]=data.numerators[i].map(n=>n/data.denominators[i]);
    const angle=2*Math.PI*k/15,c=Math.cos(angle),s=Math.sin(angle),sign=l?-1:1;
    points[k+15*i+45*l]=[sign*(c*x-s*y),sign*(s*x+c*y),sign*z];
  }
  return points;
}

export function cubeVertices() {
  return Array.from({length:8},(_,i)=>[i&1?1:-1,i&2?1:-1,i&4?1:-1]);
}

export function projectSolid(points,theta,phi,spin=0,scale=1) {
  finitePoints(points,3);
  if(![theta,phi,spin,scale].every(Number.isFinite)||scale<=0)throw new RangeError('Invalid projection parameters');
  const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(phi),sp=Math.sin(phi),c=Math.cos(spin),s=Math.sin(spin);
  return points.map(([x,y,z])=>{
    const a=ct*cp*x+st*cp*y-sp*z,b=-st*x+ct*y;
    return [scale*(c*a-s*b),scale*(s*a+c*b)];
  });
}

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function convexHull2D(points) {
  finitePoints(points,2);
  const sorted=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(sorted.length<3)throw new RangeError('A polygon needs three non-collinear points');
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=1e-13)lower.pop();lower.push(p);}
  for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=1e-13)upper.pop();upper.push(p);}
  lower.pop();upper.pop();const hull=lower.concat(upper);
  if(hull.length<3)throw new RangeError('A polygon needs three non-collinear points');
  return hull;
}

export function containmentMargin(points,hull) {
  finitePoints(points,2);finitePoints(hull,2);
  if(hull.length<3)throw new RangeError('Invalid polygon');
  let margin=Infinity;
  for(let i=0;i<hull.length;i++){
    const a=hull[i],b=hull[(i+1)%hull.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length===0)throw new RangeError('Degenerate polygon edge');
    for(const point of points)margin=Math.min(margin,cross(a,b,point)/length);
  }
  return margin;
}

export function projectionComparison(points,parameters) {
  const {outerTheta,outerPhi,innerTheta,innerPhi,spin,scale}=parameters||{};
  if(![outerTheta,outerPhi,innerTheta,innerPhi,spin,scale].every(Number.isFinite)||scale<=0)throw new RangeError('Invalid comparison parameters');
  const outer=convexHull2D(projectSolid(points,outerTheta,outerPhi));
  const inner=convexHull2D(projectSolid(points,innerTheta,innerPhi,spin,scale));
  const margin=containmentMargin(inner,outer);
  return {outer,inner,margin,fits:margin>1e-9};
}

// One-time construction for at most 90 vertices, never in the animation loop.
// Supporting planes are deduplicated, then polygonal faces are triangulated.
export function convexFaces3D(points) {
  finitePoints(points,3);
  if(points.length<4||points.length>90)throw new RangeError('Hull supports 4–90 vertices');
  const faces=new Map(),eps=1e-9;
  for(let i=0;i<points.length-2;i++)for(let j=i+1;j<points.length-1;j++)for(let k=j+1;k<points.length;k++){
    const a=points[i],u=points[j].map((v,d)=>v-a[d]),v=points[k].map((v,d)=>v-a[d]);
    let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const norm=Math.hypot(...n);if(norm<eps)continue;n=n.map(x=>x/norm);
    let positive=false,negative=false;const on=[];
    for(let q=0;q<points.length;q++){
      const d=n.reduce((sum,x,h)=>sum+x*(points[q][h]-a[h]),0);
      if(d>eps)positive=true;else if(d<-eps)negative=true;else on.push(q);
      if(positive&&negative)break;
    }
    if(positive&&negative)continue;
    const key=on.join(',');if(faces.has(key))continue;
    if(positive)n=n.map(x=>-x);
    const center=[0,1,2].map(d=>on.reduce((sum,index)=>sum+points[index][d],0)/on.length);
    const e=points[on[0]].map((x,d)=>x-center[d]),eNorm=Math.hypot(...e),e1=e.map(x=>x/eNorm);
    const e2=[n[1]*e1[2]-n[2]*e1[1],n[2]*e1[0]-n[0]*e1[2],n[0]*e1[1]-n[1]*e1[0]];
    on.sort((aIndex,bIndex)=>{
      const angle=index=>Math.atan2(points[index].reduce((s,x,d)=>s+(x-center[d])*e2[d],0),points[index].reduce((s,x,d)=>s+(x-center[d])*e1[d],0));
      return angle(aIndex)-angle(bIndex);
    });
    faces.set(key,on);
  }
  if(faces.size<4)throw new RangeError('Points do not span a 3D solid');
  return [...faces.values()];
}
