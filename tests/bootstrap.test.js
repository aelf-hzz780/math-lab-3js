import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');
function startup() {
  const listeners = new Map(), timers = new Map(), errors = [], nodes = new Map();
  let reloaded = 0;
  for (const id of ['loading', 'error', 'error-message', 'status-text', 'retry-button']) {
    nodes.set(id, {hidden:id === 'error', textContent:'', addEventListener(type, fn) { this[type] = fn; }});
  }
  const context = {
    console:{error:(...args) => errors.push(args)},
    document:{getElementById:id => nodes.get(id)},
    setTimeout:fn => { timers.set(1, fn); return 1; },
    clearTimeout:id => timers.delete(id),
    location:{reload:() => reloaded++},
    addEventListener:(type, fn) => listeners.set(type, fn),
    removeEventListener:(type, fn) => { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return {boot:context.__FORMA_BOOT__, listeners, timers, nodes, errors, get reloaded() { return reloaded; }};
}

test('successful startup cancels watchdog and hands error handling to the application', () => {
  const app = startup();
  assert.equal(app.boot.state, 'loading');
  app.boot.ready();
  assert.equal(app.boot.state, 'ready');
  assert.equal(app.timers.size, 0);
  assert.equal(app.listeners.size, 0);
  app.boot.fail('late error');
  assert.equal(app.nodes.get('error').hidden, true);
});

test('script failure gives a retry and trace reference even without Web Crypto', () => {
  const app = startup();
  app.listeners.get('error')({message:'SyntaxError: broken bundle'});
  assert.equal(app.boot.state, 'failed');
  assert.equal(app.nodes.get('loading').hidden, true);
  assert.equal(app.nodes.get('error').hidden, false);
  assert.match(app.nodes.get('error-message').textContent, /SyntaxError: broken bundle.*forma-boot-/);
  assert.equal(app.errors.length, 1);
  assert.equal(app.timers.size, 0);
  let stopped = false;
  app.nodes.get('retry-button').click({stopImmediatePropagation() { stopped = true; }});
  assert.equal(stopped, true);
  assert.equal(app.reloaded, 1);
});

test('startup promise rejection replaces the permanent spinner', () => {
  const app = startup();
  app.listeners.get('unhandledrejection')({reason:new Error('Scene import unavailable')});
  assert.match(app.nodes.get('error-message').textContent, /Scene import unavailable/);
  assert.equal(app.nodes.get('loading').hidden, true);
  app.boot.fail('duplicate failure');
  assert.equal(app.errors.length, 1);
});

test('watchdog reports a missing offline bundle and can be cancelled on normal completion', () => {
  const app = startup();
  app.timers.get(1)();
  assert.match(app.nodes.get('error-message').textContent, /启动超时.*dist\/app\.js/);
  assert.equal(app.nodes.get('loading').hidden, true);
  assert.equal(app.boot.state, 'failed');
});
