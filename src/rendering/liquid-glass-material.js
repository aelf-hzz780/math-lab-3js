import * as THREE from '../../vendor/three.module.js';

function hash(x,y,z,seed){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y,z,seed) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let fx=x-ix,fy=y-iy,fz=z-iz;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
  let value=0;
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)value+=hash(ix+a,iy+b,iz+c,seed)*(a?fx:1-fx)*(b?fy:1-fy)*(c?fz:1-fz);
  return value;
}

/** Original procedural cloud lighting; generated once, shared by background and refraction. */
export function createLiquidCloudTexture(seed=42,low=false) {
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Invalid cloud seed');
  const width=low?2048:4096,height=width/2,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const phi=(x+.5)/width*Math.PI*2-Math.PI,theta=(y+.5)/height*Math.PI;
    const dx=Math.cos(phi)*Math.sin(theta),dy=Math.cos(theta),dz=Math.sin(phi)*Math.sin(theta);
    let frequency=6.8,amplitude=.56,value=0;
    for(let octave=0;octave<6;octave++) {value+=amplitude*noise(dx*frequency+17,dy*frequency+6,dz*frequency-3,seed+octave*119);frequency*=2.03;amplitude*=.48;}
    const cloud=Math.max(0,Math.min(1,(value-.34)*3.1)),silver=Math.pow(cloud,1.9);
    const light=.65+.35*noise(dx*11+16.7,dy*11+6.3,dz*11-3.2,seed+714);
    const brightness=.015+silver*light*.23+Math.max(0,dy)*.008;
    const i=(y*width+x)*4;
    data[i]=Math.min(255,brightness*245);data[i+1]=Math.min(255,brightness*250);data[i+2]=Math.min(255,brightness*255);data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height);texture.wrapS=THREE.RepeatWrapping;
  texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  return texture;
}

const field=`
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
vec2 turn(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c)*p;}
float ring(vec3 p,float radius,float width,float t){float a=atan(p.y,p.x);return length(vec2(length(p.xy)-radius-.13*sin(2.*a+t),p.z-.18*sin(3.*a-t*.6)))-(width+.09*sin(3.*a+t*.7));}
float field(vec3 p){
  float t=liquidTime;
  p-=liquidPull*exp(-dot(p-liquidAnchor,p-liquidAnchor)*.28);
  p.xy=turn(p.xy,.11*sin(t*.37));
  vec3 q=p+vec3(.5,-.38,0.);q.xy=turn(q.xy,-.24);q.yz=turn(q.yz,.44+.12*sin(t*.4));q.y/=1.1;
  float d=ring(q,1.52,liquidShape==1?.33:.46,t);
  vec3 r=p+vec3(-.7,.92,.1);r.xy=turn(r.xy,.68);r.yz=turn(r.yz,1.05+.17*sin(t*.33));
  d=smin(d,ring(r,1.1,liquidShape==1?.34:.48,-t*.8),.54);
  vec3 b=p+vec3(-.75-.18*sin(t*.7),-1.16,.36);d=smin(d,length(b)-(.72+.08*sin(t*.6)),.62);
  b=p+vec3(.12,1.85,-.25);b.x/=1.34;d=smin(d,length(b)-.62,.48);
  for(int i=0;i<4;i++){float fi=float(i),a=fi*2.4+.35*t;vec3 c=vec3(2.85*cos(a),2.2*sin(a)+.2*sin(t+fi),.6*sin(a*1.8));d=min(d,length(p-c)-(liquidShape==2?.25:.13));}
  return d;
}
vec3 normalAt(vec3 p){const float e=.003;return normalize(vec3(field(p+vec3(e,0,0))-field(p-vec3(e,0,0)),field(p+vec3(0,e,0))-field(p-vec3(0,e,0)),field(p+vec3(0,0,e))-field(p-vec3(0,0,e))));}
`;

