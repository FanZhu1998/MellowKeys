import fs from 'node:fs/promises';
import path from 'node:path';
import {CSP} from './security.js';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mp3':'audio/mpeg','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
export function createAssets(directory,{desktop=false}={}) {
  const root=path.resolve(directory);
  return {async fetch(request){
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    try{
      const pathname=decodeURIComponent(new URL(request.url).pathname),relative=pathname==='/'?'index.html':pathname.slice(1);
      if(relative.split(/[\\/]/).some(segment=>segment.startsWith('.')))return new Response('Not found',{status:404});
      const filename=path.resolve(root,relative);
      if(!filename.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
      let content=await fs.readFile(filename);
      if(desktop&&relative==='index.html')content=Buffer.from(content.toString().replace('<head>','<head><meta name="mellow-runtime" content="desktop">'));
      return new Response(request.method==='HEAD'?null:content,{headers:{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
    }catch{return new Response('Not found',{status:404});}
  }};
}
