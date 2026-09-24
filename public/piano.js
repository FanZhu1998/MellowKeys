const SAMPLE_NOTES=[['A1',33],['C2',36],['Ds2',39],['Fs2',42],['A2',45],['C3',48],['Ds3',51],['Fs3',54],['A3',57],['C4',60],['Ds4',63],['Fs4',66],['A4',69],['C5',72],['Ds5',75],['Fs5',78],['A5',81],['C6',84]];
export class GrandPiano {
  constructor(onStatus){this.onStatus=onStatus;this.ctx=null;this.buffers=[];this.voices=new Set();this.volume=.65;this.loading=null;}
  async ready(){
    if(!this.ctx){
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)throw Error('This browser does not support Web Audio.');
      this.ctx=new AudioContext();
      this.master=this.ctx.createGain();this.master.gain.value=this.volume*.68;
      this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-14;this.compressor.knee.value=20;this.compressor.ratio.value=3;this.compressor.attack.value=.004;this.compressor.release.value=.22;
      this.master.connect(this.compressor);this.compressor.connect(this.ctx.destination);
      this.dry=this.ctx.createGain();this.dry.gain.value=.92;this.dry.connect(this.master);
      const reverb=this.ctx.createConvolver(),seconds=1.7,length=Math.floor(this.ctx.sampleRate*seconds),impulse=this.ctx.createBuffer(2,length,this.ctx.sampleRate);
      for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);let smoothed=0;for(let i=0;i<length;i++){smoothed=smoothed*.3+(Math.random()*2-1)*.7;data[i]=smoothed*Math.pow(1-i/length,3)*.32;}}
      reverb.buffer=impulse;this.wet=this.ctx.createGain();this.wet.gain.value=.18;this.wet.connect(reverb);reverb.connect(this.master);
    }
    await this.ctx.resume();
    if(this.buffers.length===SAMPLE_NOTES.length)return;
    if(this.loading)return this.loading;
    this.onStatus('loading','Loading grand piano…');
    this.loading=(async()=>{
      try{const decoded=await Promise.all(SAMPLE_NOTES.map(async([name,midi])=>{const response=await fetch(new URL('./audio/'+name+'.mp3',import.meta.url),{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('A piano sample could not be loaded.');return {midi,buffer:await this.ctx.decodeAudioData(await response.arrayBuffer())};}));this.buffers=decoded;this.onStatus('ready','Salamander grand piano');}
      catch(error){this.loading=null;this.onStatus('error','Piano unavailable · tap to retry');throw error;}
    })();return this.loading;
  }
  setVolume(volume){this.volume=volume;if(this.master)this.master.gain.setTargetAtTime(volume*.68,this.ctx.currentTime,.04);}
  playNote(midi,when=this.ctx.currentTime,duration=2,velocity=.7){
    if(!this.buffers.length)return;
    const sample=this.buffers.reduce((a,b)=>Math.abs(a.midi-midi)<=Math.abs(b.midi-midi)?a:b);
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=sample.buffer;source.playbackRate.value=2**((midi-sample.midi)/12);
    const onset=Math.max(when,this.ctx.currentTime),release=.48;
    gain.gain.setValueAtTime(0,onset);gain.gain.linearRampToValueAtTime(velocity,onset+.007);gain.gain.setValueAtTime(velocity,onset+Math.max(.04,duration));gain.gain.exponentialRampToValueAtTime(.0001,onset+duration+release);
    source.connect(gain);gain.connect(this.dry);gain.connect(this.wet);
    const voice={source,gain};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();};
    source.start(onset);source.stop(onset+duration+release+.04);
  }
  playChord(notes,when,duration,style='block'){
    if(style==='arp'||style==='broken'){
      const upper=notes.slice(1),pattern=style==='broken'?[notes[0],...Array.from({length:7},(_,i)=>upper[i%upper.length])]:[notes[0],upper[0],upper[1],upper[2],upper.at(-1),upper[2],upper[1],upper[0]];
      pattern.forEach((n,i)=>this.playNote(n,when+i*duration/8,Math.max(.35,duration*.36),i===0?.64:.46));
    }else if(style==='pulse'){for(let beat=0;beat<4;beat++)notes.forEach((n,i)=>this.playNote(n,when+beat*duration/4+i*.005,duration/4*.55,(i===0?.45:.58/Math.sqrt(notes.length-1))*(beat%2?.85:1)));}
    else notes.forEach((n,i)=>this.playNote(n,when+i*(style==='roll'?.065:.012),Math.max(.12,duration-.12),i===0?.55:.64/Math.sqrt(notes.length-1)));
  }
  stop(){if(!this.ctx)return;const now=this.ctx.currentTime;for(const {source,gain}of this.voices){try{gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.045);source.stop(now+.05);}catch{try{source.stop();}catch{}}}}
}
