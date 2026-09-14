import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainDensity, generateTerrainChunk } from '../src/math/iridescent-terrain.js';

const base = { ix:0, iz:0, resolution:16, seed:42 };
const near = (a,b,e=1e-6) => Math.abs(a-b)<e;

test('density is reproducible, seed-dependent and contains separated vertical rock bands', () => {
  const first = Array.from({length:161},(_,i)=>terrainDensity(5,-10+i/8,7));
  assert.deepEqual(first,Array.from({length:161},(_,i)=>terrainDensity(5,-10+i/8,7)));
  assert.notDeepEqual(first,Array.from({length:161},(_,i)=>terrainDensity(5,-10+i/8,7,{seed:43})));
  const starts=first.filter((v,i)=>v>0 && (i===0 || first[i-1]<=0));
  assert.ok(starts.length>=3,'a vertical line intersects at least three separated sheets');
  for (let x=-12;x<=12;x+=3) for (let z=0;z<=24;z+=3) {
    assert.ok(terrainDensity(x,-10,z)<0);
    assert.ok(terrainDensity(x,10,z)<0);
  }
});

test('chunk generation is deterministic with bounded indexed typed-array geometry', () => {
  const a=generateTerrainChunk(base),b=generateTerrainChunk(base);
  assert.ok(a.positions instanceof Float32Array && a.normals instanceof Float32Array && a.indices instanceof Uint32Array);
  assert.deepEqual(a.positions,b.positions); assert.deepEqual(a.indices,b.indices); assert.deepEqual(a.normals,b.normals);
  assert.notDeepEqual(a.positions,generateTerrainChunk({...base,seed:43}).positions);
  assert.equal(a.triangleCount,a.indices.length/3);
  assert.ok(a.triangleCount>200 && a.triangleCount<=12*base.resolution**3);
  assert.ok(a.positions.length/3<a.indices.length,'surface vertices are shared');
  assert.deepEqual(a.bounds,{min:[0,-10,0],max:[24,10,24]});
});

test('layer density increases vertical occupancy while hole scale changes perforation', () => {
  const profile=parameters=>Array.from({length:401},(_,i)=>terrainDensity(5,-10+i*.05,7,parameters));
  const sparse=profile({layers:.65}),dense=profile({layers:1.55});
  assert.ok(dense.filter(d=>d>0).length>sparse.filter(d=>d>0).length);
  assert.notDeepEqual(profile({holes:.65}),profile({holes:1.8}));
  for(const layers of [.65,1.55]) for(const holes of [.65,1.8]) {
    const mesh=generateTerrainChunk({...base,ix:-1,iz:-2,resolution:12,layers,holes});
    assert.ok(mesh.triangleCount>0);
    assert.ok(mesh.positions.every(Number.isFinite) && mesh.normals.every(Number.isFinite));
  }
});

test('central rock bands leave substantial open gaps across their projected footprint', () => {
  let air=0,total=0;
  for(let x=-24;x<24;x+=1.5) for(let z=0;z<48;z+=1.5) {
    let rock=false;
    for(let y=-2.5;y<=2.5;y+=.125) if(terrainDensity(x,y,z)>0) {rock=true;break;}
    air+=Number(!rock); total++;
  }
  assert.ok(air/total>=.4 && air/total<=.8,`central-band air coverage ${air/total}`);
});

test('surface faces are finite, nondegenerate and face their outward unit normals', () => {
  const {positions:p,normals:n,indices:ids}=generateTerrainChunk(base);
  for (let i=0;i<p.length;i+=3) {
    assert.ok(Number.isFinite(p[i]) && Number.isFinite(p[i+1]) && Number.isFinite(p[i+2]));
    assert.ok(p[i]>=0 && p[i]<=24 && p[i+1]>=-10 && p[i+1]<=10 && p[i+2]>=0 && p[i+2]<=24);
    assert.ok(near(Math.hypot(n[i],n[i+1],n[i+2]),1));
  }
  for (let i=0;i<ids.length;i+=3) {
    const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3;
    assert.ok(a<p.length && b<p.length && c<p.length);
    const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
    const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    assert.ok(Math.hypot(nx,ny,nz)>1e-9,'no zero-area triangle');
    assert.ok(nx*(n[a]+n[b]+n[c])+ny*(n[a+1]+n[b+1]+n[c+1])+nz*(n[a+2]+n[b+2]+n[c+2])>0,'outward winding');
  }
});

test('adjacent x and z chunks share exactly the same boundary positions and normals', () => {
  const a=generateTerrainChunk({...base,resolution:20});
  for (const [axis,neighbor] of [[0,{ix:1,iz:0}],[2,{ix:0,iz:1}]]) {
    const b=generateTerrainChunk({...base,...neighbor,resolution:20});
    const boundary=(mesh,value)=>{
      const points=new Map();
      for(let i=0;i<mesh.positions.length;i+=3) if(mesh.positions[i+axis]===value) {
        const xyz=[...mesh.positions.subarray(i,i+3)]; xyz[axis]=0;
        points.set(xyz.join(','),[...mesh.normals.subarray(i,i+3)]);
      }
      return [...points].sort((u,v)=>u[0].localeCompare(v[0]));
    };
    const right=boundary(a,24),left=boundary(b,0);
    assert.ok(right.length>10,'test exercises a nonempty seam');
    assert.deepEqual(right,left);
  }
});

test('the conforming surface has no open interior mesh edges', () => {
  const {positions:p,indices}=generateTerrainChunk(base),edges=new Map();
  for(let i=0;i<indices.length;i+=3) for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]) {
    const key=a<b?`${a},${b}`:`${b},${a}`;
    edges.set(key,(edges.get(key)??0)+1);
  }
  for (const [key,count] of edges) {
    const [a,b]=key.split(',').map(Number);
    const boundary=[0,2].some(axis=>[0,24].some(value=>p[a*3+axis]===value && p[b*3+axis]===value));
    assert.equal(count,boundary?1:2,`edge ${key} must close or terminate at a chunk boundary`);
  }
});

test('public terrain inputs reject invalid and unbounded requests', () => {
  for(const options of [{seed:-1},{layers:NaN},{holes:0}]) assert.throws(()=>terrainDensity(0,0,0,options),RangeError);
  assert.throws(()=>terrainDensity(Infinity,0,0),RangeError);
  for(const options of [{ix:.5},{iz:Infinity},{resolution:1000},{resolution:7},{size:0},{height:NaN},{layers:0},{seed:2**32}]) {
    assert.throws(()=>generateTerrainChunk({...base,...options}),RangeError);
  }
});
