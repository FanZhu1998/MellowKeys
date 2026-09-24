import test from 'node:test';
import assert from 'node:assert/strict';
import {Library,mergeWorkspaces} from '../public/storage.js';
import {emptyWorkspace,snapshot} from '../public/model.js';
const phrase=()=>snapshot({tonic:0,mode:'major',mood:'brake',color:1,tempo:80,pattern:'block',ids:['line7','lineMaj','lineSus','brake']},'Idea');
test('three-way recovery preserves remote and local changes without resurrecting unchanged deletions',()=>{
 const base=emptyWorkspace();base.scores=[{id:'song',name:'Song',sections:[phrase()]}];base.activeScoreId='song';
 const local=structuredClone(base),remote=structuredClone(base);local.scores[0].name='Local title';remote.scores[0].name='Other tab title';
 const merged=mergeWorkspaces(base,local,remote);assert.equal(merged.scores.length,2);assert.equal(merged.scores[0].name,'Other tab title');assert.match(merged.scores[1].name,/Local title.*recovered/);assert.equal(merged.activeScoreId,merged.scores[1].id);
 remote.scores=[];remote.activeScoreId=null;assert.equal(mergeWorkspaces(base,base,remote).scores.length,0);assert.equal(mergeWorkspaces(base,local,remote).scores.length,1);
 const addition=phrase();local.favorites=[addition];remote.favorites=[phrase()];assert.equal(mergeWorkspaces(base,local,remote).favorites.length,2);
});
test('stale tab and lost PUT response recover without repeated conflicts or duplicate content',async()=>{
 const original=globalThis.fetch;let data=emptyWorkspace(),revision=0,drop=false,puts=0;
 globalThis.fetch=async(url,options={})=>{if(!options.method)return Response.json({data:structuredClone(data),revision});puts++;const sent=JSON.parse(options.body);if(sent.revision!==revision)return Response.json({error:'Another session saved changes'},{status:409});data=sent.data;revision++;if(drop){drop=false;throw Error('Connection interrupted');}return Response.json({revision});};
 try{
  const a=new Library(()=>{}),b=new Library(()=>{});await a.load();await b.load();
  a.data.favorites.push(phrase());a.dirty++;await a.save();
  b.data.favorites.push(phrase());b.dirty++;await b.save();assert.equal(data.favorites.length,2);assert.equal(b.persisted,b.dirty);assert.equal(b.error,'');
  b.data.scores=[{id:'score',name:'Song',sections:[phrase()]}];b.data.activeScoreId='score';b.dirty++;drop=true;await b.save();assert.equal(b.error,'Connection interrupted');await b.save();
  assert.equal(data.scores.length,1);assert.equal(data.favorites.length,2);assert.equal(b.persisted,b.dirty);assert.equal(b.error,'');assert.ok(puts<8);
 }finally{globalThis.fetch=original;}
});
