/* Classic-script startup guard: it also runs when a file:// bundle cannot load. */
(() => {
  'use strict';
  let state = 'loading';
  let timer;
  const get = id => document.getElementById(id);
  const traceId = () => `forma-boot-${globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10)}`;
  function detach() {
    clearTimeout(timer);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  }
  function fail(error) {
    if (state !== 'loading') return;
    state = 'failed';
    detach();
    const id = traceId();
    const message = typeof error === 'string' ? error : error?.message || '浏览器未能完成启动。';
    console.error(`[${id}]`, error);
    if (get('loading')) get('loading').hidden = true;
    if (get('error-message')) get('error-message').textContent = `${message} · 参考编号 ${id}`;
    if (get('error')) get('error').hidden = false;
    if (get('status-text')) get('status-text').textContent = '启动未完成';
    const retry = get('retry-button');
    retry?.addEventListener('click', event => {
      event.stopImmediatePropagation();
      window.location.reload();
    }, {capture:true, once:true});
  }
  function ready() {
    if (state !== 'loading') return;
    state = 'ready';
    detach();
  }
  function onError(event) {
    // Only uncaught script failures arrive here; scene errors are handled by the app.
    fail(event.error || event.message || '离线脚本未能加载，请重新打开完整的 math-lab 文件夹。');
  }
  function onRejection(event) { fail(event.reason); }
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  timer = setTimeout(() => fail('启动超时。请确认 dist/app.js 文件完整，然后点击重新加载。'), 20000);
  window.__FORMA_BOOT__ = Object.freeze({ready, fail, get state() { return state; }});
})();
