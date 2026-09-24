import {MOODS,chord,realize} from './harmony-v2.js';
import {WORKSPACE_SCHEMA_VERSION} from './schema.js';
export const PATTERNS=[{id:'block',name:'Soft chords'},{id:'broken',name:'Broken · rising'},{id:'arp',name:'Flowing arpeggio'},{id:'roll',name:'Rolled chords'},{id:'pulse',name:'Pop pulse'}];
export const emptyWorkspace=()=>({schemaVersion:WORKSPACE_SCHEMA_VERSION,favorites:[],scores:[],activeScoreId:null});
const str=(v,n)=>typeof v==='string'&&v.length<=n;
const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
export function validatePhrase(p){
 if(!p||!safeId(p.id))throw Error('Invalid progression ID');
 if(!p||!str(p.id,80)||!p.id||!str(p.name,80)||!p.name.trim()||!Number.isInteger(p.tonic)||p.tonic<0||p.tonic>11||!['major','minor'].includes(p.mode)||!MOODS.some(m=>m.id===p.mood)||![0,1,2].includes(p.color)||!Number.isInteger(p.tempo)||p.tempo<40||p.tempo>180||!PATTERNS.some(v=>v.id===p.pattern)||!Array.isArray(p.ids)||p.ids.length<1||p.ids.length>8)throw Error('Invalid progression');
 p.ids.forEach(id=>{if(!str(id,40))throw Error('Invalid chord');chord(id,p.tonic,p.mode,p.color,p.mood);});
 if(!Array.isArray(p.voicings)||p.voicings.length!==p.ids.length)throw Error('Missing saved voicings');
 p.voicings.forEach((notes,i)=>{const c=chord(p.ids[i],p.tonic,p.mode,p.color,p.mood);if(!Array.isArray(notes)||notes.length<3||notes.length>7||notes.some(n=>!Number.isInteger(n)||n<33||n>84||!c.pcs.includes(n%12))||notes[0]%12!==c.bass)throw Error('Invalid piano voicing');});return p;
}
export function validateWorkspace(data){
 if(data?.schemaVersion!=null&&data.schemaVersion!==WORKSPACE_SCHEMA_VERSION)throw Error('This library needs a different app version. Update Mellow Keys before editing it.');
 if(!data||!Array.isArray(data.favorites)||data.favorites.length>200||!Array.isArray(data.scores)||data.scores.length>40)throw Error('Too many saved items or invalid workspace');
 const unique=a=>a.every(v=>v&&safeId(v.id))&&new Set(a.map(v=>v.id)).size===a.length;if(!unique(data.favorites)||!unique(data.scores))throw Error('Invalid or duplicate saved IDs');
 data.favorites.forEach(validatePhrase);data.scores.forEach(s=>{if(!str(s.id,80)||!s.id||!str(s.name,80)||!s.name.trim()||!Array.isArray(s.sections)||s.sections.length>100||!unique(s.sections))throw Error('Invalid score sheet');s.sections.forEach(validatePhrase);});
 if(data.activeScoreId!==null&&!data.scores.some(s=>s.id===data.activeScoreId))throw Error('Unknown active score');return data;
}
export function snapshot(settings,name){return validatePhrase({id:crypto.randomUUID(),name:name.trim().slice(0,80)||'New progression',tonic:settings.tonic,mode:settings.mode,mood:settings.mood,color:settings.color,tempo:settings.tempo,pattern:settings.pattern,ids:[...settings.ids],voicings:realize(settings).map(c=>c.midi)});}
export function phraseChords(p){return p.ids.map((id,i)=>({...chord(id,p.tonic,p.mode,p.color,p.mood),midi:p.voicings?.[i]||realize(p)[i].midi}));}
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
