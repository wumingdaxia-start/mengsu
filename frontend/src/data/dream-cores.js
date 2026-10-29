// Local atmosphere prompts, not a psychological instrument. Replace persistence with an authenticated API later.
export const cores = [
 {name:'梦核',color:'#c5b8db',bg:'#f3edf7',art:'/dream-cores/dream.webp',slogan:'在醒来之前，再停留一会儿',inner:'熟悉的房间有一点陌生，远处的光像一段没有说完的记忆。你选择的画面，让朦胧与留白成为这个夜晚的底色。',gravity:'漂浮的云、空房间、褪色的光。可以在快照中留意失重与怅然。',feeling:'失重',music:'德彪西《月光》',film:'《千与千寻》',objects:'半透明窗帘、旧相册、柔光夜灯'},
 {name:'怪核',color:'#b6becb',bg:'#eef0f4',art:'/dream-cores/weird.webp',slogan:'熟悉的世界，悄悄偏离了一厘米',inner:'走廊比记忆里更长，时钟忘了往前。你愿意停在那些不太合常理的细节旁，容纳一点陌生，而不急着解释。',gravity:'重复的门、电视噪点、没有终点的走廊。留意疏离与压迫的变化。',feeling:'疏离',music:'Brian Eno《1/1》',film:'《红辣椒》',objects:'旧电视画面、磨砂玻璃、空走廊照片'},
 {name:'童话核',color:'#b5c8ac',bg:'#f1f4eb',art:'/dream-cores/fairytale.webp',slogan:'林间的灯，总为晚归的人留着',inner:'林间有一扇小窗，灯光不问你从哪里来。这个夜晚的选择靠近温暖、被承托的感觉，允许自己暂时慢下来。',gravity:'蘑菇小屋、苔藓、温热的茶。留意温暖与安稳。',feeling:'温暖',music:'久石让《风之甬道》',film:'《龙猫》',objects:'木质小盒、植物标本、暖色台灯'},
 {name:'天使核',color:'#dacdb5',bg:'#faf6ee',art:'/dream-cores/angel.webp',slogan:'让所有心事，轻轻落在云上',inner:'风从高处穿过，光线没有棱角。你留下的选择像一次轻轻的呼吸，给紧绷的身体一块可以舒展的地方。',gravity:'云层、羽毛、远处的风铃。留意轻盈、安稳与失重。',feeling:'安稳',music:'坂本龙一《Aqua》',film:'《天空之城》',objects:'白棉布、风铃、乳白玻璃灯'},
 {name:'池核',color:'#a7c8d4',bg:'#edf5f7',art:'/dream-cores/pool.webp',slogan:'夏天永远留在无人的泳池边',inner:'蓝色的池水安静地晃动，四周没有催促你的声音。在这些选择里，你靠近有边界的独处，也给自己留下一点漂浮的空间。',gravity:'水面反光、瓷砖、空泳池。留意失重、安稳与轻微疏离。',feeling:'失重',music:'Tycho《A Walk》',film:'《海街日记》',objects:'蓝色玻璃杯、水波灯、泳池明信片'},
 {name:'水核',color:'#9bbfbe',bg:'#edf5f3',art:'/dream-cores/water.webp',slogan:'沉入水中，世界终于轻声说话',inner:'水流托住身体，声音从很远的地方传来。你选择了缓慢、包裹与下沉的画面，像给白天的杂音留出一段距离。',gravity:'水下光束、河流、透明波纹。留意失重与疏离。',feeling:'失重',music:'Ólafur Arnalds《Near Light》',film:'《悬崖上的金鱼姬》',objects:'透明水杯、海玻璃、水面摄影'},
 {name:'水晶核',color:'#c4bbd9',bg:'#f3f0fa',art:'/dream-cores/crystal.webp',slogan:'每一束碎光，都有自己的方向',inner:'光穿过透明的棱面，在地面留下细小的颜色。你的选择偏向清透与细节，愿意把注意力放在不必命名的闪光上。',gravity:'透明晶体、折射光、细碎星点。留意轻盈与安稳。',feeling:'安稳',music:'Max Richter《Dream 3》',film:'《辉夜姬物语》',objects:'玻璃棱镜、透明石子、浅色薄纱'},
 {name:'雨核',color:'#acb8cf',bg:'#f0f2f8',art:'/dream-cores/rain.webp',slogan:'雨替你把没说完的话，慢慢说完',inner:'雨滴在窗上聚拢，又沿着自己的轨迹散开。你停留在柔和的隔绝感里，让那些还没说清的感受先有一个容身之处。',gravity:'雨窗、路灯、潮湿的街道。留意怅然、安稳与疏离。',feeling:'怅然',music:'坂本龙一《Rain》',film:'《言叶之庭》',objects:'雨声录音、灰蓝毛毯、玻璃窗边的小灯'}
]
const q=(title, options)=>({title,options:options.map(([text,core])=>({text,core}))})
export const questions=[
 q('你在陌生房间醒来，第一眼最想看见什么？',[['天花板漂浮的云朵与发光碎星',0],['落地窗外，无尽蔚蓝的空泳池',4],['林间蘑菇小屋，窗缝漏出暖光',2],['路灯在淅沥的雨雾里发光',7]]),
 q('梦里的声音更接近什么？',[['模糊循环的旧电视白噪音',1],['水流与水下闷闷的回响',5],['风铃与远处林间的鸟鸣',3],['雨滴敲打玻璃的沙沙声',7]]),
 q('哪一种光线，让你想在梦里多停一会儿？',[['朦胧褪色、微微泛旧的暖光',0],['穿过水面、晃动破碎的光斑',4],['晶体折射、四散的彩虹碎光',6],['树叶间透下的温暖晨光',2]]),
 q('梦里有一扇门，你会推开哪一扇？',[['门后是没有尽头的熟悉走廊',1],['门后有轻轻托住你的云层',3],['门后是一片透明的水下世界',5],['门后有挂着雨珠的小花园',7]]),
 q('醒来的瞬间，你最想留住哪一种感受？',[['身体像漂在夏天的池水上',4],['被一层柔软的光安稳包裹',3],['指尖碰到清凉透明的碎光',6],['似曾相识，却想不起在哪里',0]]),
 q('梦里的你，需要一个怎样的藏身处？',[['林间有热茶的小屋',2],['落雨时安静的窗边',7],['一间布局微妙错位的旧房间',1],['听得见自己呼吸的水底',5]]),
 q('你想把哪一样东西带回清晨？',[['一枚透着微光的晶体',6],['一片轻得没有重量的羽毛',3],['一张褪色但熟悉的照片',0],['池边晒得温热的蓝色瓷砖',4]]),
 q('梦境突然安静下来，你会走向哪里？',[['有萤火的小路',2],['重复播放同一画面的屏幕',1],['缓缓流动的河中央',5],['路灯下渐渐积起的雨水',7]]),
 q('你更愿意怎样在梦里移动？',[['沿着池边慢慢走',4],['踩着云，任风轻轻托起',3],['穿过晶体折出的细小光路',6],['在不合逻辑的楼梯间转弯',1]]),
 q('梦快结束时，你希望谁来送别？',[['一扇仍亮着灯的小木屋',2],['一个只在旧记忆里出现的背影',0],['水面荡开的最后一圈波纹',5],['窗外始终没有停下的雨',7]]),
 q('若昨夜的梦有一种触感，会是什么？',[['凉而平整的池壁',4],['柔软又微暖的棉絮',3],['光滑、透亮的玻璃',6],['旧胶片略微粗糙的边缘',1]]),
 q('最后，你想让意识在哪里停靠？',[['长着苔藓、可以安心休息的森林',2],['天空与记忆交叠的空房间',0],['透明而没有催促声的水域',5],['散落着细碎光线的安静角落',6]])
]
// Every dimension appears six times; results describe choices, not diagnoses.
export function scoreAnswers(answers){const votes=Array(8).fill(0);answers.forEach((answer,i)=>{const option=questions[i]?.options[answer];if(option)votes[option.core]++});return votes.map((v,i)=>({index:i,votes:v,score:Math.round(v/6*100)})).sort((a,b)=>b.votes-a.votes||a.index-b.index)}
