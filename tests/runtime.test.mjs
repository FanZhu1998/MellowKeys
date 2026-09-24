import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createWorkspaceTransport} from '../public/workspace-transport.js';
import {emptyWorkspace,validateWorkspace,snapshot} from '../public/model.js';
import {openDatabase} from '../server/sqlite-adapter.mjs';
import {createAssets} from '../server/assets.mjs';
import {isAppURL,isExternalURL} from '../desktop/security.mjs';
import worker from '../server/worker.js';

test('hanging requests time out and a later retry can complete',async()=>{
 let hang=true;
 const transport=createWorkspaceTransport({timeoutMs:15,request:(url,{signal})=>hang?new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))):Promise.resolve(Response.json({revision:0,data:emptyWorkspace()}))});
 await assert.rejects(transport.load(),/timed out/);hang=false;assert.equal((await transport.load()).revision,0);
});
test('unsafe IDs and future workspace versions cannot reach saved HTML',()=>{
 const data=emptyWorkspace(),phrase=snapshot({tonic:0,mode:'major',mood:'brake',color:1,tempo:80,pattern:'block',ids:['brake']},'Safe');data.favorites=[phrase];
 phrase.id='bad" onclick="alert(1)';assert.throws(()=>validateWorkspace(data),/ID/);
 assert.throws(()=>validateWorkspace({...emptyWorkspace(),schemaVersion:99}),/app version/);
 assert.doesNotThrow(()=>validateWorkspace({favorites:[],scores:[],activeScoreId:null}));
});
test('desktop data persists across process-style reopening and migration application is idempotent',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mellow-keys-test-')),filename=path.join(directory,'library.sqlite');let DB;
 try{
  DB=openDatabase(filename,path.resolve('drizzle'));
  const request=(method,body)=>new Request('https://desktop.mellow.local/api/workspace',{method,headers:{'oai-authenticated-user-id':'desktop-owner','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=emptyWorkspace();data.scores=[{id:'score-1',name:'Saved after restart',sections:[]}];data.activeScoreId='score-1';
  assert.equal((await worker.fetch(request('PUT',{revision:0,data}),{DB})).status,200);DB.close();DB=openDatabase(filename,path.resolve('drizzle'));
  const saved=await(await worker.fetch(request('GET'),{DB})).json();assert.equal(saved.data.scores[0].name,'Saved after restart');assert.equal(saved.revision,1);
 }finally{DB?.close();await fs.rm(directory,{recursive:true,force:true});}
});
test('asset server confines paths and desktop links deny unexpected destinations',async()=>{
 const assets=createAssets(path.resolve('public'),{desktop:true});
 const html=await assets.fetch(new Request('mellow://app/index.html'));assert.equal(html.status,200);assert.match(await html.text(),/name="mellow-runtime" content="desktop"/);assert.match(html.headers.get('Content-Security-Policy'),/script-src 'self'/);
 assert.equal((await assets.fetch(new Request('mellow://app/%2e%2e%5cpackage.json'))).status,404);
 assert.equal((await assets.fetch(new Request('mellow://app/.env'))).status,404);
 for(const url of ['https://evil.example','mellow://evil/index.html','mellow://user@app/index.html','file:///secret'])assert.equal(isAppURL(url),false);
 assert.equal(isAppURL('mellow://app/index.html'),true);assert.equal(isExternalURL('https://www.youtube.com/watch?v=example'),true);assert.equal(isExternalURL('https://www.youtube.com.evil.example/'),false);assert.equal(isExternalURL('file:///secret'),false);
});
