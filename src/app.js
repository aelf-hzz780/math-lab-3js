import * as THREE from '../vendor/three.module.js';
import {catalog, iconSvg, loadExperiment} from './catalog.js';
import {validateParameters, SimulationClock} from './core/state.js';
import {OrbitController} from './core/orbit.js';
import {disposeGroup} from './core/resources.js';
import {CameraMotion,isFieldPointerActive} from './core/presentation.js';
import {GlowRenderer} from './core/glow.js';

const $=id=>document.getElementById(id);
const host=$('canvas-host'),clock=new SimulationClock();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
clock.paused=reducedMotion;
const cameraMotion=new CameraMotion({enabled:!reducedMotion});
let renderer,glow,scene,camera,orbit,current,definition,currentId,params={},seed=42,epoch=0;
let sceneAbort;
let cameraPreset={position:[9,6,11],target:[0,0,0]},dirty=true,frameId,quality='high',resizeObserver,viewScale=1;
let fps=0,metricValues={},lastError=null,toastTimer,previousTime=performance.now(),fpsStart=performance.now(),fpsFrames=0;
const savedStates=new Map();
const cleanupCallbacks=[];

function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function formatValue(value,step=1){return typeof value==='number'?value.toFixed(Math.min(4,(String(step).split('.')[1]||'').length)):String(value);}
function listen(target,event,handler,options){target.addEventListener(event,handler,options);cleanupCallbacks.push(()=>target.removeEventListener(event,handler,options));}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function enableExperimentControls(enabled){
  document.querySelectorAll('#parameters input,#parameters select,#actions button,#scene-presets button,#seed,#defaults-button,#reset-button,#camera-reset,#export-button').forEach(node=>node.disabled=!enabled);
}
function applyInteractionResult(result){
  if(!result)return;
  if(result.seed!==undefined){
    if(!Number.isInteger(result.seed)||result.seed<0||result.seed>4294967295)throw new RangeError('Invalid interaction seed');
    seed=result.seed;$('seed').value=seed;
  }
  if(result.params){params=validateParameters(definition.parameters,{...params,...result.params});renderParameters();}
  saveState();
}
function reportError(error,context='experiment'){
  const traceId=`forma-${context}-${globalThis.crypto?.randomUUID?.().slice(0,8)||Date.now().toString(36)}`;
  console.error(`[${traceId}]`,error);lastError={traceId,message:error.message};
  $('error-message').textContent=`${error.message} · 参考编号 ${traceId}`;$('error').hidden=false;$('loading').hidden=true;
  clock.paused=true;updatePlayback();
}

function renderCatalog(){
  $('experiment-count').textContent=`${catalog.length} 个交互实验`;
  $('catalog-count').textContent=`INDEX / ${catalog.length}`;
  const list=$('experiment-list');
  catalog.forEach((item,index)=>{
    if(item.section)list.append(element('div','nav-group-label',item.section));
    const button=element('button','experiment-button');button.dataset.experiment=item.id;button.setAttribute('aria-current','false');button.setAttribute('aria-label',`${index+1}. ${item.title}`);
    const icon=element('span','nav-icon');icon.innerHTML=iconSvg(item.icon);
    const label=element('span','nav-name',item.title);label.append(element('span','nav-en',item.en));
    button.append(icon,label,element('span','nav-num',String(index+1).padStart(2,'0')));
    button.addEventListener('click',()=>{location.hash=item.id;closeDrawers();});list.append(button);
    const quick=element('button','scene-chip');quick.dataset.scene=item.id;quick.setAttribute('aria-current','false');
    quick.append(element('span','chip-index',String(index+1).padStart(2,'0')),element('span','',item.title));
    quick.addEventListener('click',()=>{location.hash=item.id;closeDrawers();});$('scene-rail').append(quick);
  });
}

