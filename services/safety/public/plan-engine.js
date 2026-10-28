(function(root){
 'use strict';
 const goals=['减脂','增肌','保持健康'],levels=['初学','有基础'],equipment=['徒手','哑铃'],activities={'久坐为主':1.2,'轻度活动':1.375,'中等活动':1.55,'高强度活动':1.725};
 const exclusions=['蛋类','奶类','大豆','坚果','鱼虾','小麦'];
 function requireValue(condition){if(!condition)throw Error('请检查计划信息、内容长度及数值范围')}
 const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 const text=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x));
 function settings(kind,s){
  requireValue(s&&typeof s==='object'&&!Array.isArray(s)&&goals.includes(s.goal));
  if(kind==='exercise'){
   requireValue(levels.includes(s.level)&&equipment.includes(s.equipment)&&Number.isInteger(s.days)&&number(s.days,1,5)&&number(s.minutes,20,90)&&Number.isInteger(s.minutes)&&date(s.startDate));
   return {goal:s.goal,level:s.level,equipment:s.equipment,days:s.days,minutes:s.minutes,startDate:s.startDate};
  }
  requireValue(['男','女'].includes(s.sex)&&Number.isInteger(s.age)&&number(s.age,18,75)&&number(s.height,140,210)&&number(s.weight,40,200)&&Object.hasOwn(activities,s.activity)&&['均衡饮食','蛋奶素'].includes(s.preference));
  requireValue(Array.isArray(s.exclusions)&&s.exclusions.length<=6&&s.exclusions.every(x=>exclusions.includes(x)));
  requireValue(typeof s.notes==='string'&&s.notes.length<=300);
  return {goal:s.goal,sex:s.sex,age:s.age,height:s.height,weight:s.weight,activity:s.activity,preference:s.preference,exclusions:[...new Set(s.exclusions)],notes:s.notes.trim()};
 }
 function nutrition(s){
  const bmr=Math.round(10*s.weight+6.25*s.height-5*s.age+(s.sex==='男'?5:-161));
  const tdee=Math.round(bmr*activities[s.activity]);
  const calories=Math.round(Math.min(4000,Math.max(1200,bmr,tdee+(s.goal==='减脂'?-300:s.goal==='增肌'?250:0))));
  const protein=Math.round(Math.min(s.weight*(s.goal==='增肌'?1.8:1.6),calories*.3/4));
  const fat=Math.round(calories*.25/9),carbs=Math.round((calories-protein*4-fat*9)/4);
  return {bmr,tdee,calories,protein,fat,carbs};
 }
 function exercise(s,createdDate){
  s=settings('exercise',s);requireValue(date(createdDate));
  const training=new Set(Array.from({length:s.days},(_,i)=>Math.floor(i*7/s.days)));
  const strength=s.equipment==='哑铃'?['高脚杯深蹲、哑铃地板卧推、哑铃划船','哑铃髋铰链、坐姿哑铃推举、死虫式']:['椅子坐站、靠墙俯卧撑、鸟狗式','臀桥、站姿提踵、死虫式'];
  let session=0;
  const items=Array.from({length:7},(_,i)=>{
   const day=new Date(s.startDate+'T12:00:00');day.setDate(day.getDate()+i);
   const label=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
   if(!training.has(i))return {label,content:'恢复日：日常轻松活动，按身体感受舒缓拉伸，不安排正式训练。',minutes:0};
   const moves=strength[session++%2],rounds=s.level==='初学'?'1–2':'2–3';
   const cardio=s.goal==='减脂'?'快走或低冲击踏步':'轻松快走';
   return {label,minutes:s.minutes,content:'热身 5 分钟；'+moves+'，每个动作 '+rounds+' 组 × 8–12 次，组间休息 60–90 秒；'+cardio+'约 '+Math.max(3,s.minutes-20)+' 分钟；舒缓 5 分钟。按总时长减少组数，不必勉强完成。'};
  });
  return {kind:'exercise',createdDate,settings:s,items};
 }
 // Approximate values per listed portion; ingredients and exclusions stay explicit.
 const foods=[
  {name:'燕麦片',amount:50,unit:'g（干重）',cal:190,pro:6.5,tags:[],group:'grain'},
  {name:'米饭',amount:200,unit:'g（熟重）',cal:232,pro:5.2,tags:[],group:'grain'},
  {name:'红薯',amount:250,unit:'g（熟重）',cal:215,pro:3.8,tags:[],group:'grain'},
  {name:'鸡蛋',amount:100,unit:'g（去壳）',cal:144,pro:13,tags:['蛋类'],group:'protein'},
  {name:'纯牛奶',amount:250,unit:'ml',cal:150,pro:8,tags:['奶类'],group:'protein'},
  {name:'鸡胸肉',amount:120,unit:'g（熟重）',cal:198,pro:37.2,tags:['肉类'],group:'protein'},
  {name:'豆腐',amount:200,unit:'g',cal:160,pro:16,tags:['大豆'],group:'protein'},
  {name:'熟扁豆',amount:200,unit:'g',cal:232,pro:18,tags:[],group:'protein'},
  {name:'苹果',amount:150,unit:'g（可食部）',cal:78,pro:.4,tags:[],group:'fruit'},
  {name:'蔬菜',amount:250,unit:'g（可食部）',cal:75,pro:4,tags:[],group:'vegetable'},
  {name:'烹调油',amount:10,unit:'g',cal:90,pro:0,tags:[],group:'oil'}
 ];
 function diet(s,createdDate){
  s=settings('diet',s);requireValue(date(createdDate));const targets=nutrition(s);
  const allowed=foods.filter(f=>!f.tags.some(tag=>s.exclusions.includes(tag)||(s.preference==='蛋奶素'&&tag==='肉类')));
  const proteins=allowed.filter(f=>f.group==='protein'),find=name=>allowed.find(f=>f.name===name);
  const breakfast=proteins.find(f=>f.name==='鸡蛋')||proteins[0];
  const lunch=proteins.find(f=>f.name==='鸡胸肉')||proteins.find(f=>f.name==='豆腐')||proteins[0];
  const dinner=proteins.find(f=>f.name==='豆腐')||proteins.find(f=>f.name==='熟扁豆');
  const menus=[[find('燕麦片'),breakfast,find('苹果')],[find('米饭'),lunch,find('蔬菜'),find('烹调油')],[find('红薯'),dinner,find('蔬菜'),find('烹调油')],[find('苹果'),proteins.find(f=>f.name==='纯牛奶')||find('熟扁豆')]];
  const base=menus.flat().reduce((n,f)=>n+f.cal,0),factor=targets.calories/base;
  const items=menus.map((menu,i)=>{
   let calories=0,protein=0;
   const content=menu.map(f=>{const amount=Math.max(5,Math.round(f.amount*factor/5)*5),ratio=amount/f.amount;calories+=f.cal*ratio;protein+=f.pro*ratio;return f.name+' '+amount+f.unit}).join(' + ');
   return {label:['早餐','午餐','晚餐','加餐'][i],content,calories:Math.round(calories),protein:Math.round(protein*10)/10};
  });
  return {kind:'diet',createdDate,settings:s,items,targets};
 }
 function validatePlan(value,kind){
  if(value===undefined||value===null)return null;
  requireValue(value&&typeof value==='object'&&!Array.isArray(value)&&value.kind===kind&&date(value.createdDate));
  const s=settings(kind,value.settings);
  requireValue(Array.isArray(value.items)&&value.items.length===(kind==='exercise'?7:4));
  const items=value.items.map((row,i)=>{
   requireValue(row&&text(row.label,40)&&text(row.content,1200));
   if(kind==='exercise'){requireValue(number(row.minutes,0,180));return {label:row.label.trim(),content:row.content.trim(),minutes:row.minutes}}
   requireValue(row.label===['早餐','午餐','晚餐','加餐'][i]&&number(row.calories,0,5000)&&number(row.protein,0,500));
   return {label:row.label,content:row.content.trim(),calories:row.calories,protein:row.protein};
  });
  return {kind,createdDate:value.createdDate,settings:s,items,...(kind==='diet'?{targets:nutrition(s)}:{})};
 }
 const api={exercise,diet,validatePlan,nutrition,exclusions};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthPlans=api;
})(typeof globalThis!=='undefined'?globalThis:this);
