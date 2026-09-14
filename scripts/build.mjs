import {build, version} from 'esbuild';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, basename} from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const workerResult = await build({
  absWorkingDir:root,
  entryPoints:['src/workers/terrain-worker.js'],
  bundle:true,
  format:'iife',
  platform:'browser',
  target:['chrome100', 'safari15.4', 'firefox100'],
  minify:true,
  legalComments:'eof',
  metafile:true,
  write:false,
});
if (Object.values(workerResult.metafile.outputs).some(output=>output.imports.length)) {
  throw new Error('Terrain worker contains runtime imports');
}
const workerSource=workerResult.outputFiles[0].text;
const result = await build({
  absWorkingDir:root,
  entryPoints:['src/app.js'],
  outfile:'dist/app.js',
  bundle:true,
  format:'iife',
  platform:'browser',
  target:['chrome100', 'safari15.4', 'firefox100'],
  minify:true,
  legalComments:'eof',
  metafile:true,
  write:false,
  define:{__TERRAIN_WORKER_SOURCE__:JSON.stringify(workerSource)},
});

const dependencies = Object.keys(result.metafile.inputs).sort();
const externalImports = Object.values(result.metafile.outputs).flatMap(output => output.imports);
if (externalImports.length) throw new Error(`Offline build contains runtime imports: ${JSON.stringify(externalImports)}`);
for (const dataPath of ['data/kissing.json', 'data/maxcut.json', 'data/noperthedron.json']) {
  if (!dependencies.includes(dataPath)) throw new Error(`Offline build omitted ${dataPath}`);
}
const experiments = dependencies.filter(path => /^src\/experiments\/[^/]+\.js$/.test(path)).map(path => basename(path, '.js'));
const {catalog} = await import('../src/catalog.js');
for (const {id} of catalog) {
  if (!experiments.includes(id)) throw new Error(`Offline build omitted experiment ${id}`);
}
await mkdir(resolve(root, 'dist'), {recursive:true});
for (const output of result.outputFiles) await writeFile(output.path, output.contents);
const script = await readFile(resolve(root, 'dist/app.js'));
const manifest = {
  format:'classic-iife',
  bundler:`esbuild ${version}`,
  bytes:script.length,
  sha256:createHash('sha256').update(script).digest('hex'),
  experiments,
  embeddedData:dependencies.filter(path=>path.startsWith('data/')&&path.endsWith('.json')),
  terrainWorker:{
    format:'inline-blob-iife',
    bytes:Buffer.byteLength(workerSource),
    sha256:createHash('sha256').update(workerSource).digest('hex'),
    runtimeNetworkDependencies:[],
  },
  runtimeNetworkDependencies:[],
};
await writeFile(resolve(root, 'dist/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Offline bundle: ${experiments.length} experiments, ${(script.length / 1024).toFixed(0)} KiB, SHA-256 ${manifest.sha256}`);
