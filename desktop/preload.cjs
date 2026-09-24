const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('mellowDesktop',Object.freeze({
  savePDF:()=>ipcRenderer.invoke('mellow:save-pdf'),
  ready:()=>ipcRenderer.send('mellow:ready'),
}));
