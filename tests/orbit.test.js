import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {OrbitController} from '../src/core/orbit.js';

class CanvasStub extends EventTarget {
  captures = new Set();
  setPointerCapture(id) { this.captures.add(id); }
}

function setup() {
  const camera = new THREE.PerspectiveCamera();
  const element = new CanvasStub();
  const clicks = [];
  const orbit = new OrbitController(camera, element, event => clicks.push(event.pointerId));
  const emit = (type, values = {}) => {
    const event = new Event(type, {cancelable:true});
    Object.assign(event, {pointerId:1, clientX:100, clientY:100, button:0, buttons:1, shiftKey:false, ...values});
    element.dispatchEvent(event);
    return event;
  };
  return {camera, element, orbit, clicks, emit};
}

test('ordinary scenes retain primary drag orbit and bounded wheel zoom', () => {
  const {camera, orbit, emit} = setup();
  const initial = camera.position.toArray();
  emit('pointerdown');
  emit('pointermove', {clientX:180, clientY:130});
  emit('pointerup', {clientX:180, clientY:130});
  assert.notDeepEqual(camera.position.toArray(), initial);
  assert.equal(orbit.pointers.size, 0);
  assert(emit('wheel', {deltaY:1e6}).defaultPrevented);
  assert.equal(orbit.spherical.radius, 150);
  emit('wheel', {deltaY:-1e6});
  assert.equal(orbit.spherical.radius, 1);
  orbit.dispose();
});

test('field scenes keep single primary drags in the simulation and retain taps', () => {
  const {camera, orbit, clicks, emit} = setup();
  orbit.primaryAction = 'field';
  const initial = camera.position.toArray();
  emit('pointerdown');
  emit('pointermove', {clientX:240, clientY:170});
  emit('pointerup', {clientX:240, clientY:170});
  assert.deepEqual(camera.position.toArray(), initial);
  assert.deepEqual(clicks, []);
  emit('pointerdown', {pointerId:2});
  emit('pointerup', {pointerId:2, clientX:102});
  assert.deepEqual(clicks, [2]);
  orbit.dispose();
});

test('field scenes allow Shift or secondary-button orbit', () => {
  for (const modifiers of [{shiftKey:true}, {button:2, buttons:2}]) {
    const {camera, orbit, emit} = setup();
    orbit.primaryAction = 'field';
    const initial = camera.position.toArray();
    emit('pointerdown', modifiers);
    emit('pointermove', {...modifiers, clientX:155, clientY:120});
    emit('pointerup', {...modifiers, clientX:155, clientY:120});
    assert.notDeepEqual(camera.position.toArray(), initial);
    orbit.dispose();
  }
});

test('two-finger pinch zoom remains available in field scenes', () => {
  const {orbit, emit} = setup();
  orbit.primaryAction = 'field';
  const initialRadius = orbit.spherical.radius;
  emit('pointerdown', {pointerId:1, pointerType:'touch', clientX:100});
  emit('pointerdown', {pointerId:2, pointerType:'touch', clientX:200});
  emit('pointermove', {pointerId:2, pointerType:'touch', clientX:250});
  assert(Math.abs(orbit.spherical.radius - initialRadius * 2 / 3) < 1e-12);
  emit('pointercancel', {pointerId:1});
  emit('pointerup', {pointerId:2, clientX:250});
  assert.equal(orbit.pointers.size, 0);
  orbit.dispose();
});

test('disposing orbit removes listeners and clears active pointers', () => {
  const {camera, orbit, emit} = setup();
  emit('pointerdown');
  const initial = camera.position.toArray();
  orbit.dispose();
  assert.equal(orbit.pointers.size, 0);
  emit('pointerdown', {pointerId:3});
  emit('pointermove', {pointerId:3, clientX:300});
  assert.deepEqual(camera.position.toArray(), initial);
  assert.equal(orbit.pointers.size, 0);
});
