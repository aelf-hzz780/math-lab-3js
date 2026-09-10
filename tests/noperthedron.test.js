import test from 'node:test';
import assert from 'node:assert/strict';
import {noperthedronVertices, cubeVertices, projectSolid, convexHull2D, containmentMargin, projectionComparison,convexFaces3D} from '../src/math/noperthedron.js';

test('published Noperthedron has 90 distinct vertices in three antipodal 15-fold orbits', () => {
  const points = noperthedronVertices();
  assert.equal(points.length, 90);
  assert.equal(new Set(points.map(p => p.map(x => x.toFixed(10)).join(','))).size, 90);
  for (let i=0; i<45; i++) {
    assert(Math.hypot(...points[i]) >= .98 && Math.hypot(...points[i]) <= 1+1e-12);
    points[i].forEach((x,j) => assert(Math.abs(x+points[i+45][j]) < 1e-14));
  }
  assert.equal(points[0][0], 152024884/259375205);
  assert.equal(points[15][1], 6106948881/1e10);
  const c=Math.cos(2*Math.PI/15), s=Math.sin(2*Math.PI/15);
  assert(Math.abs(points[1][0]-(c*points[0][0]-s*points[0][1]))<1e-14);
});

test('projection is orthogonal and has correct silhouettes for an axis-aligned cube', () => {
  const hull=convexHull2D(projectSolid(cubeVertices(),0,0));
  assert.equal(hull.length,4);
  assert.equal(containmentMargin([[0,0]],hull),1);
  assert.equal(containmentMargin([[1,0]],hull),0);
  assert.equal(containmentMargin([[1.5,0]],hull),-.5);
  const point=[.3,-.7,1.2];
  for(const angles of [[0,0],[.7,1.2],[2,2.7]]) {
    const q=projectSolid([point],...angles)[0];
    assert(Math.hypot(...q)<=Math.hypot(...point)+1e-12);
  }
});

test('cube preset supplies a strictly contained equal-size projection witness', () => {
  const result=projectionComparison(cubeVertices(),{outerTheta:Math.PI/4,outerPhi:Math.acos(1/Math.sqrt(3)),innerTheta:0,innerPhi:0,spin:0,scale:1});
  assert(result.margin>0, `cube witness margin ${result.margin}`);
  assert(result.fits);
});

test('Noperthedron hull has 152 supporting faces and satisfies Euler characteristic',()=>{
  const points=noperthedronVertices(),faces=convexFaces3D(points),edges=new Set();
  assert.equal(faces.length,152);
  for(const face of faces){
    for(let i=0;i<face.length;i++)edges.add([face[i],face[(i+1)%face.length]].sort((a,b)=>a-b).join(','));
    const a=points[face[0]],u=points[face[1]].map((x,d)=>x-a[d]),v=points[face[2]].map((x,d)=>x-a[d]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    for(const p of points)assert(n.reduce((s,x,d)=>s+x*(p[d]-a[d]),0)<1e-9);
  }
  assert.equal(points.length-edges.size+faces.length,2);
  assert.equal(new Set(faces.flat()).size,90);
});

test('identical projections touch rather than strictly fit, and scaling is explicitly measured', () => {
  const params={outerTheta:.2,outerPhi:1,innerTheta:.2,innerPhi:1,spin:0,scale:1};
  const points=noperthedronVertices();
  assert(Math.abs(projectionComparison(points,params).margin)<1e-12);
  assert.equal(projectionComparison(points,params).fits,false);
  assert(projectionComparison(points,{...params,scale:.9}).fits);
});

test('invalid projection and polygon inputs fail visibly',()=>{
  assert.throws(()=>projectSolid([[NaN,0,1]],0,0),RangeError);
  assert.throws(()=>projectSolid(cubeVertices(),Infinity,0),RangeError);
  assert.throws(()=>convexHull2D([[0,0],[1,1]]),RangeError);
  assert.throws(()=>projectionComparison(cubeVertices(),{scale:-1}),RangeError);
});
