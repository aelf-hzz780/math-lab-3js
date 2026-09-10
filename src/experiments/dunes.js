import * as THREE from '../../vendor/three.module.js';
import { disposeGroup, seededRandom } from '../core/resources.js';
import { duneSample } from '../math/dunes.js';

export const definition = {
  id:'dunes',title:'风成沙丘',enTitle:'Aeolian Dunes',kicker:'03 / PROCEDURAL LANDSCAPES',year:'经典模型 · 程序化图形',category:'自然与计算',
  description:'风以缓慢的时间尺度，雕刻不对称的金色曲面。',
  formula:'h = H[0.58 sin θ + 0.24 sin(2θ + 0.7) + 0.36N₁ + 0.14N₂]',
  explanation:'风向定义坐标 u、v；u 随时间平移。基频与二次谐波叠加，形成坡度不同的迎风面和背风面。两层平滑噪声弯曲沙脊，细风纹只改变着色法线。调节太阳高度，观察坡面法线如何改变光照。',
  limitations:'这是可解释的程序化高度场，不求解沙粒输运方程，也不代表新发现的数学结构。移动速度是整体平移的演示参数；没有模拟侵蚀和崩塌。少量悬浮光点是用于表现风向的沙尘视觉层，不计算真实沙粒输运。',
  parameters:[
    {key:'wind',label:'风向',type:'range',min:0,max:360,step:1,value:25},
    {key:'speed',label:'迁移速度',type:'range',min:0,max:.8,step:.01,value:.15},
    {key:'height',label:'沙丘高度',type:'range',min:0,max:4,step:.05,value:3.15},
    {key:'ripples',label:'风纹频率',type:'range',min:2,max:24,step:.5,value:14},
    {key:'sun',label:'太阳高度角',type:'range',min:5,max:80,step:1,value:12},
  ], actions:[{key:'aerial',label:'俯瞰沙脊'},{key:'low',label:'贴近沙面'}],
  presets:[{label:'日落金海',params:{wind:25,speed:.15,height:3.15,ripples:17,sun:12}},{label:'蓝调沙脊',params:{wind:115,speed:.08,height:3.65,ripples:20,sun:7}},{label:'风过沙纹',params:{wind:310,speed:.45,height:1.5,ripples:24,sun:28}}],
  sources:[{label:'Bagnold · The Physics of Blown Sand and Desert Dunes (1941)',url:'https://doi.org/10.1007/978-94-009-5682-7'},{label:'GPU Gems · Improved Perlin Noise',url:'https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-5-implementing-improved-perlin-noise'}],
};

