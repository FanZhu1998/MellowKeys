import {emptyWorkspace,validateWorkspace} from './model.js';
import {mergeWorkspaces} from './workspace-merge.js';
import {createWorkspaceTransport} from './workspace-transport.js';
export {mergeWorkspaces} from './workspace-merge.js';
const clone=value=>structuredClone(value);
export class Library{
 constructor(onChange,transport=createWorkspaceTransport()){this.transport=transport;this.data=emptyWorkspace();this.base=emptyWorkspace();this.revision=0;this.loaded=false;this.busy=false;this.dirty=0;this.persisted=0;this.error='';this.onChange=onChange;}
 async load(){this.onChange('loading');try{const j=await this.transport.load();validateWorkspace(j.data);this.data=j.data;this.base=clone(j.data);this.revision=j.revision;this.loaded=true;this.error='';this.onChange('saved');}catch(e){this.error=e.message;this.onChange('error');}}
 change(action){if(!this.loaded)throw Error('Your collection has not loaded yet. Please retry the connection.');const backup=structuredClone(this.data);try{action(this.data);validateWorkspace(this.data);}catch(error){this.data=backup;throw error;}this.dirty++;this.onChange('saving');this.save();}
 async save(){if(this.busy||!this.loaded)return;this.busy=true;this.error='';let conflicts=0;try{while(this.persisted<this.dirty){const sent=this.dirty,sentData=clone(this.data);this.onChange('saving');let j;try{j=await this.transport.save(sentData,this.revision);}catch(error){if(error.status!==409||conflicts++>=2)throw error;const remote=await this.transport.load();validateWorkspace(remote.data);this.data=mergeWorkspaces(this.base,this.data,remote.data);this.base=clone(remote.data);this.revision=remote.revision;this.dirty++;this.onChange('recovered');continue;}this.revision=j.revision;this.base=sentData;this.persisted=sent;}this.onChange('saved');}catch(e){this.error=e.message;this.onChange('error');}finally{this.busy=false;}}
}
