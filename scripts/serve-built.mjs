import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist');
const prefix='/GAS/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
    const relative=decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const file=resolve(root,relative);
    if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream'});
    res.end(await readFile(file));
  } catch {res.writeHead(404).end();}
}).listen(5173,'127.0.0.1',()=>console.log('Production preview: http://127.0.0.1:5173/GAS/'));
