import {keyName,pitchSpelling} from './harmony-v2.js';
import {phraseChords} from './model.js';
let ready;
export async function notationReady(){if(!ready)ready=(async()=>{if(!window.VexFlow)throw Error('The notation library could not load. Reload and retry.');window.VexFlow.Font.HOST_URL=new URL('./vendor/fonts/',location.href).href;await window.VexFlow.loadFonts('Bravura','Academico');window.VexFlow.setFonts('Bravura','Academico');})().catch(error=>{ready=undefined;throw error;});return ready;}

const keyString=p=>keyName(p.tonic,p.mode).replaceAll('♭','b').replaceAll('♯','#')+(p.mode==='minor'?'m':'');
const vfKey=n=>n.step.toLowerCase()+(n.alter>0?'#'.repeat(n.alter):'b'.repeat(-n.alter))+'/'+n.octave;
export async function renderPhraseScore(container,p,start=1){
 await notationReady();container.replaceChildren();const V=window.VexFlow,chords=phraseChords(p);
 for(let offset=0;offset<chords.length;offset+=4){
  const row=document.createElement('div');row.className='score-system';container.append(row);const renderer=new V.Renderer(row,V.Renderer.Backends.SVG);renderer.resize(1060,290);const ctx=renderer.getContext();ctx.setFillStyle('#272331');ctx.setStrokeStyle('#272331');
  const rowChords=chords.slice(offset,offset+4);const widths=rowChords.map((_,i)=>i===0?310:240);let x=20;
  rowChords.forEach((c,i)=>{
   const upper=new V.Stave(x,38,widths[i]),lower=new V.Stave(x,159,widths[i]);
   if(i===0){upper.addClef('treble').addKeySignature(keyString(p));lower.addClef('bass').addKeySignature(keyString(p));if(offset===0){upper.addTimeSignature('4/4');lower.addTimeSignature('4/4');}}
   upper.setContext(ctx).draw();lower.setContext(ctx).draw();
   if(i===0){new V.StaveConnector(upper,lower).setType(V.StaveConnector.type.BRACE).setContext(ctx).draw();new V.StaveConnector(upper,lower).setType(V.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();}
   new V.StaveConnector(upper,lower).setType(V.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
   const upperPitches=c.midi.slice(1).map(n=>pitchSpelling(n,c)),bassPitches=[pitchSpelling(c.midi[0],c)];
   const treble=new V.StaveNote({clef:'treble',keys:upperPitches.map(vfKey),duration:'w'}),bass=new V.StaveNote({clef:'bass',keys:bassPitches.map(vfKey),duration:'w'});
   const tv=new V.Voice({numBeats:4,beatValue:4}).addTickables([treble]),bv=new V.Voice({numBeats:4,beatValue:4}).addTickables([bass]);
   V.Accidental.applyAccidentals([tv,bv],keyString(p));const noteX=Math.max(upper.getNoteStartX(),lower.getNoteStartX());upper.setNoteStartX(noteX);lower.setNoteStartX(noteX);
   new V.Formatter().joinVoices([tv]).joinVoices([bv]).format([tv,bv],widths[i]-(noteX-x)-30);tv.draw(ctx,upper);bv.draw(ctx,lower);
   ctx.setFont('Academico',18);ctx.fillText(c.name,Math.max(x+14,noteX-3),29);ctx.setFont('Academico',11);ctx.fillText(String(start+offset+i),x+5,49);x+=widths[i];
  });
  const svg=row.querySelector('svg');svg.setAttribute('role','img');svg.setAttribute('aria-label',p.name+', bars '+(start+offset)+'–'+(start+offset+rowChords.length-1)+': '+rowChords.map(c=>c.name).join(', '));
 }
}

export {musicXML,downloadScore} from './musicxml.js';
