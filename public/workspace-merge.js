import {validateWorkspace} from './model.js';
const clone=value=>structuredClone(value),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeWorkspaces(base,local,remote){
 const merged=clone(remote),redirect=new Map();
 for(const type of ['favorites','scores']){
  const before=new Map(base[type].map(x=>[x.id,x])),here=new Map(local[type].map(x=>[x.id,x]));
  for(const [id,old] of before)if(!here.has(id)){const i=merged[type].findIndex(x=>x.id===id);if(i>=0&&same(merged[type][i],old))merged[type].splice(i,1);}
  for(const item of local[type]){
   const old=before.get(item.id);if(same(item,old))continue;
   const index=merged[type].findIndex(x=>x.id===item.id),there=merged[type][index];
   if(same(item,there))continue;
   if(same(there,old)){if(index<0)merged[type].push(clone(item));else merged[type][index]=clone(item);}
   else{const recovered={...clone(item),id:crypto.randomUUID(),name:item.name.slice(0,68)+' · recovered'};merged[type].push(recovered);if(type==='scores')redirect.set(item.id,recovered.id);}
  }
 }
 const desired=redirect.get(local.activeScoreId)||local.activeScoreId;
 if(merged.scores.some(x=>x.id===desired))merged.activeScoreId=desired;
 else if(!merged.scores.some(x=>x.id===merged.activeScoreId))merged.activeScoreId=merged.scores[0]?.id||null;
 validateWorkspace(merged);return merged;
}