function selectedQuality(){return $('quality').value==='auto'?(innerWidth<=900?'low':'high'):$('quality').value;}
function setupRenderer(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    renderer.info.autoReset=false;glow=new GlowRenderer(renderer);
    renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{throw new Error(`GPU 着色器编译失败：${gl.getShaderInfoLog(vertex)||gl.getShaderInfoLog(fragment)||gl.getProgramInfoLog(program)}`);};
    host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','可旋转和缩放的三维数学实验');renderer.domElement.setAttribute('role','img');
    camera=new THREE.PerspectiveCamera(42,1,.03,1000);
    orbit=new OrbitController(camera,renderer.domElement,event=>{
      if(!current?.pick)return;
      const rect=renderer.domElement.getBoundingClientRect();
      const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.12;raycaster.setFromCamera(pointer,camera);
      try{applyInteractionResult(current.pick(raycaster));dirty=true;}catch(error){reportError(error,'selection');}
    });
    listen(renderer.domElement,'pointerdown',()=>cameraMotion.interact());
    for(const type of ['pointerdown','pointermove','pointerup','pointerleave','pointercancel']){
      listen(renderer.domElement,type,event=>{
        if(!current?.pointer)return;
        const rect=renderer.domElement.getBoundingClientRect();
        if(rect.width<=0||rect.height<=0)return;
        const active=isFieldPointerActive(event,orbit.pointers);
        if(active)cameraMotion.interact();
        try{
          current.pointer({x:Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1)),
            y:Math.max(-1,Math.min(1,1-(event.clientY-rect.top)/rect.height*2)),active,pressed:active&&!!(event.buttons&1)});
          dirty=true;
        }catch(error){reportError(error,'pointer');}
      });
    }
    listen(renderer.domElement,'wheel',()=>cameraMotion.interact(),{passive:true});
    listen(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();reportError(new Error('图形上下文已丢失，请重新加载实验。'),'webgl');});
    listen(renderer.domElement,'webglcontextrestored',()=>selectExperiment(currentId,true));
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  }catch(error){reportError(new Error(`此浏览器无法创建 WebGL 画布：${error.message}`),'webgl');}
}

function resize(){
  if(!renderer)return;
  const rect=host.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='low'?1:1.75));
  renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
  glow?.resize();
  camera.aspect=Math.max(1,rect.width)/Math.max(1,rect.height);camera.updateProjectionMatrix();dirty=true;
  const nextScale=Math.max(1,.95/camera.aspect);
  if(orbit&&cameraPreset.fitAspect!==false&&nextScale!==viewScale){orbit.spherical.radius*=nextScale/viewScale;orbit.apply();}
  viewScale=nextScale;
}

function setCamera(position,target,{fitAspect=true}={}){
  cameraPreset={position:[...position],target:[...target],fitAspect};
  orbit.set(position.map((value,i)=>target[i]+(value-target[i])*(fitAspect?viewScale:1)),target);
}

function displayMetrics(values){
  metricValues=values;
  const entries=Object.entries(values).slice(0,4);const strip=$('metrics');
  if(strip.children.length!==entries.length||entries.some(([label],i)=>strip.children[i]?.dataset.label!==label)){
    strip.replaceChildren();entries.forEach(([label,value],index)=>{
      const metric=element('div','metric');metric.dataset.label=label;const output=element('div','metric-value',String(value));output.title=String(value);output.classList.toggle('long',String(value).length>16);metric.append(element('div','metric-label',label),output,element('div','metric-index',`MEASURE ${String(index+1).padStart(2,'0')}`));strip.append(metric);
    });
  }else entries.forEach(([,value],i)=>{const node=strip.children[i].children[1];if(node.textContent!==String(value)){node.textContent=String(value);node.title=String(value);node.classList.toggle('long',String(value).length>16);}});
}

function renderDefinition(){
  const index=catalog.findIndex(item=>item.id===currentId),item=catalog[index];
  $('experiment-index').textContent=`EXPERIMENT ${String(index+1).padStart(2,'0')}`;
  $('experiment-kicker').textContent=definition.kicker||item.section?.slice(5)||'MATHEMATICAL EXPLORATION';
  $('experiment-title').textContent=definition.title||item.title;
  $('experiment-subtitle').textContent=definition.enTitle||item.en;
  $('model-badge').textContent=item.type;
  $('experiment-description').textContent=definition.description;
  $('scene-story').textContent=definition.description;
  $('formula').textContent=definition.formula;
  $('explanation').textContent=definition.explanation;
  $('limitations').textContent=definition.limitations;
  $('sources').replaceChildren();
  for(const source of definition.sources||[]){
    const url=new URL(source.url);if(!['https:','http:'].includes(url.protocol))continue;
    const link=element('a','',source.label);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';$('sources').append(link);
  }
  renderParameters();
  renderPresets();
}

