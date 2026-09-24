export const APP_URL='mellow://app/index.html';
export const isAppURL=value=>{try{const url=new URL(value);return url.protocol==='mellow:'&&url.hostname==='app'&&!url.username&&!url.password&&!url.port;}catch{return false;}};
const externalHosts=new Set(['www.youtube.com','www.vexflow.com','github.com']);
export const isExternalURL=value=>{try{const url=new URL(value);return url.protocol==='https:'&&externalHosts.has(url.hostname)&&!url.username&&!url.password&&!url.port;}catch{return false;}};
export function isTrustedSender(event,window){return !!window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&isAppURL(event.senderFrame.url);}
