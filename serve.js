import {createServer} from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT || 4174);
if(!Number.isInteger(port)||port<1024||port>65535) throw new RangeError('PORT must be 1024–65535');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid URL');return;}
    let file=resolve(root,`.${pathname}`);
    if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    file=await realpath(file);
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch(error){
    if(['ENOENT','ENOTDIR'].includes(error.code)){res.writeHead(404);res.end('Not found');return;}
    const traceId=randomUUID();console.error(`[${traceId}]`,error);res.writeHead(500);res.end(`Unable to serve file. Trace ID: ${traceId}`);
  }
});
server.on('error',error=>{console.error('[math-lab-server]',error);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`FORMA 数学实验室 · http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