function renderPresets(){
  const container=$('scene-presets');container.replaceChildren();
  container.append(element('span','preset-label','换一种看法'));
  for(const preset of definition.presets||[]){
    const button=element('button','preset-button',preset.label);button.dataset.preset=preset.label;
    button.addEventListener('click',()=>{
      try{
        const next=validateParameters(definition.parameters,{...params,...preset.params});
        current.setParameters(next);params=next;clock.reset();current.reset(seed);dirty=true;
        renderParameters();saveState();
        container.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));
        toast(`已切换：${preset.label}`);
      }catch(error){reportError(error,'preset');}
    });container.append(button);
  }
  container.hidden=!definition.presets?.length;
}

function renderParameters(){
  const container=$('parameters');container.replaceChildren();
  for(const parameter of definition.parameters||[]){
    const wrapper=element('div','parameter'),head=element('div','parameter-head');
    const label=element('label','',parameter.label);label.htmlFor=`param-${parameter.key}`;head.append(label);wrapper.append(head);
    let input;
    if(parameter.type==='select'){
      input=element('select');for(const option of parameter.options){const node=element('option','',option.label);node.value=String(option.value);input.append(node);}input.value=String(params[parameter.key]);
    }else{
      const output=element('output','',formatValue(params[parameter.key],parameter.step));output.htmlFor=`param-${parameter.key}`;head.append(output);
      input=element('input');input.type='range';input.min=parameter.min;input.max=parameter.max;input.step=parameter.step;input.value=params[parameter.key];
      const paint=()=>{output.textContent=formatValue(Number(input.value),parameter.step);input.style.setProperty('--fill',`${(Number(input.value)-parameter.min)/(parameter.max-parameter.min)*100}%`);};paint();input.addEventListener('input',paint);
      wrapper.append(input);const scale=element('div','parameter-scale');scale.append(element('span','',String(parameter.min)),element('span','',String(parameter.max)));wrapper.append(scale);
    }
    input.id=`param-${parameter.key}`;input.dataset.parameter=parameter.key;
    if(parameter.type==='select')wrapper.append(input);
    input.addEventListener(parameter.type==='select'?'change':'input',()=>{
      try{
        const value=parameter.type==='select'?parameter.options.find(option=>String(option.value)===input.value).value:Number(input.value);
        const next=validateParameters(definition.parameters,{...params,[parameter.key]:value});
        current?.setParameters(next);params=next;dirty=true;saveState();$('scene-presets').querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed','false'));
      }catch(error){reportError(error,'parameter');}
    });
    container.append(wrapper);
  }
  $('actions').replaceChildren();
  for(const action of definition.actions||[]){
    const button=element('button','',action.label);button.dataset.action=action.key;
    button.addEventListener('click',()=>{try{applyInteractionResult(current?.action?.(action.key));dirty=true;}catch(error){reportError(error,'action');}});$('actions').append(button);
  }
}

function saveState(){if(currentId&&definition)savedStates.set(currentId,{params:{...params},seed});}
function cleanScene(){
  sceneAbort?.abort();sceneAbort=null;
  try{current?.dispose();}catch(error){console.error('[forma-dispose]',error);}
  current=null;
  if(scene){disposeGroup(scene);scene.clear();scene=null;}
  renderer?.renderLists.dispose();
}

