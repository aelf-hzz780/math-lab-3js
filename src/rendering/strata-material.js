import * as THREE from '../../vendor/three.module.js';

/** Broad, low-contrast studio illumination stays independent of the dark backdrop. */
export function createStrataEnvironment() {
  const width=256,height=128,data=new Float32Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=(x+.5)/width,v=(y+.5)/height;
    const ribbon=Math.pow(Math.max(0,Math.cos((v-.34)*Math.PI)),4);
    const panel=Math.pow(Math.max(0,Math.cos((u-.2)*Math.PI*2)),6)*Math.exp(-(((v-.35)/.18)**2));
    const rim=Math.pow(Math.max(0,Math.cos((u-.72)*Math.PI*2)),5)*Math.exp(-(((v-.56)/.16)**2));
    const i=(y*width+x)*4;
    data[i]=.28+ribbon*.55+panel*.8+rim*.24;
    data[i+1]=.3+ribbon*.58+panel*.76+rim*.3;
    data[i+2]=.36+ribbon*.64+panel*.72+rim*.42;
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
varying float vStrataOcclusion;
float strataHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float strataNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(strataHash(i),strataHash(i+vec3(1,0,0)),f.x),mix(strataHash(i+vec3(0,1,0)),strataHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(strataHash(i+vec3(0,0,1)),strataHash(i+vec3(1,0,1)),f.x),mix(strataHash(i+vec3(0,1,1)),strataHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

/** Continuous pastel pigments with broad highlights; color does not cycle with the viewing angle. */
export function createStrataMaterial(params) {
  const uniforms={strataTravel:{value:0},strataIridescence:{value:params.iridescence}};
  const material=new THREE.MeshPhysicalMaterial({
    color:0xffffff,metalness:.06,roughness:params.roughness,
    iridescence:params.iridescence*.08,iridescenceIOR:1.3,iridescenceThicknessRange:[220,320],
    clearcoat:.025,clearcoatRoughness:.65,envMapIntensity:.42,
    sheen:.3,sheenRoughness:1,sheenColor:new THREE.Color(.32,.36,.45),specularIntensity:.3,
  });
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStrataWorld;\nvarying float vStrataOcclusion;\nattribute float strataOcclusion;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvStrataWorld=(modelMatrix*vec4(position,1.)).xyz;\nvStrataOcclusion=strataOcclusion;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${noiseGLSL}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 strataP=vStrataWorld-vec3(0.,0.,strataTravel);
        float strataBroad=strataNoise(strataP*.048);
        float strataDrift=strataNoise(strataP*.028+vec3(16.2,4.7,9.1));
        float strataBlue=smoothstep(.2,.8,strataBroad);
        float strataPeach=smoothstep(.42,.82,strataDrift)*.72;
        vec3 strataTint=mix(vec3(.38,.30,.58),vec3(.20,.46,.54),strataBlue);
        strataTint=mix(strataTint,vec3(.62,.38,.35),strataPeach);
        diffuseColor.rgb*=mix(vec3(.58,.60,.65),strataTint,strataIridescence);
      `)
      .replace('#include <aomap_fragment>',`#include <aomap_fragment>
        float strataShade=clamp(vStrataOcclusion,.25,1.);
        reflectedLight.indirectDiffuse*=strataShade;
        reflectedLight.directDiffuse*=strataShade*strataShade;
        reflectedLight.indirectSpecular*=strataShade;
      `);

  };
  material.customProgramCacheKey=()=>'forma-strata-soft-2';
  return {material,uniforms};
}
