# 桂花锦鲤背景 · Next.js

运行：`npm install`，然后 `npm run dev`，打开 http://localhost:3001 。

`components/KoiLakeBackground.tsx` 是底层背景组件；`koi-lake.js` 是共享 Canvas 2D 绘制引擎，迁移时一并复制。将 public 中两张图片复制到项目 public。

推荐 16:9 展示，其他视口采用 cover 裁切。`app/page.tsx` 是集成示例，进入花屿星链接 `/dream` 由宿主应用提供。

原图自带的鱼保留；额外的游动锦鲤由原图裁切素材沿椭圆轨迹绘制。水纹为 Canvas 2D 半透明环形叠加，不使用重型 3D 或像素级折射 shader。Framer Motion 负责柔光呼吸。

30fps 绘制上限、最高 1.5 DPR，手机减少鱼与花瓣数量；后台标签页暂停，减少动态效果时呈现静态图。全局监听指针，不拦截前景操作；卸载时释放所有监听和动画。
