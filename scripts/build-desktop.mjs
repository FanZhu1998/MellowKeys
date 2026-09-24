import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {packager} from '@electron/packager';
import {flipFuses,FuseVersion,FuseV1Options} from '@electron/fuses';
import {buildClient} from './build-client.mjs';
const root=process.cwd(),stage=path.resolve(root,'.desktop-build','app'),output=path.resolve(root,'release');
if(!stage.startsWith(root+path.sep)||path.dirname(output)!==root)throw Error('Unsafe package path');
await fs.rm(stage,{recursive:true,force:true});await fs.mkdir(stage,{recursive:true});
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:pkg.name,productName:'Mellow Keys',version:pkg.version,main:'main.cjs',description:pkg.description,author:'Mellow Keys contributors',license:pkg.license},null,2));
await buildClient(path.join(stage,'client'));
await build({entryPoints:['desktop/main.mjs'],outfile:path.join(stage,'main.cjs'),bundle:true,platform:'node',format:'cjs',target:'node24',external:['electron'],sourcemap:false});
await fs.mkdir(path.join(stage,'desktop'),{recursive:true});await fs.copyFile('desktop/preload.cjs',path.join(stage,'desktop/preload.cjs'));
await fs.cp('drizzle',path.join(stage,'drizzle'),{recursive:true});
for(const file of ['README.md','SECURITY.md','THIRD_PARTY_NOTICES.md','LICENSE'])await fs.copyFile(file,path.join(stage,file));
const apps=await packager({dir:stage,out:output,platform:'win32',arch:'x64',name:'Mellow Keys',executableName:'MellowKeys',electronVersion:pkg.devDependencies.electron,appVersion:pkg.version,overwrite:true,asar:true,prune:false,win32metadata:{CompanyName:'Mellow Keys',FileDescription:'Mellow Keys — Piano Chord Studio',ProductName:'Mellow Keys',InternalName:'MellowKeys'}});
for(const folder of apps){
 await flipFuses(path.join(folder,'MellowKeys.exe'),{version:FuseVersion.V1,[FuseV1Options.RunAsNode]:false,[FuseV1Options.EnableNodeOptionsEnvironmentVariable]:false,[FuseV1Options.EnableNodeCliInspectArguments]:false,[FuseV1Options.OnlyLoadAppFromAsar]:true,[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]:true});
 await fs.writeFile(path.join(folder,'START HERE.txt'),'Mellow Keys\r\n\r\nDouble-click MellowKeys.exe to start. No terminal, account, API key, or internet connection is needed. Keep this folder together.\r\n\r\nYour library is stored separately in %APPDATA%\\Mellow Keys\\library.sqlite. Close the app before backing up that folder. Replacing the application folder preserves your library.\r\n\r\nThis personal build is unsigned.\r\n');
 console.log('Windows app: '+folder);
}
