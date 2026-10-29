'use strict';
const path=require('node:path'),crypto=require('node:crypto');
const {atomicWrite}=require('./local-persistence');
const keys=new Set(['snapshots','journals','plan','rituals','holes','posts','creations','seeds','receipts','notes','prefs','clusters','conversations','drift']);
function validate(input){
 if(!input||!keys.has(input.key)||!Number.isSafeInteger(input.revision)||input.revision<0||input.value===undefined||input.value===null||typeof input.value!=='object')throw Error('梦境记录格式不正确');
 const text=JSON.stringify(input.value);
 if(Buffer.byteLength(text)>12*1024*1024)throw Error('记录过大，请减少图片或先导出部分记录');
 function check(value,depth=0){if(depth>30)throw Error('记录层级过多');if(value&&typeof value==='object'){for(const key of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('记录字段无效');check(value[key],depth+1)}}}
 check(input.value);return input;
}
function createDreamStore(directory){
 const fs=require('node:fs');
 const file=id=>path.join(directory,crypto.createHash('sha256').update(String(id)).digest('hex')+'.json');
 function read(id){try{return JSON.parse(fs.readFileSync(file(id),'utf8'))}catch(e){if(e.code==='ENOENT')return {values:{},revisions:{}};throw e}}
 return {read,write(id,input){const data=read(id);if((data.revisions[input.key]||0)!==input.revision)return null;data.values[input.key]=input.value;data.revisions[input.key]=input.revision+1;atomicWrite(file(id),data);return{value:input.value,revision:input.revision+1}}};
}
module.exports={validate,createDreamStore};