async function selectExperiment(id,force=false){
  if(!catalog.some(item=>item.id===id))id='navier';
  if(currentId===id&&!force)return;
  saveState();const version=++epoch;cleanScene();currentId=id;definition=null;lastError=null;
  document.querySelector('.stage').dataset.id=id;
  enableExperimentControls(false);
  clock.reset();metricValues={};$('metrics').replaceChildren();$('loading').hidden=false;$('error').hidden=true;
  document.querySelectorAll('[data-experiment]').forEach(node=>node.setAttribute('aria-current',String(node.dataset.experiment===id)));
  document.querySelectorAll('[data-scene]').forEach(node=>node.setAttribute('aria-current',String(node.dataset.scene===id)));
  const rail=$('scene-rail'),activeChip=rail.querySelector('[aria-current="true"]');
  if(activeChip)rail.scrollLeft=activeChip.offsetLeft-(rail.clientWidth-activeChip.clientWidth)/2;
  $('scene-presets').hidden=true;
  $('experiment-title').textContent=catalog.find(item=>item.id===id).title;document.title=`${catalog.find(item=>item.id===id).title} · FORMA 数学实验室`;
  try{
    const module=await loadExperiment(id);if(version!==epoch)return;
    definition=module.definition;
    if(orbit)orbit.primaryAction=definition.interaction==='field'?'field':'orbit';
    document.querySelector('.interaction-hint').textContent=definition.interaction==='field'
      ?'移动／按住扰动 · Shift 拖动旋转 · 双指／滚轮缩放':'⤧ 拖动旋转 · 滚轮缩放';
    const saved=savedStates.get(id);params=validateParameters(definition.parameters||[],saved?.params||{});seed=saved?.seed??42;$('seed').value=seed;
    renderDefinition();
    enableExperimentControls(false);
    if(!renderer){$('loading').hidden=true;$('error').hidden=false;return;}
    quality=selectedQuality();glow.enabled=quality==='high';resize();
    const nextScene=new THREE.Scene();scene=nextScene;
    sceneAbort=new AbortController();
    scene.add(new THREE.HemisphereLight(0xb6d9cd,0x182322,2));
    const light=new THREE.DirectionalLight(0xffebc5,3);light.position.set(5,9,4);scene.add(light);
    orbit.set([9,6,11],[0,0,0]);
    const next=await module.createExperiment({scene:nextScene,camera,quality,seed,params:{...params},
      signal:sceneAbort.signal,
      onError:error=>{if(version===epoch)reportError(error,'async');},
      onMetrics:values=>{if(version===epoch)displayMetrics(values);},
      setCamera:(position,target,options)=>{if(version===epoch)setCamera(position,target,options);}
    });
    if(version!==epoch){next?.dispose();disposeGroup(nextScene);return;}
    current=next;current.update(0,0);dirty=true;$('loading').hidden=true;enableExperimentControls(true);saveState();
  }catch(error){if(version===epoch)reportError(error,'load');}
  finally{if(version===epoch)window.__FORMA_BOOT__?.ready();}
}

function updatePlayback(){
  $('play-button').textContent=clock.paused?'▶':'Ⅱ';$('play-button').setAttribute('aria-label',clock.paused?'播放':'暂停');
  $('status-text').textContent=clock.paused?'已暂停':'运行中';$('status-dot').style.opacity=clock.paused?'.35':'1';
}
function reset(){try{clock.reset();current?.reset(seed);dirty=true;}catch(error){reportError(error,'reset');}}
function closeDrawers(){document.querySelectorAll('.library,.inspector').forEach(node=>node.classList.remove('open'));$('drawer-backdrop').hidden=true;}
function openDrawer(id){closeDrawers();$(id).classList.add('open');$('drawer-backdrop').hidden=false;}
function showTab(name){for(const tab of ['parameters','theory']){$(`${tab}-panel`).hidden=tab!==name;$(`${tab}-tab`).setAttribute('aria-selected',String(tab===name));}}
function toggleView(){
  const immersive=document.body.classList.toggle('immersive');closeDrawers();
  $('view-mode').textContent=immersive?'进入实验台 ↗':'沉浸观赏 ⤢';$('view-mode').setAttribute('aria-pressed',String(immersive));
  requestAnimationFrame(resize);
}

function draw(){renderer.info.reset();glow.render(scene,camera);}

