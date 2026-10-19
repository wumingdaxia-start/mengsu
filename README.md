# 梦溯

睡眠—记忆双向闭环助手。四个入口：昼拾（白天记忆）、夜航（睡前到清晨）、织网（跨日期关联）、叙事（无分数报告）。

## 运行环境

- Python：conda 环境 `sleep-agent`（Python 3.10），已包含 FastAPI、httpx、mcp<2、python-frontmatter 等依赖。
- 心潮：Node.js v24，原生运行，不依赖 Docker。
- 模型：千问（OpenAI 兼容接口）。

## 配置

```
copy private\.env.example private\.env
```

在 `private\.env` 里填入 `QWEN_API_KEY`。注意：要填在 `.env`，不要填在 `.env.example`，程序只读 `.env`。
该目录已加入 `.gitignore`，密钥不进代码、不进日志、不下发到前端。

## 启动

```
.\start.ps1
```

脚本按顺序做四件事：检查 `private\.env`、生成两个服务令牌、启动心潮与记忆服务（都是本机进程，不依赖 Docker）、启动 API。
加 `-NoXinchao` 或 `-NoMemory` 可以跳过对应服务。

两个后台服务的日志写在 `data\logs\`，起不来时先看那里的 err 文件。

停止：双击 `stop.cmd`（会释放 8000 / 18110 / 18001 三个端口）。
如果启动时报端口被占用，先跑一次 `stop.cmd` 再启动。

## 初始界面

打开就是「梦的入口」：墨绿夜空里缓慢上浮的梦境碎片、一条穿屏而过的丝线、跟着指针走的一粒光。

想换成自己的梦境背景图，把图片命名为 `dream_bg.png` 放进 `frontend\public\`，
重新执行一次 `npm run build` 即可（不放图也能用，会露出画布夜景）。

- 配色来自 Radix Colors 的 jade / sage / amber 暗色色阶。
- 字体自托管：标题用 Noto Serif SC，界面用 Inter，只保留 woff2 单字重。
- 手绘碎片用 Rough.js 预渲染到离屏画布，再逐帧合成，不会拖慢动画。
- 动效：指针牵引碎片、滚轮加深景深、点击泛起光晕、标题由模糊转清晰，并逐级错开出现。
- 若系统开启「减少动态效果」，画面静止为一帧，不做动画。
- 点击「走进梦境」或按回车进入四个入口，页头右上角可以回到入口。

## 记忆服务

长期记忆由 Ombre Brain 通过 MCP 提供，跑在 18001 端口，鉴权用 `private\memory-token.txt` 里的服务令牌。

- 写入：`hold`（正文逐字保存，不压缩、不改写）
- 召回：`breath`（本机未启用向量化，走关键词与 BM25）
- 可用工具共 15 个：breath、hold、grow、forget、restore、purge、trace、dream、anchor、release、pulse、plan、letter_write、letter_read、I

后端接口：`GET /api/memory/tools`、`POST /api/memory/recall`、`POST /api/memory/remember`。
每成功归档一条记录，后台会把原文交给 `hold` 存进长期记忆；记忆服务不可用时只影响记忆，不影响记录。

织网页面里有「跨日期回忆」输入框，可以直接按关键词检索长期记忆。

## 睡前线索音频

在夜航页面选好今晚的线索，点「生成线索」再点「生成音频」，浏览器里会直接出现播放器。

- 合成方式：本机离线合成，用 Windows 自带的中文语音（Microsoft Huihui），不联网、不上传、不产生费用。
- 结构：一声柔和提示音 → 逐条念出今晚的事 → 条目之间留 2.6 秒停顿 → 结尾静默。
- 文件存放：`data\audio\cue_<会话ID>.wav`，通过 `/audio/...` 提供给页面播放。
- 只在清醒时、睡前播放。不做睡眠中的自动播放。
- 播放即记为「已播放」，次日晨收里可以回收。

接口：`POST /api/cue/{session_id}/audio`（返回文件路径、时长与条目）。

手动启动后端：

```
conda activate sleep-agent
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

接口文档：http://127.0.0.1:8000/docs

界面地址：http://127.0.0.1:8000/ （由后端直接托管构建产物）

## 前端

```
cd frontend
npm install
npm run build
```

构建产物在 `frontend\dist`，后端启动时会自动挂载。要用开发模式改界面，可以 `npm run dev`，
它会把 `/api` 转发到本机 8000 端口。

注意：本项目用 npm 安装前端依赖。pnpm 11 默认拦截 esbuild 的构建脚本，会导致 vite 无法运行。

## 当前进度

- 已完成：配置读取、SQLite 表结构、千问 客户端、消息抽取与入库、每日视图、梦境与夜醒碎片、睡前线索会话与次日回收、叙事生成、健康检查。
- 已完成：心潮接入（读取「此刻」状态、上报对话事件）、Vue3 前端四个入口、前端构建与后端托管。
- 已完成：记忆服务接入（MCP）、睡前线索音频生成与页面播放。
- 未开始：复诊摘要与脱敏导出、记忆自动打标问题、Web 体验打磨。

## 时间规则

- 一晚睡眠归到**醒来日期**。
- 「昨晚」「刚才」按消息到达时的时间解释。
- 未提供的字段留空，不推断入睡时间。
- 精度分三档：精确、估计、待确认。