export function createLiquidGlassMaterial({seed=42,low=false,params}={}) {
  if(!params)throw new TypeError('Liquid material requires parameters');
  const uniforms={liquidTime:{value:0},liquidShape:{value:0},liquidIOR:{value:params.ior},liquidDispersion:{value:params.dispersion},
    liquidClouds:{value:createLiquidCloudTexture(seed,low)},liquidPull:{value:new THREE.Vector3()},liquidAnchor:{value:new THREE.Vector3()},
    liquidCameraWorld:{value:new THREE.Matrix4()},liquidProjectionInverse:{value:new THREE.Matrix4()},liquidCameraPosition:{value:new THREE.Vector3()}};
  const material=new THREE.ShaderMaterial({
    uniforms,depthTest:false,depthWrite:false,toneMapped:true,
    vertexShader:'varying vec2 liquidUv;void main(){liquidUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
precision highp float;
varying vec2 liquidUv;
uniform sampler2D liquidClouds;
uniform float liquidTime,liquidIOR,liquidDispersion;
uniform int liquidShape;
uniform vec3 liquidPull,liquidAnchor,liquidCameraPosition;
uniform mat4 liquidCameraWorld,liquidProjectionInverse;
${field}
vec3 cloudy(vec3 d){d=normalize(d);vec2 uv=vec2(atan(d.z,d.x)/(6.2831853)+.5,acos(clamp(d.y,-1.,1.))/3.14159265);return texture2D(liquidClouds,uv).rgb;}
float boxLight(vec3 d,vec3 normal,vec3 side,float width,float height){
  float forward=dot(d,normal);vec3 up=cross(normal,side);
  vec2 p=vec2(dot(d,side),dot(d,up))/max(.001,forward);
  return (1.-smoothstep(width-.035,width+.065,abs(p.x)))*(1.-smoothstep(height-.06,height+.09,abs(p.y)))*step(0.,forward);
}
vec3 environment(vec3 d){
  vec3 c=cloudy(d)*1.25;
  c+=vec3(3.6,3.7,3.8)*boxLight(d,normalize(vec3(-.7,.65,1.)),normalize(vec3(1.,0.,.7)),.13,.66);
  c+=vec3(2.8)*boxLight(d,normalize(vec3(.8,.3,.7)),normalize(vec3(.7,0.,-.8)),.075,.85);
  c+=vec3(2.5)*pow(max(0.,dot(d,normalize(vec3(.1,1.,-.3)))),24.);
  return c;
}
vec2 bounds(vec3 ro,vec3 rd){float b=dot(ro,rd),h=b*b-dot(ro,ro)+24.01;if(h<0.)return vec2(-1.);h=sqrt(h);return vec2(max(0.,-b-h),-b+h);}
void main(){
  vec2 ndc=liquidUv*2.-1.;
  vec4 local=liquidProjectionInverse*vec4(ndc,1.,1.);local/=local.w;
  vec3 ro=liquidCameraPosition,rd=normalize((liquidCameraWorld*vec4(local.xyz,1.)).xyz-ro);
  vec3 color=cloudy(rd)*.76;
  vec2 interval=bounds(ro,rd);float travel=interval.x,d=1.;bool hit=false;
  if(interval.y>0.)for(int i=0;i<${low?60:86};i++){
    d=field(ro+rd*travel);if(abs(d)<.0028){hit=true;break;}
    travel+=max(.0015,abs(d)*.62);if(travel>interval.y)break;
  }
  if(hit){
    vec3 p=ro+rd*travel,n=normalAt(p);if(dot(n,rd)>0.)n=-n;
    float cosine=max(0.,-dot(rd,n)),f0=pow((liquidIOR-1.)/(liquidIOR+1.),2.);
    float fresnel=f0+(1.-f0)*pow(1.-cosine,5.);
    vec3 inside=refract(rd,n,1./liquidIOR),exitPoint=p-n*.009+inside*.012;float thickness=.018;
    for(int i=0;i<${low?24:38};i++){
      float sd=field(exitPoint);if(sd>-.001)break;
      float stepSize=max(.012,-sd*.62);thickness+=stepSize;exitPoint+=inside*stepSize;
      if(thickness>6.)break;
    }
    vec3 exitNormal=-normalAt(exitPoint),transmitted=refract(inside,exitNormal,liquidIOR);
    if(dot(transmitted,transmitted)<.01)transmitted=reflect(inside,exitNormal);
    float spread=liquidDispersion*.028;
    vec3 redRay=refract(inside,exitNormal,liquidIOR-spread),blueRay=refract(inside,exitNormal,liquidIOR+spread);
    if(dot(redRay,redRay)<.01)redRay=transmitted;if(dot(blueRay,blueRay)<.01)blueRay=transmitted;
    vec3 glass=vec3(environment(redRay).r,environment(transmitted).g,environment(blueRay).b);
    glass*=exp(-thickness*vec3(.035,.02,.012));
    vec3 reflected=environment(reflect(rd,n));
    color=mix(glass,reflected,fresnel);
    // Broad highlights carry surface curvature without a metallic base color.
    color+=vec3(.014,.02,.023)*(1.-fresnel);
    color=mix(color,color*.92,smoothstep(1.,3.8,thickness));
  }
  float vignette=1.-.3*smoothstep(.35,1.2,length(ndc*vec2(.75,1.)));
  gl_FragColor=vec4(color*vignette,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`});
  return {material,uniforms};
}
