import http from 'node:http';
import path from 'node:path';
import {openDatabase} from '../server/sqlite-adapter.mjs';
import {createAssets} from '../server/assets.mjs';
import worker from '../server/worker.js';
const DB=openDatabase(path.resolve(process.env.MELLOW_KEYS_DATA_DIR||'.local-data','studio.db'),path.resolve('drizzle'));
const ASSETS=createAssets(path.resolve('dist/client'));
const server=http.createServer(async(req,res)=>{
 try{
  const host='127.0.0.1:'+server.address().port;
  if(req.headers.host!==host){res.writeHead(403);res.end('Forbidden');return;}
  const origin=req.headers.origin;
  if(origin&&origin!=='http://'+host){res.writeHead(403);res.end('Forbidden');return;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>900000){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}
  const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-studio-owner');
  const request=new Request('http://'+host+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const result=await worker.fetch(request,{DB,ASSETS});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch(error){console.error(error.message);res.writeHead(500);res.end('Preview error');}
}).listen(0,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+server.address().port));
process.on('SIGINT',()=>server.close(()=>{DB.close();process.exit(0);}));
