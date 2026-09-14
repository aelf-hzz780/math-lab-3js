import {generateTerrainChunk} from '../math/iridescent-terrain.js';

// The offline build replaces this constant with an independently bundled worker.
const embeddedWorkerSource = typeof __TERRAIN_WORKER_SOURCE__ === 'undefined' ? null : __TERRAIN_WORKER_SOURCE__;

function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
}

function finite(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be finite in [${min}, ${max}]`);
}

/** Fixed-size world-coordinate corridor; negative z is the direction of travel. */
export function desiredTerrainChunks(distance, {size=24, columns=3, ahead=3, behind=1} = {}) {
  finite(distance, 'distance', 0, Number.MAX_SAFE_INTEGER);
  finite(size, 'size', 2, 128);
  integer(columns, 'columns', 1, 9);
  if (columns % 2 !== 1) throw new RangeError('columns must be odd');
  integer(ahead, 'ahead', 0, 8);
  integer(behind, 'behind', 0, 8);
  const anchor = -Math.floor(distance / size);
  integer(anchor, 'terrain anchor', -1000000 + ahead, 0);
  const half = Math.floor(columns / 2), chunks = [];
  for (let iz=anchor-ahead; iz<=anchor+behind; iz++) {
    for (let ix=-half; ix<=half; ix++) chunks.push({key:`${ix}:${iz}`, ix, iz});
  }
  return chunks;
}

function validateRequest(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('terrain options must be an object');
  const request = {size:24, height:20, seed:42, layers:1, holes:1, resolution:40, ...options};
  integer(request.ix, 'ix', -1000000, 1000000);
  integer(request.iz, 'iz', -1000000, 1000000);
  integer(request.seed, 'seed', 0, 0xffffffff);
  integer(request.resolution, 'resolution', 8, 64);
  finite(request.layers, 'layers', .25, 3);
  finite(request.holes, 'holes', .25, 4);
  finite(request.size, 'size', 2, 128);
  finite(request.height, 'height', 2, 128);
  return request;
}

function abortError() {
  const error = new Error('Terrain generator disposed');
  error.name = 'AbortError';
  return error;
}

function remoteError(payload) {
  const error = new Error(payload?.message || 'Terrain worker failed');
  error.name = payload?.name || 'Error';
  return error;
}

function validMesh(result) {
  return result?.positions instanceof Float32Array && result.normals instanceof Float32Array &&
    result.indices instanceof Uint32Array && result.positions.length % 3 === 0 &&
    result.normals.length === result.positions.length && result.indices.length % 3 === 0 &&
    (result.occlusion === undefined || (result.occlusion instanceof Float32Array && result.occlusion.length === result.positions.length / 3));
}

/** A bounded job service. The main-thread fallback yields once before each chunk. */
export function createTerrainGenerator({
  workerSource=embeddedWorkerSource, WorkerClass=globalThis.Worker, URLApi=globalThis.URL,
  BlobClass=globalThis.Blob, generateChunk=generateTerrainChunk,
  schedule=callback=>setTimeout(callback, 0), cancelSchedule=clearTimeout,
  onStatus=()=>{}, maxPending=2,
} = {}) {
  integer(maxPending, 'maxPending', 1, 8);
  for (const [name, value] of Object.entries({generateChunk, schedule, cancelSchedule, onStatus})) {
    if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
  }
  let worker=null, workerURL=null, disposed=false, failure=null, nextID=0;
  let status;
  const pending = new Map();

  function publish(backend, reason, state='ready') {
    status=Object.freeze({backend, reason, state});
    onStatus(status);
  }

  function releaseWorker() {
    if (worker) {
      worker.removeEventListener('message', receive);
      worker.removeEventListener('error', workerError);
      worker.removeEventListener('messageerror', decodeError);
      worker.terminate();
      worker=null;
    }
    if (workerURL) {
      URLApi.revokeObjectURL(workerURL);
      workerURL=null;
    }
  }

  function rejectPending(error) {
    for (const job of pending.values()) {
      if (job.timer !== undefined) cancelSchedule(job.timer);
      job.reject(error);
    }
    pending.clear();
  }

  function fail(error) {
    if (disposed || failure) return;
    failure=error;
    releaseWorker();
    rejectPending(error);
    publish(status.backend, error.message, 'failed');
  }

  function receive(event) {
    if (disposed || failure) return;
    const message=event.data, job=pending.get(message?.id);
    if (!job) return;
    if (message.ok === false) {
      pending.delete(message.id);
      job.reject(remoteError(message.error));
      return;
    }
    if (message.ok !== true || !validMesh(message.result)) {
      fail(new Error('Terrain worker returned an invalid mesh payload'));
      return;
    }
    pending.delete(message.id);
    job.resolve(message.result);
  }

  function workerError(event) {
    fail(new Error(event.message || 'Terrain worker runtime error'));
  }

  function decodeError() {
    fail(new Error('Terrain worker message could not be decoded'));
  }

  let fallbackReason='worker-unavailable';
  if (typeof WorkerClass === 'function') {
    fallbackReason='embedded-worker-source-unavailable';
    if (typeof workerSource === 'string' && workerSource.length) {
      try {
        workerURL=URLApi.createObjectURL(new BlobClass([workerSource], {type:'text/javascript'}));
        worker=new WorkerClass(workerURL);
        worker.addEventListener('message', receive);
        worker.addEventListener('error', workerError);
        worker.addEventListener('messageerror', decodeError);
      } catch (error) {
        releaseWorker();
        fallbackReason=`worker-init-failed: ${error.message}`;
        console.warn(`[terrain] Falling back to scheduled main-thread generation: ${fallbackReason}`);
      }
    }
  }
  publish(worker ? 'worker' : 'main-thread', worker ? null : fallbackReason);

  return {
    get backend() { return status.backend; },
    get status() { return status; },
    get pendingCount() { return pending.size; },

    generate(options) {
      if (disposed) return Promise.reject(abortError());
      if (failure) return Promise.reject(failure);
      let request;
      try { request=validateRequest(options); }
      catch (error) { return Promise.reject(error); }
      if (pending.size >= maxPending) return Promise.reject(new RangeError('Terrain generation queue is full'));
      return new Promise((resolve, reject) => {
        const id=++nextID, job={resolve, reject};
        pending.set(id, job);
        if (worker) {
          try { worker.postMessage({id, options:request}); }
          catch (error) { fail(error); }
          return;
        }
        try {
          job.timer=schedule(() => {
            if (disposed || !pending.has(id)) return;
            pending.delete(id);
            try {
              const result=generateChunk(request);
              if (!validMesh(result)) throw new Error('Terrain generator returned an invalid mesh payload');
              resolve(result);
            } catch (error) { reject(error); }
          });
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      });
    },

    dispose() {
      if (disposed) return;
      disposed=true;
      releaseWorker();
      rejectPending(abortError());
    },
  };
}
