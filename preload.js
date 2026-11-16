'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const call=(channel,...args)=>ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('buffet',Object.freeze({
 definitions:()=>call('definitions'),list:t=>call('list',t),get:(t,id)=>call('get',t,id),
 save:(t,data)=>call('save',t,data),remove:(t,id)=>call('remove',t,id),dashboard:()=>call('dashboard'),
 quoteDetail:id=>call('quote-detail',id),backup:()=>call('backup'),
 sendEmail:payload=>call('send-email',payload),weather:(location,date)=>call('weather',location,date)
}));
