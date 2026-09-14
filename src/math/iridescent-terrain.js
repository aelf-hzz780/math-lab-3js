const smooth = t => t*t*(3-2*t);
const mix = (a,b,t) => a+(b-a)*t;

function hash(x,y,z,seed) {
  let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^seed;
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/2147483647.5-1;
}

function noise(x,y,z,seed) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz);
  const a=mix(hash(ix,iy,iz,seed),hash(ix+1,iy,iz,seed),u);
  const b=mix(hash(ix,iy+1,iz,seed),hash(ix+1,iy+1,iz,seed),u);
  const c=mix(hash(ix,iy,iz+1,seed),hash(ix+1,iy,iz+1,seed),u);
  const d=mix(hash(ix,iy+1,iz+1,seed),hash(ix+1,iy+1,iz+1,seed),u);
  return mix(mix(a,b,v),mix(c,d,v),w);
}

function validateField({seed=42,layers=1,holes=1,height=20}={}) {
  if (!Number.isInteger(seed)||seed<0||seed>0xffffffff || !Number.isFinite(layers)||layers<.25||layers>3 || !Number.isFinite(holes)||holes<.25||holes>4 || !Number.isFinite(height)||height<2||height>128) {
    throw new RangeError('Invalid suspended terrain field parameters');
  }
  return {seed,layers,holes,height};
}

/** Positive density is solid. This field is not a signed distance function. */
function fieldSampler({seed,layers,holes,height}) {
  const spacing=5.2/layers,holeFrequency=1/(4.5*holes);
  return (x,y,z) => {
    const broad=noise(x*.075,0,z*.075,seed);
    const warp=1.5*Math.sin(x*.18+z*.095+seed*.001)+1.1*broad;
    const detail=noise(x*.62,y*.42,z*.62,seed^0x6d2b79f5);
    const warpedY=y+warp+.32*noise(x*.21,y*.18,z*.21,seed^0x41c64e6d)+.15*noise(x*.8,y*.65,z*.8,seed^0x85ebca6b);
    const thickness=.58+.22*noise(x*.22,0,z*.22,seed^0x12345)+.15*detail;
    const sheet=thickness-Math.abs(Math.sin(Math.PI*warpedY/spacing))*spacing/Math.PI;
    const perforation=noise(x*holeFrequency,y*.24,z*holeFrequency,seed^0x1b873593)
      +.22*noise(x*holeFrequency*2.3,y*.49,z*holeFrequency*2.3,seed^0x27d4eb2d)-.10;
    const envelope=height/2-.8-Math.abs(y);
    // A narrow air corridor keeps the default low flight path between the rocks.
    const corridor=Math.hypot(x-.7*Math.sin(z*.035),y-2.2-.18*Math.cos(z*.07))-1.05;
    return Math.min(sheet,perforation*2.2,envelope,corridor);
  };
}

export function terrainDensity(x,y,z,options={}) {
  if (![x,y,z].every(Number.isFinite)) throw new RangeError('Terrain coordinates must be finite');
  return fieldSampler(validateField(options))(x,y,z);
}

// Six tetrahedra share the 0→6 body diagonal. Neighboring cubes therefore
// triangulate every shared face identically, including across chunk boundaries.
const TETRAHEDRA = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];

function validateChunk(options) {
  const {ix,iz,resolution=40,size=24,height=20}=options;
  if (![ix,iz].every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1e6) || !Number.isInteger(resolution)||resolution<8||resolution>64 || !Number.isFinite(size)||size<2||size>128) {
    throw new RangeError('Invalid or unbounded suspended terrain chunk request');
  }
  return {...validateField({...options,height}),ix,iz,resolution,size,height};
}

function outwardNormal(sample,x,y,z) {
  const epsilon=.018;
  const dx=sample(x-epsilon,y,z)-sample(x+epsilon,y,z);
  const dy=sample(x,y-epsilon,z)-sample(x,y+epsilon,z);
  const dz=sample(x,y,z-epsilon)-sample(x,y,z+epsilon);
  const length=Math.hypot(dx,dy,dz);
  if (length<1e-12) return [0,1,0];
  return [dx/length,dy/length,dz/length];
}

