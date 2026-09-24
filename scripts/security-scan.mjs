import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const excluded=new Set(['.git','node_modules','dist','release','.desktop-build','.local-data','.sites-runtime']);
const rules=[
 ['private-key',/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g],
 ['provider-token',/\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|npm_[A-Za-z0-9]{25,})\b/g],
 ['credential-url',/[a-z][a-z0-9+.-]*:\/\/[^\s/@:'"<>]+:[^\s/@'"<>]+@/gi],
 ['jwt',/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
 ['personal-path',/(?:[A-Z]:[\\/]+Users[\\/]+[^\s"'<>]+|\/Users\/[^\s"'<>]+|\/home\/[^\s"'<>]+)/g],
];
const findings=[];let files=0;
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 if(excluded.has(entry.name))continue;
 const filename=path.join(directory,entry.name),relative=path.relative(root,filename).replaceAll(path.sep,'/');
 if(entry.isSymbolicLink()){findings.push({file:relative,rule:'unexpected-symlink'});continue;}
 if(entry.isDirectory()){walk(filename);continue;}
 if(/(^|\/)(\.env(?:\..*)?|\.dev\.vars(?:\..*)?|credentials[^/]*|secrets[^/]*|id_rsa|id_ed25519)$|\.(pem|key|p12|pfx|keystore|db|sqlite|sqlite3)$/i.test(relative)&&!relative.endsWith('.env.example'))findings.push({file:relative,rule:'sensitive-file'});
 if(!/\.(?:js|mjs|cjs|ts|json|md|html|css|yml|yaml|txt|sql)$/.test(relative)&&!entry.name.startsWith('.git'))continue;
 files++;const text=fs.readFileSync(filename,'utf8');
 for(const [rule,pattern] of rules){pattern.lastIndex=0;for(const match of text.matchAll(pattern))findings.push({file:relative,rule,line:text.slice(0,match.index).split('\n').length});}
 }}
walk(root);
if(findings.length){console.error(JSON.stringify({files,findings},null,2));process.exitCode=1;}
else console.log(`Secret scan passed: ${files} source/text files, no recognized credential patterns or sensitive files.`);
