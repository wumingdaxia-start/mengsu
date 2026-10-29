import {axes} from './personality.js'
const designs = [
  ['tide','sage','把安静留给自己','一个坐在岸边听潮的人，身旁是缓缓延伸的水纹'],
  ['hearth','rose','在相遇里恢复温度','两个人围坐炉火旁，一起分享夜晚的温暖'],
  ['garden','sage','在熟悉的土地深耕','戴帽子的园丁为花盆和新叶浇水'],
  ['light','ochre','捡起生活里的新光','一位走在山路上的旅人抬手触碰微小的光'],
  ['cloud','slate','给变化留一点空白','披着短斗篷的人站在云层构成的缓台上'],
  ['path','ochre','把远方织成小径','旅人拿着折页地图，脚下小径弯向山坡'],
  ['warmth','rose','听见心里真实的温度','一个人双手捧着热茶，杯口升起轻轻的热气'],
  ['stars','slate','让判断有星光可循','观察者站在望远镜旁，远处星点连成星图'],
  ['shore','slate','先找到稳稳的落脚处','岸边的人把小船的缆绳系在木桩上'],
  ['sail','ochre','在小小的出发里校准','一艘载着旅人的帆船驶过平静的波纹'],
  ['leaf','sage','为彼此撑一片柔软','一位撑着叶形伞的人，为小植物留出遮蔽'],
  ['lamp','rose','温柔，也有自己的边界','一个人站在小路上，点亮身旁的立灯']
]
export const personalityCards = axes.flatMap((axis,i)=>['low','high'].map((side,j)=>{
  const n=i*2+j, [art,palette,subtitle,artLabel]=designs[n]
  return {id:`${axis.id}-${side}`,axis:axis.id,side,number:String(n+1).padStart(2,'0'),
    title:axis[`${side}Name`],label:axis.name,subtitle,art,palette,artLabel,
    description:axis[`${side}Text`],action:axis[`${side}Action`]}
}))
export const balancedCard = {id:'balanced',number:'00',title:'合流',label:'随情境选择',subtitle:'不必停留在任何一端',art:'balance',palette:'sage',artLabel:'两道水流在桥下相遇，桥上的旅人停下来望向远方',description:'你的本次选择没有呈现明显的单侧偏好，可以在不同生活方式之间灵活往返。',action:'留意一件最近让你自在的小事，记下当时真正需要的是什么。'}
export function cardsForResult(result) {
  if(!result) return []
  const strongest=result.profile.filter(p=>p.side!=='balanced').sort((a,b)=>Math.abs(b.position-50)-Math.abs(a.position-50)).slice(0,2)
  return strongest.length ? strongest.map(p=>personalityCards.find(c=>c.axis===p.id&&c.side===p.side)) : [balancedCard]
}
