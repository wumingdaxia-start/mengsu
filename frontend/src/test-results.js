export function testAccount(){try{return String(JSON.parse(sessionStorage.getItem('mengsu-auth')||'null')?.id||'')}catch{return ''}}
export const testKinds=[{type:'personality',name:'人格测试',path:'/psychology/personality'},{type:'tarot',name:'塔罗牌测试',path:'/psychology/tarot'},{type:'views',name:'三观测试',path:'/psychology/views-test'}]
