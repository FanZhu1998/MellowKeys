import {validateWorkspace,emptyWorkspace} from '../public/model.js';
import {securityHeaders} from './security.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function database(env){if(!env.DB)throw Error('Database binding unavailable');return env.DB;}
export default {async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/')){const asset=await env.ASSETS.fetch(request),response=new Response(asset.body,asset);for(const [name,value] of Object.entries(securityHeaders))response.headers.set(name,value);return response;}
 if(url.pathname!=='/api/workspace')return json({error:'Not found'},404);
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return json({error:'Sign in to save your music.'},401);
 try{
  const db=database(env);
  if(request.method==='GET'){const row=await db.prepare('SELECT payload, revision FROM studio_workspaces WHERE user_id = ?').bind(owner).first();return json(row?{data:JSON.parse(row.payload),revision:row.revision}:{data:emptyWorkspace(),revision:0});}
  if(request.method!=='PUT')return json({error:'Method not allowed'},405);
  const origin=request.headers.get('origin');if(origin&&origin!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Cross-site writes are not allowed.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required'},415);
  if(Number(request.headers.get('content-length'))>900000)return json({error:'Your score collection is too large.'},413);
  const text=await request.text();if(text.length>900000)return json({error:'Your score collection is too large.'},413);
  let body;try{body=JSON.parse(text);if(!Number.isInteger(body.revision)||body.revision<0)throw Error('Invalid revision');validateWorkspace(body.data);}catch(error){return json({error:error.message||'Invalid score data'},400);}
  const payload=JSON.stringify(body.data),now=new Date().toISOString(),revision=body.revision;
  const result=revision===0?await db.prepare('INSERT INTO studio_workspaces (user_id, payload, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING').bind(owner,payload,now).run():await db.prepare('UPDATE studio_workspaces SET payload = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(payload,now,owner,revision).run();
  if(!result.meta.changes)return json({error:'This collection changed in another session. Reload saved changes before saving again.'},409);
  return json({revision:revision+1,savedAt:now});
 }catch(error){console.error('Workspace storage failed',error.message);return json({error:'Saving is temporarily unavailable. Your current work is still here; please retry.'},503);}
}};
