import * as THREE from '../../vendor/three.module.js';

/** A generated studio environment illuminates metal independently of the black backdrop. */
export function createStrataEnvironment() {
  const width=256,height=128,data=new Float32Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=(x+.5)/width,v=(y+.5)/height;
    const ribbon=Math.pow(Math.max(0,Math.cos((v-.34)*Math.PI)),24);
    const panel=Math.pow(Math.max(0,Math.cos((u-.2)*Math.PI*2)),32)*Math.exp(-(((v-.35)/.18)**2));
    const rim=Math.pow(Math.max(0,Math.cos((u-.72)*Math.PI*2)),20)*Math.exp(-(((v-.56)/.16)**2));
    const i=(y*width+x)*4;
    data[i]=.08+ribbon*.9+panel*4.5+rim*.35;
    data[i+1]=.1+ribbon*.95+panel*3.9+rim*1.9;
    data[i+2]=.2+ribbon*1.2+panel*3.4+rim*3.2;
    data[i+3]=1;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;
  texture.needsUpdate=true;
  return texture;
}

const noiseGLSL=`
uniform float strataTravel;
uniform float strataIridescence;
varying vec3 vStrataWorld;
float strataHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float strataNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(strataHash(i),strataHash(i+vec3(1,0,0)),f.x),mix(strataHash(i+vec3(0,1,0)),strataHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(strataHash(i+vec3(0,0,1)),strataHash(i+vec3(1,0,1)),f.x),mix(strataHash(i+vec3(0,1,1)),strataHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

/** Thin-film interference plus a procedural mineral tint and derivative-filtered microrelief. */
export function createStrataMaterial(params) {
  const uniforms={strataTravel:{value:0},strataIridescence:{value:params.iridescence}};
  const material=new THREE.MeshPhysicalMaterial({
    color:0xffffff,metalness:.88,roughness:params.roughness,
    iridescence:params.iridescence,iridescenceIOR:1.36,iridescenceThicknessRange:[140,680],
    clearcoat:.45,clearcoatRoughness:.3,envMapIntensity:.65,
  });
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStrataWorld;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvStrataWorld=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${noiseGLSL}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 strataP=vStrataWorld-vec3(0.,0.,strataTravel);
        float strataBroad=strataNoise(strataP*.24);
        float strataVein=strataNoise(strataP*1.3+strataBroad*3.);
        float strataFacing=abs(dot(normalize(vNormal),normalize(vViewPosition)));
        float strataPhase=fract(strataBroad*1.8+strataP.y*.09+(1.-strataFacing)*.23);
        vec3 strataTint=mix(vec3(.025,.055,.38),vec3(.32,.045,.32),smoothstep(0.,.28,strataPhase));
        strataTint=mix(strataTint,vec3(.018,.36,.34),smoothstep(.32,.60,strataPhase));
        strataTint=mix(strataTint,vec3(.55,.32,.055),smoothstep(.74,.87,strataPhase));
        strataTint=mix(strataTint,vec3(.025,.055,.38),smoothstep(.9,1.,strataPhase));
        diffuseColor.rgb*=mix(vec3(.24,.3,.38),strataTint,strataIridescence)*(.8+.2*strataVein);
      `)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+(.5-strataVein)*.13,.12,.8);
      `)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float strataGrain=strataNoise(strataP*6.)*.045+strataNoise(strataP*17.)*.012;
        vec3 strataQ0=dFdx(-vViewPosition),strataQ1=dFdy(-vViewPosition);
        vec3 strataR1=cross(strataQ1,normal),strataR2=cross(normal,strataQ0);
        float strataDet=dot(strataQ0,strataR1);
        vec3 strataGrad=sign(strataDet)*(dFdx(strataGrain)*strataR1+dFdy(strataGrain)*strataR2);
        normal=normalize(max(abs(strataDet),1e-12)*normal-strataGrad*.42);
      `);
  };
  material.customProgramCacheKey=()=>'forma-strata-1';
  return {material,uniforms};
}