const terrainGLSL = `
uniform float uTime,uHeight,uWind,uSpeed,uSeed;
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*.173)*43758.5453123);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
vec2 windUV(vec2 p){float c=cos(uWind),s=sin(uWind);return vec2(c*p.x+s*p.y-uTime*uSpeed,-s*p.x+c*p.y);}
float terrain(vec2 p){vec2 q=windUV(p);float n=noise2(q*.085),n2=noise2(q*.19+vec2(17,-8));float ph=.52*q.x+1.3*sin(q.y*.15+uSeed*.031)+n*.9;return uHeight*(.58*sin(ph)+.24*sin(2.*ph+.7)+.36*n+.14*n2);}
`;
export function createExperiment(ctx) {
  let params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),...ctx.params},seed=ctx.seed??42;
  const group=new THREE.Group();ctx.scene.add(group);
  const uniforms={uTime:{value:0},uHeight:{value:params.height},uWind:{value:params.wind*Math.PI/180},uSpeed:{value:params.speed},uSeed:{value:seed},uRipples:{value:params.ripples},uSun:{value:new THREE.Vector3()}};
  const geometry=new THREE.PlaneGeometry(130,130,ctx.quality==='low'?128:224,ctx.quality==='low'?128:224);geometry.rotateX(-Math.PI/2);
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:`${terrainGLSL}
    varying vec3 vWorld;varying vec3 vNormal;
    void main(){vec3 p=position;p.y=terrain(p.xz);float e=.04;vNormal=normalize(vec3(terrain(p.xz-vec2(e,0))-terrain(p.xz+vec2(e,0)),2.*e,terrain(p.xz-vec2(0,e))-terrain(p.xz+vec2(0,e))));vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`${terrainGLSL}
    uniform float uRipples;uniform vec3 uSun;varying vec3 vWorld;varying vec3 vNormal;
    void main(){vec2 q=windUV(vWorld.xz);float d=length(cameraPosition-vWorld);float wave=q.x*uRipples+sin(q.y*1.7)*.7+noise2(q*.4)*3.;float atten=1.-smoothstep(12.,48.,d);float ripple=cos(wave)*.035*atten*(1.-smoothstep(.6,1.8,fwidth(wave)));vec3 n=normalize(vNormal+vec3(cos(uWind)*ripple,0.,sin(uWind)*ripple));float lambert=max(0.,dot(n,uSun));float grain=noise2(q*80.);float ridge=clamp((vWorld.y/max(.001,uHeight)+.7)*.4,0.,1.);vec3 shadow=vec3(.075,.028,.045);vec3 sand=mix(shadow,vec3(.95,.42,.105),pow(lambert,.85));sand*=.83+.17*ridge;sand+=grain*.024*atten;vec3 eye=normalize(cameraPosition-vWorld);float glint=pow(max(0.,dot(n,normalize(uSun+eye))),110.)*.32;sand+=vec3(1.,.77,.4)*glint;vec3 haze=vec3(.36,.175,.125);float fog=1.-exp(-d*.007);gl_FragColor=vec4(mix(sand,haze,fog),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const terrain=new THREE.Mesh(geometry,material);terrain.frustumCulled=false;group.add(terrain);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(170,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uSun:uniforms.uSun},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform vec3 uSun;varying vec3 vDir;void main(){vec3 d=normalize(vDir);float h=clamp(d.y,0.,1.);vec3 c=mix(vec3(.36,.175,.125),vec3(.026,.066,.16),pow(h,.5));float glow=pow(max(0.,dot(d,uSun)),14.);c+=vec3(.7,.24,.075)*glow;float disk=smoothstep(.9993,.9997,dot(d,uSun));c+=vec3(1.,.8,.43)*disk*2.;gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`}));sky.renderOrder=-5;group.add(sky);
  function setParameters(next){params={...params,...next};uniforms.uHeight.value=Number(params.height);uniforms.uWind.value=params.wind*Math.PI/180;uniforms.uSpeed.value=Number(params.speed);uniforms.uRipples.value=Number(params.ripples);const a=params.sun*Math.PI/180;uniforms.uSun.value.set(-Math.cos(a)*.7,Math.sin(a),-Math.cos(a)*.71).normalize();}
  setParameters(params);ctx.setCamera([16,6.8,18],[0,.7,-8]);
  const dustCount=ctx.quality==='low'?180:440,dustPositions=new Float32Array(dustCount*3);
  function seedDust(){const random=seededRandom(seed);for(let i=0;i<dustCount;i++){dustPositions[i*3]=(random()-.5)*65;dustPositions[i*3+1]=.45+random()*5;dustPositions[i*3+2]=(random()-.5)*65;}}seedDust();
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dustMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`${terrainGLSL}
varying float vFade;void main(){vec3 p=position;p.xz+=vec2(cos(uWind),sin(uWind))*uTime*uSpeed*1.7;p.xz=mod(p.xz+32.5,65.)-32.5;p.y+=terrain(p.xz);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(45./-mv.z,1.,4.);vFade=.18*(1.-smoothstep(18.,46.,-mv.z));}`,fragmentShader:'varying float vFade;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.59,.24,vFade*(1.-smoothstep(.05,.5,d)));}'});const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;group.add(dust);
  let lastMetrics=-1;
  return {
    update(dt,time){uniforms.uTime.value=time;if(Math.floor(time)!==lastMetrics){lastMetrics=Math.floor(time);const s=duneSample(0,0,time,params,seed);ctx.onMetrics({'沙丘高度':`${params.height.toFixed(2)} m`,'风向':`${params.wind}°`,'原点坡度':`${(Math.acos(s.normal[1])*180/Math.PI).toFixed(1)}°`,'构造':'双谐波 + 两层噪声'});}},
    setParameters,reset(nextSeed){seed=nextSeed??42;uniforms.uSeed.value=seed;uniforms.uTime.value=0;seedDust();dustGeometry.attributes.position.needsUpdate=true;lastMetrics=-1;},
    action(key){if(key==='aerial')ctx.setCamera([0,35,5],[0,0,0]);if(key==='low')ctx.setCamera([14,5,14],[0,.7,-6]);},
    dispose(){disposeGroup(group);},
  };
}
