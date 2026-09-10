import * as THREE from '../../vendor/three.module.js';

const vertexShader=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const blurShader=`varying vec2 vUv;
uniform sampler2D inputTexture;uniform vec2 direction;uniform float threshold;
vec3 sampleLight(vec2 uv){vec3 c=texture2D(inputTexture,uv).rgb;
  float brightness=max(max(c.r,c.g),c.b);
  return c*(threshold>0.0?smoothstep(threshold,threshold+0.65,brightness):1.0);}
void main(){vec3 c=sampleLight(vUv)*0.227027;
  c+=(sampleLight(vUv+direction*1.384615)+sampleLight(vUv-direction*1.384615))*0.316216;
  c+=(sampleLight(vUv+direction*3.230769)+sampleLight(vUv-direction*3.230769))*0.070270;
  gl_FragColor=vec4(c,1.0);}`;
const compositeShader=`varying vec2 vUv;
uniform sampler2D sceneTexture;uniform sampler2D glowTexture;
uniform float strength;uniform vec3 accent;
void main(){vec4 base=texture2D(sceneTexture,vUv);
  float halo=exp(-length((vUv-vec2(0.52,0.51))*vec2(1.0,0.85))*5.0);
  vec3 backdrop=vec3(0.0018,0.0032,0.006)+accent*halo*0.017;
  gl_FragColor=vec4(base.rgb+backdrop*(1.0-base.a)+texture2D(glowTexture,vUv).rgb*strength,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** One shared, fixed-size postprocess chain; no allocation in render(). */
export class GlowRenderer {
  constructor(renderer) {
    this.renderer=renderer;this.enabled=true;
    const options={type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:false};
    this.frame=new THREE.WebGLRenderTarget(1,1,{...options,depthBuffer:true});
    this.frame.samples=4;
    this.ping=new THREE.WebGLRenderTarget(1,1,options);this.pong=new THREE.WebGLRenderTarget(1,1,options);
    this.blur=new THREE.ShaderMaterial({vertexShader,fragmentShader:blurShader,depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{inputTexture:{value:null},direction:{value:new THREE.Vector2()},threshold:{value:.75}}});
    this.composite=new THREE.ShaderMaterial({vertexShader,fragmentShader:compositeShader,depthTest:false,depthWrite:false,
      uniforms:{sceneTexture:{value:this.frame.texture},glowTexture:{value:this.pong.texture},strength:{value:.3},accent:{value:new THREE.Color(0x33878d)}}});
    this.screen=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.blur);this.quad.frustumCulled=false;this.screen.add(this.quad);
    this.size=new THREE.Vector2();this.width=1;this.height=1;
  }
  resize() {
    this.renderer.getDrawingBufferSize(this.size);
    this.frame.setSize(this.size.x,this.size.y);
    this.width=Math.max(1,Math.floor(this.size.x/3));this.height=Math.max(1,Math.floor(this.size.y/3));
    this.ping.setSize(this.width,this.height);this.pong.setSize(this.width,this.height);
  }
  render(scene,camera) {
    const r=this.renderer;
    if(!this.enabled){r.render(scene,camera);return;}
    try {
      r.setRenderTarget(this.frame);r.render(scene,camera);
      this.quad.material=this.blur;this.blur.uniforms.inputTexture.value=this.frame.texture;
      this.blur.uniforms.direction.value.set(1.7/this.width,0);this.blur.uniforms.threshold.value=.75;
      r.setRenderTarget(this.ping);r.render(this.screen,this.camera);
      this.blur.uniforms.inputTexture.value=this.ping.texture;
      this.blur.uniforms.direction.value.set(0,1.7/this.height);this.blur.uniforms.threshold.value=0;
      r.setRenderTarget(this.pong);r.render(this.screen,this.camera);
      this.quad.material=this.composite;r.setRenderTarget(null);r.render(this.screen,this.camera);
    } finally { r.setRenderTarget(null); }
  }
  dispose() {
    this.frame.dispose();this.ping.dispose();this.pong.dispose();this.blur.dispose();this.composite.dispose();this.quad.geometry.dispose();this.screen.clear();
  }
}
