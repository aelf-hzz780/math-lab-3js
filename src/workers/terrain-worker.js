import {generateTerrainChunk} from '../math/iridescent-terrain.js';

self.addEventListener('message', event => {
  const {id, options} = event.data;
  try {
    const result=generateTerrainChunk(options);
    self.postMessage({id, ok:true, result}, [result.positions.buffer, result.normals.buffer, result.indices.buffer, result.occlusion.buffer]);
  } catch (error) {
    self.postMessage({id, ok:false, error:{name:error.name, message:error.message}});
  }
});
