<p align="center"><img src="docs/mengsu-logo.svg" width="104" alt="梦溯月牙标志" /></p>
<h1 align="center">梦溯 · Mengsu</h1>
<p align="center">把身体、睡眠与心情，轻轻记在这里。</p>
<p align="center">健康记录 · 生活打卡 · 记录复盘 · AI 健康交流</p>

---

梦溯是一个柔和、安静的个人健康记录工作台。通过日常笔记、睡眠与梦境、饮食和活动记录，逐渐看见自己的生活节奏。浅紫米白界面、半透明卡片和缓慢流动的背景，让记录成为轻松的日常习惯。

## ✨ 功能入口

| 模块 | 可以做什么 |
| --- | --- |
| 🏡 健康总览 | 查看记录入口，通过数字人身体部位标记关注，录入健康日志 |
| 👤 个人档案 | 记录基本信息、身高体重、生活目标、饮食限制和紧急联系人 |
| 🚶 日常锻炼 | 记录活动，查看近七天活动预览与运动概览 |
| 🥗 饮食健康 | 记录饮食、饮水与餐后感受，回看本周饮食印记 |
| 🌙 睡眠监测 | 记录睡眠和梦境，通过星云滑条记录主观感受 |
| 👁️ 视力检测 | 手动保存专业检查结果，便于后续回看 |
| 🌱 健康挑战赛 | 使用本地打卡清单，逐步建立生活习惯 |
| 🫧 安全健康分析 | 汇总睡眠、饮食、活动与情绪记录，查看七日综合预览和打卡提醒 |
| 💬 AI 健康问诊 | 围绕健康记录进行 AI 交流，需配置模型及对应服务 |

记录和汇总用于自我观察，不提供疾病诊断，也不以主观滑条生成健康评分。视力页面用于记录检查结果，并非屏幕视力检查工具。

## 🌸 三种动态入口

| 场景 | 视觉 | 登录后的入口 |
| --- | --- | --- |
| 花屿 | 柔光水纹与花瓣 | 健康总览 |
| 鱼庭 | 游动鱼群与指针互动 | 日常锻炼 |
| 星笺 | 星光与缓慢流动的星云 | 安全健康分析 |

各工作区复用对应场景作为低透明度动态背景，并保留清晰的内容阅读层。

## 🧩 技术栈

- **前端：** Vue 3、TypeScript、Vite、Tailwind CSS。
- **交互：** Three.js、GSAP；星云滑条通过 React 桥接使用 Radix Slider 与 Framer Motion。
- **后端：** Python、FastAPI、SQLite。
- **模型：** 千问 OpenAI 兼容接口；心潮和记忆服务为可选外部依赖。

## 🚀 本地运行

准备 Python 3.10、Node.js 与 npm。以下以 Windows PowerShell 为例。

### 安装依赖

```powershell
git clone https://github.com/zkmluck/mengsu.git
cd mengsu
conda create -n sleep-agent python=3.10
conda activate sleep-agent
python -m pip install -r requirements.txt
Copy-Item private/.env.example private/.env
```

在本机编辑 `private/.env`，填写 `QWEN_API_KEY` 及实际需要的配置。不要提交密钥或本地个人数据。

### 构建前端并启动后端

```powershell
cd frontend
npm install
npm run build
cd ../backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

保持终端运行，打开：

- 页面：[http://127.0.0.1:8000/entry](http://127.0.0.1:8000/entry)
- 服务状态：[http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- API 文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 前端开发模式

后端继续运行，另开终端，在项目根目录执行：

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

访问 [http://127.0.0.1:5173/entry](http://127.0.0.1:5173/entry)。开发服务器将 API 请求代理到 8000 端口；仅启动前端时，后端数据功能不可用。

Windows 启动脚本需指定本机 Python 路径。未配置外部心潮、记忆服务时，可跳过：

```powershell
.\start.ps1 -PythonPath "<你的 Python 可执行文件路径>" -NoXinchao -NoMemory
```

## ☁️ 部署到 Ubuntu 服务器

可按 [Ubuntu 部署指南](docs/deploy-ubuntu.md) 配置 Nginx、HTTPS 与 systemd。FastAPI 同时托管前端静态文件和 API。

## 🗂️ 项目结构

```text
frontend/          Vue 页面、组件与动态场景
backend/           FastAPI 接口与业务逻辑
private/           本地配置模板与私有配置
data/              本地数据库、媒体与导出数据
docs/              项目标志与文档资源
requirements.txt   Python 依赖
start.ps1          Windows 启动脚本
```

## 🔐 数据与登录方式

- 当前登录是演示用的本地会话，不是服务端账户认证；没有实现多用户隔离或跨设备登录。
- 个人档案、主观感受滑条和挑战打卡使用浏览器本地存储，不会自动同步到服务器或其他设备。
- 后端记录使用本地 SQLite，默认数据库为 `data/mengsu.db`；媒体和导出文件保存在 `data/`。
- AI 能力依赖有效模型配置；部分能力还需要独立安装、运行可选心潮和记忆服务。

## 🛠️ 页面打不开时

1. 确认启动终端仍在运行，并查看终端是否报错。
2. 使用 8000 端口时，先执行前端构建，再启动后端。
3. 使用 5173 端口时，同时保持 Vite 和后端运行。
4. `127.0.0.1` 仅指向当前电脑；其他设备无法用这个地址访问本机项目。
5. 端口被占用时检查占用进程。自带 `stop.cmd` 面向 8000、18110、18001，不负责关闭 5173 开发服务器。

## 🎨 视觉资源

入口场景原有的 konmari / pastel-lab 署名与资源归属说明予以保留。项目月牙与星光标志见 [梦溯图标](docs/mengsu-logo.svg)。
