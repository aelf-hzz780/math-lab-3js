import * as THREE from '../../vendor/three.module.js';

const fieldGLSL=`
vec3 curlField(vec3 p,float t){
 return vec3(sin(p.x+.4*t)*cos(p.y)-cos(p.z-.5*t)*sin(p.x),sin(p.y+.7*t)*cos(p.z)-cos(p.x+.4*t)*sin(p.y),sin(p.z-.5*t)*cos(p.x)-cos(p.y+.7*t)*sin(p.z));
}
vec3 targetFlower(vec4 s){
 float theta=s.x*6.2831853,lobe=floor(s.w*5.),a=theta+lobe*.8,polar=acos(2.*s.y-1.),sn=sin(polar);
 vec3 c=vec3(0.,.05,-.4);
 if(lobe<.5)c=vec3(-.82,1.2,.04);else if(lobe<1.5)c=vec3(.63,1.55,.02);else if(lobe<2.5)c=vec3(.7,-1.5,.12);else if(lobe<3.5)c=vec3(-.75,-1.25,-.04);
 float radius=(.43+.64*pow(s.z,1./3.))*(1.+.16*sin(3.*a+polar)*sn+.10*cos(5.*a-2.*polar)*sn*sn);
 return c+vec3(cos(a)*sn*radius*1.04,cos(polar)*radius*1.08,sin(a)*sn*radius*.83+.12*sin(3.*polar+2.*a)*sn);
}
vec3 targetRibbon(vec4 s){
 float a=s.x*18.8495559,y=(s.x-.5)*5.3,tube=.3+.48*sqrt(s.y),b=s.w*6.2831853;
 return vec3(sin(a)*(.58+.28*cos(y))+cos(b)*tube,y+.28*sin(b),cos(a)*.65+sin(b)*tube+(s.z-.5)*.12);
}
vec3 targetVortex(vec4 s){
 float a=s.x*6.2831853,r=.6+1.55*sqrt(s.y),wave=.4*sin(3.*a+r*2.);
 return vec3(cos(a)*r*.83,sin(a)*r*1.35,.6*sin(2.*a+r*2.)+wave+(s.z-.5)*.18);
}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){
 vec3 result=mix(a,b,smoothstep(.05,.4,t));result=mix(result,c,smoothstep(.38,.72,t));return mix(result,d,smoothstep(.7,.98,t));
}`;

export function createParticlePaintMaterial(){
 const uniforms={uTime:{value:0},uWeights:{value:new THREE.Vector3(1,0,0)},uDepth:{value:1},uFlow:{value:.7},uBrush:{value:1},uPointer:{value:new THREE.Vector3()},uPointerStrength:{value:0},uOpacity:{value:.45}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:true,
  vertexShader:`attribute vec4 aSeed;
   uniform float uTime,uDepth,uFlow,uBrush,uPointerStrength,uOpacity;uniform vec3 uWeights,uPointer;
   varying vec2 vUv;varying vec3 vColor;varying float vAlpha;
   ${fieldGLSL}
   void main(){
    vec3 original=targetFlower(aSeed)*uWeights.x+targetRibbon(aSeed)*uWeights.y+targetVortex(aSeed)*uWeights.z;
    vec3 field=curlField(original*.72,uTime*.17);
    vec3 p=original+field*(.055+.085*sin(uTime*.4+aSeed.w*6.283))*uFlow;
    p.z*=uDepth;
    vec3 away=p-uPointer;float d=length(away.xy);float influence=exp(-d*d/1.3);
    p+=vec3(away.xy/(d+.18),.26)*influence*uPointerStrength;
    vec3 tangent=normalize(vec3(-original.y,original.x,.2)*.35+field+vec3(.45,.35,.2));
    vec4 view=modelViewMatrix*vec4(p,1.);vec2 dir=normalize((modelViewMatrix*vec4(tangent,0.)).xy+vec2(.0001));
    float stroke=(.011+.027*aSeed.z)*uBrush;
    view.xy+=dir*position.x*stroke+vec2(-dir.y,dir.x)*position.y*(.0034+.0022*aSeed.y)*uBrush;
    gl_Position=projectionMatrix*view;vUv=position.xy;
    float pigment=clamp(.5+.23*sin(original.x*2.1+original.y*1.5)+.17*sin(original.y*3.4-original.x*1.2)+.08*(aSeed.z-.5),0.,1.);
    vec3 flower=palette(pigment,vec3(.014,.035,.13),vec3(.11,.045,.34),vec3(.37,.17,.65),vec3(.81,.53,.84));
    float warm=clamp(exp(-dot(original.xy-vec2(.55,1.55),original.xy-vec2(.55,1.55))*1.5)+exp(-dot(original.xy-vec2(-.35,-1.4),original.xy-vec2(-.35,-1.4))*1.7),0.,1.);
    flower=mix(flower,vec3(.95,.024,.018),smoothstep(.10,.83,warm));
    float highlight=smoothstep(.28,.83,original.z)*(.45+.3*max(0.,sin(original.y*3.)));
    flower=mix(flower,vec3(.92,.73,.95),highlight);
    vec3 ribbon=palette(pigment,vec3(.025,.075,.12),vec3(.07,.34,.53),vec3(.28,.67,.76),vec3(.80,.89,1.));
    vec3 vortex=palette(pigment,vec3(.15,.035,.10),vec3(.48,.13,.25),vec3(.99,.46,.35),vec3(1.,.83,.63));
    vec3 color=flower*uWeights.x+ribbon*uWeights.y+vortex*uWeights.z;
    float light=.57+.40*smoothstep(-.6,.8,original.z)+.13*pow(aSeed.z,8.);
    vColor=color*light;vAlpha=uOpacity*(.55+.45*aSeed.z);
   }`,
  fragmentShader:`varying vec2 vUv;varying vec3 vColor;varying float vAlpha;
   void main(){float fiber=exp(-vUv.y*vUv.y*2.4)*(1.-smoothstep(.42,1.,abs(vUv.x)));float alpha=fiber*vAlpha;if(alpha<.015)discard;gl_FragColor=vec4(vColor,alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`,
 });
 return {material,uniforms};
}
export function createPaintBackdropMaterial(){
 return new THREE.ShaderMaterial({toneMapped:true,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float cloud=.5+.22*sin(p.x*8.+sin(p.y*9.))+.15*sin(p.y*13.-p.x*4.);float glow=exp(-dot(p,p)*1.25);vec3 color=mix(vec3(.009,.009,.018),vec3(.07,.025,.095),cloud*glow);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
