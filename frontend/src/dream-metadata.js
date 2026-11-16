// Explicit user tags provide metadata; dream prose is never guessed.
const groups = [{name:'场景',items:['熟悉地方','陌生地方','家里','学校','路上','车站','交通工具','室内','室外','高处','天空','水边','白天','夜晚','下雨','下雪','黑暗','明亮','森林','海边','山间','花园','医院','商场','图书馆','游乐园','老房子','梦幻空间']},{name:'角色',items:['自己','家人','伴侣','喜欢的人','前任','朋友','同学','同事','老师','陌生人','已故的人','动物','很多人','孩子','婴儿','邻居','医生','旅伴','童年好友','久未联系的人','虚构人物','神秘身影','另一个自己']}]
const locations=new Set(groups[0].items), characters=new Set(groups[1].items)
export function dreamMetadata(record={}, source={}) {
 const tags=[...new Set([...(Array.isArray(source.tags)?source.tags:[]),...(Array.isArray(record.tags)?record.tags:[])])]
 return {tags,place:record.place||record.location||source.place||source.location||tags.filter(tag=>locations.has(tag)),people:record.people||source.people||tags.filter(tag=>characters.has(tag))}
}
