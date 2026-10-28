'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function createConsultStore(directory){
 const fileFor=id=>path.join(directory,crypto.createHash('sha256').update(String(id)).digest('hex')+'.json');
 function read(id){try{const data=JSON.parse(fs.readFileSync(fileFor(id),'utf8'));return Array.isArray(data)?data.filter(item=>['user','assistant'].includes(item?.role)&&typeof item.content==='string').slice(-40):[]}catch(error){if(error.code==='ENOENT')return [];throw error}}
 function write(id,messages){fs.mkdirSync(directory,{recursive:true});const file=fileFor(id),tmp=file+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(messages.slice(-40)),{mode:0o600});fs.renameSync(tmp,file)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}}
 function clear(id){try{fs.unlinkSync(fileFor(id))}catch(error){if(error.code!=='ENOENT')throw error}}
 return {read,write,clear};
}
module.exports={createConsultStore};
