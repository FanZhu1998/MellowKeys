import {app,BrowserWindow,Menu,protocol,session,ipcMain,dialog,shell,net} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {openDatabase} from '../server/sqlite-adapter.mjs';
import {createAssets} from '../server/assets.mjs';
import worker from '../server/worker.js';
import {APP_URL,isAppURL,isExternalURL,isTrustedSender} from './security.mjs';

const smoke=process.argv.includes('--smoke-test');
const smokeDir=process.argv.find(x=>x.startsWith('--smoke-dir='))?.slice('--smoke-dir='.length);
if(smoke&&!smokeDir)throw Error('Smoke tests require a separate data directory.');
app.setName('Mellow Keys');
app.setAppUserModelId('org.mellowkeys.studio');
app.setPath('userData',smoke?path.resolve(smokeDir):path.join(app.getPath('appData'),'Mellow Keys'));
protocol.registerSchemesAsPrivileged([{scheme:'mellow',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let window,DB,smokeTimer;
if(!smoke&&!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.whenReady().then(start).catch(error=>{if(smoke){console.error(error.message);app.exit(1);}else{dialog.showErrorBox('Mellow Keys could not start',error.message);app.quit();}});
}
async function start(){
  const root=app.getAppPath(),client=path.join(root,app.isPackaged?'client':'dist/client');
  DB=openDatabase(path.join(app.getPath('userData'),'library.sqlite'),path.join(root,'drizzle'));
  const ASSETS=createAssets(client,{desktop:true});
  protocol.handle('mellow',async request=>{
    if(!isAppURL(request.url))return new Response('Forbidden',{status:403});
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return ASSETS.fetch(request);
    const headers=new Headers(request.headers);headers.set('oai-authenticated-user-id','desktop-owner');headers.set('origin','https://desktop.mellow.local');
    const internal=new Request('https://desktop.mellow.local'+url.pathname,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method)?{body:await request.arrayBuffer()}:{})});
    return worker.fetch(internal,{DB,ASSETS});
  });
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['mellow:','data:','blob:','devtools:'].includes(new URL(details.url).protocol)}));
  window=new BrowserWindow({width:1420,height:980,minWidth:760,minHeight:650,backgroundColor:'#15151d',show:false,title:'Mellow Keys',autoHideMenuBar:true,webPreferences:{preload:path.join(root,'desktop/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,webviewTag:false,devTools:!app.isPackaged}});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Mellow Keys',submenu:[{label:'About Mellow Keys',click:()=>dialog.showMessageBox(window,{type:'info',title:'Mellow Keys',message:'Mellow Keys '+app.getVersion(),detail:'A chill piano writing room. Your library stays on this computer.\nBuilt from original harmony prompts, not song transcriptions.'})},{type:'separator'},{role:'quit'}]},
    {label:'View',submenu:[{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'},{type:'separator'},{role:'togglefullscreen'}]},
  ]));
  const external=url=>{if(isExternalURL(url)&&!smoke)shell.openExternal(url).catch(()=>{});};
  window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(!isAppURL(url)){event.preventDefault();external(url);}});
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  window.webContents.on('will-prevent-unload',async()=>{const result=await dialog.showMessageBox(window,{type:'warning',buttons:['Keep working','Close without saving'],defaultId:0,cancelId:0,message:'Some changes are still being saved.',detail:'Wait for the saved indicator or retry the save before closing.'});if(result.response===1)window.destroy();});
  window.webContents.on('did-fail-load',(event,code,description)=>{if(smoke){console.error('LOAD_FAILED',code,description);app.exit(1);}});
  window.webContents.on('render-process-gone',()=>{if(smoke)app.exit(1);});
  session.defaultSession.on('will-download',(event,item,contents)=>{if(contents!==window.webContents||!item.getURL().startsWith('blob:mellow://app/')){event.preventDefault();return;}item.setSaveDialogOptions({title:'Save MusicXML score',defaultPath:path.join(app.getPath('documents'),path.basename(item.getFilename())),filters:[{name:'MusicXML score',extensions:['musicxml']} ]});});
  ipcMain.handle('mellow:save-pdf',async event=>{
    if(!isTrustedSender(event,window))throw Error('Untrusted request');
    const choice=await dialog.showSaveDialog(window,{title:'Save piano score as PDF',defaultPath:'Mellow Keys score.pdf',filters:[{name:'PDF score',extensions:['pdf']}]});
    if(choice.canceled||!choice.filePath)return {saved:false};
    const pdf=await window.webContents.printToPDF({printBackground:false,preferCSSPageSize:true});
    await fs.writeFile(choice.filePath,pdf);return {saved:true};
  });
  ipcMain.on('mellow:ready',async event=>{
    if(!smoke||!isTrustedSender(event,window))return;
    try{
      const resources=['/api/workspace','/vendor/vexflow.js','/vendor/fonts/ui/manrope-latin-400-normal.woff2','/audio/C4.mp3'];
      for(const resource of resources){const response=await net.fetch('mellow://app'+resource);if(!response.ok)throw Error('Missing packaged resource '+resource);await response.arrayBuffer();}
      console.log('MELLOW_KEYS_SMOKE_OK '+JSON.stringify({version:app.getVersion(),electron:process.versions.electron,offlineAssets:true,library:true}));
      clearTimeout(smokeTimer);app.quit();
    }catch(error){console.error(error.message);app.exit(1);}
  });
  window.once('ready-to-show',()=>{if(!smoke)window.show();});
  if(smoke)smokeTimer=setTimeout(()=>{console.error('Desktop startup timed out');app.exit(1);},30000);
  await window.loadURL(APP_URL);
}
app.on('window-all-closed',()=>app.quit());
app.on('will-quit',()=>DB?.close());