/**
 * An indexed, conforming Marching Tetrahedra isosurface. Sampling is O(r³),
 * surface storage is bounded by the requested lattice and shared edge cache.
 * x/z are chunk-local; y and finite-difference normals use world coordinates.
 * A chunk has intentional open x/z borders that close against its neighbors.
 */
export function generateTerrainChunk(options={}) {
  const p=validateChunk(options),{ix,iz,resolution:r,size,height}=p;
  const sample=fieldSampler(p),side=r+1,plane=side*side,count=side**3;
  const originX=(ix-.5)*size,originZ=iz*size,dx=size/r,dy=height/r;
  const densities=new Float64Array(count),coordinates=new Float64Array(count*3);
  for(let gz=0;gz<=r;gz++) for(let gy=0;gy<=r;gy++) for(let gx=0;gx<=r;gx++) {
    const id=gx+gy*side+gz*plane,x=gx*dx,y=-height/2+gy*dy,z=gz*dx;
    coordinates[id*3]=x; coordinates[id*3+1]=y; coordinates[id*3+2]=z;
    densities[id]=sample(originX+x,y,originZ+z);
  }
  const positions=[],normals=[],indices=[],vertices=new Map();
  const vertex=(one,two)=>{
    const a=Math.min(one,two),b=Math.max(one,two),key=a*count+b;
    const cached=vertices.get(key);
    if(cached!==undefined) return cached;
    const t=densities[a]/(densities[a]-densities[b]);
    const x=mix(coordinates[a*3],coordinates[b*3],t);
    const y=mix(coordinates[a*3+1],coordinates[b*3+1],t);
    const z=mix(coordinates[a*3+2],coordinates[b*3+2],t);
    const index=positions.length/3;
    positions.push(Math.fround(x),Math.fround(y),Math.fround(z));
    normals.push(...outwardNormal(sample,originX+x,y,originZ+z).map(Math.fround));
    vertices.set(key,index);
    return index;
  };
  const triangle=(a,b,c)=>{
    const ai=a*3,bi=b*3,ci=c*3;
    const ux=positions[bi]-positions[ai],uy=positions[bi+1]-positions[ai+1],uz=positions[bi+2]-positions[ai+2];
    const vx=positions[ci]-positions[ai],vy=positions[ci+1]-positions[ai+1],vz=positions[ci+2]-positions[ai+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    if(nx*nx+ny*ny+nz*nz<1e-24) return;
    const facing=nx*(normals[ai]+normals[bi]+normals[ci])+ny*(normals[ai+1]+normals[bi+1]+normals[ci+1])+nz*(normals[ai+2]+normals[bi+2]+normals[ci+2]);
    if(facing<0) indices.push(a,c,b); else indices.push(a,b,c);
  };
  const corners=new Uint32Array(8),inside=[],outside=[];
  for(let gz=0;gz<r;gz++) for(let gy=0;gy<r;gy++) for(let gx=0;gx<r;gx++) {
    const start=gx+gy*side+gz*plane;
    corners.set([start,start+1,start+1+side,start+side,start+plane,start+plane+1,start+plane+1+side,start+plane+side]);
    let positive=0;
    for(const corner of corners) if(densities[corner]>0) positive++;
    if(positive===0||positive===8) continue;
    for(const tetra of TETRAHEDRA) {
      inside.length=0; outside.length=0;
      for(const corner of tetra) (densities[corners[corner]]>0?inside:outside).push(corners[corner]);
      if(inside.length===1) {
        triangle(vertex(inside[0],outside[0]),vertex(inside[0],outside[1]),vertex(inside[0],outside[2]));
      } else if(inside.length===3) {
        triangle(vertex(outside[0],inside[0]),vertex(outside[0],inside[1]),vertex(outside[0],inside[2]));
      } else if(inside.length===2) {
        const a=vertex(inside[0],outside[0]),b=vertex(inside[0],outside[1]),c=vertex(inside[1],outside[1]),d=vertex(inside[1],outside[0]);
        triangle(a,b,c); triangle(a,c,d);
      }
    }
  }
  return {
    positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),
    triangleCount:indices.length/3,bounds:{min:[0,-height/2,0],max:[size,height/2,size]},
  };
}
