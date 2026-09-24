import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export async function buildClient(destination) {
  for(const file of (await fs.readdir('public')).filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','public/'+file],{stdio:'inherit'});
  await fs.mkdir(destination,{recursive:true});
  await fs.cp('public',destination,{recursive:true});
  const vendor=path.join(destination,'vendor');await fs.mkdir(vendor,{recursive:true});
  await fs.copyFile('node_modules/vexflow/build/cjs/vexflow.js',path.join(vendor,'vexflow.js'));
  await fs.copyFile('node_modules/vexflow/LICENSE',path.join(vendor,'VEXFLOW-LICENSE.txt'));
  for(const font of ['bravura','academico'])await fs.cp('node_modules/@vexflow-fonts/'+font,path.join(vendor,'fonts',font),{recursive:true});
  const ui=path.join(vendor,'fonts','ui');await fs.mkdir(ui,{recursive:true});
  for(const font of ['dm-sans','manrope']){
    for(const weight of [400,500,600,700]){const file=`${font}-latin-${weight}-normal.woff2`;await fs.copyFile(`node_modules/@fontsource/${font}/files/${file}`,path.join(ui,file));}
    await fs.copyFile(`node_modules/@fontsource/${font}/LICENSE`,path.join(ui,font+'-LICENSE.txt'));
  }
}