function bindControls(){
  listen(window,'hashchange',()=>selectExperiment(location.hash.slice(1)));
  listen($('view-mode'),'click',toggleView);
  $('camera-motion').setAttribute('aria-pressed',String(cameraMotion.enabled));
  listen($('camera-motion'),'click',()=>{cameraMotion.enabled=!cameraMotion.enabled;$('camera-motion').setAttribute('aria-pressed',String(cameraMotion.enabled));});
  listen($('play-button'),'click',()=>{clock.paused=!clock.paused;updatePlayback();});
  listen($('reset-button'),'click',reset);
  listen($('camera-reset'),'click',()=>{if(orbit)setCamera(cameraPreset.position,cameraPreset.target,cameraPreset);});
  listen($('defaults-button'),'click',()=>{savedStates.delete(currentId);params={};seed=42;definition=null;selectExperiment(currentId,true);toast('已恢复默认参数和随机种子');});
  listen($('seed'),'change',()=>{const value=Number($('seed').value);if(!Number.isInteger(value)||value<0||value>4294967295){$('seed').value=seed;toast('随机种子应为 0 到 4294967295 的整数');return;}seed=value;saveState();reset();});
  listen($('quality'),'change',()=>selectExperiment(currentId,true));
  listen($('retry-button'),'click',()=>{if(!renderer)location.reload();else selectExperiment(currentId,true);});
  listen($('parameters-tab'),'click',()=>showTab('parameters'));listen($('theory-tab'),'click',()=>showTab('theory'));listen($('read-theory'),'click',()=>{showTab('theory');document.querySelector('.inspector-scroll').scrollTop=0;});
  listen($('mobile-library'),'click',()=>openDrawer('library'));listen($('mobile-controls'),'click',()=>openDrawer('inspector'));listen($('drawer-backdrop'),'click',closeDrawers);
  document.querySelectorAll('[data-close]').forEach(button=>listen(button,'click',closeDrawers));
  listen($('about-button'),'click',()=>$('about').showModal());listen($('about-close'),'click',()=>$('about').close());
  listen($('export-button'),'click',()=>{
    if(!renderer||!scene||!current){toast('请先等待实验加载完成');return;}
    try{draw();renderer.domElement.toBlob(blob=>{if(!blob){toast('导出未完成，请重试');return;}const url=URL.createObjectURL(blob);const link=element('a');link.href=url;link.download=`forma-${currentId}-seed-${seed}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出当前三维画面 PNG');},'image/png');}catch(error){reportError(error,'export');}
  });
  listen(document,'visibilitychange',()=>{clock.visible=!document.hidden;previousTime=performance.now();fpsStart=previousTime;fpsFrames=0;});
  listen(document,'keydown',event=>{
    if(event.key==='Escape')closeDrawers();
    if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target.tagName)||$('about').open)return;
    if(event.code==='Space'){event.preventDefault();clock.paused=!clock.paused;updatePlayback();}
    if(event.key.toLowerCase()==='r')reset();
    if(/^[1-9]$/.test(event.key))location.hash=catalog[Number(event.key)-1].id;
    if(event.key==='0')location.hash=catalog[9].id;
    if(event.key.toLowerCase()==='f')toggleView();
  });
}

function frame(now){
  frameId=requestAnimationFrame(frame);
  const elapsed=(now-previousTime)/1000;previousTime=now;
  if(!clock.visible)return;
  if(current&&renderer&&scene){
    try{const dt=clock.tick(elapsed);if(dt>0||dirty){current.update(dt,clock.time);dirty=false;}
      const turn=cameraMotion.step(elapsed,!clock.paused,orbit.pointers.size>0);if(turn){orbit.spherical.theta+=turn;orbit.apply();}draw();}
    catch(error){current=null;reportError(error,'frame');}
    fpsFrames++;if(now-fpsStart>1000){fps=Math.round(fpsFrames*1000/(now-fpsStart));$('fps').textContent=`${fps} FPS`;fpsStart=now;fpsFrames=0;}
  }
  const minutes=String(Math.floor(clock.time/60)).padStart(2,'0'),seconds=(clock.time%60).toFixed(2).padStart(5,'0');$('time').textContent=`${minutes}:${seconds}`;$('time-progress').style.width=`${clock.time%60/60*100}%`;
}

renderCatalog();bindControls();setupRenderer();updatePlayback();selectExperiment(location.hash.slice(1)||'navier');frameId=requestAnimationFrame(frame);
Object.defineProperty(window,'__FORMA__',{value:Object.freeze({get diagnostics(){return {id:currentId,ready:!!current,time:clock.time,paused:clock.paused,seed,params:{...params},quality,fps,camera:camera?{position:camera.position.toArray(),target:orbit.target.toArray()}:null,immersive:document.body.classList.contains('immersive'),cameraMotion:cameraMotion.enabled,metrics:{...metricValues},error:lastError,renderer:renderer?{geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls,points:renderer.info.render.points,triangles:renderer.info.render.triangles}:null};}})});
listen(window,'pagehide',()=>{cancelAnimationFrame(frameId);clearTimeout(toastTimer);cleanupCallbacks.forEach(cleanup=>cleanup());resizeObserver?.disconnect();orbit?.dispose();cleanScene();glow?.dispose();renderer?.dispose();});
