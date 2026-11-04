# Ubuntu 运行说明

本项目的默认启动方式面向个人电脑本地运行。下载代码后不需要固定安装目录、Conda、Docker 或 MySQL。

## 本机快速启动

安装 Python 3.12（最低 3.10）、python3-venv 和 Node.js 当前 LTS（最低 22.12，含 npm）。在解压后的项目根目录执行：

```sh
sh start.sh
```

脚本自动创建项目内虚拟环境、安装 Python 与 npm 依赖、构建页面，并启动两个本机服务：8000 提供花屿星页面及 API；3001 提供安全页面、共享账号和健康与心理记录。首次运行需联网；之后没有源码或依赖变化时跳过安装与构建。

打开 http://127.0.0.1:8000/entry 。首次全新本地安装的演示账号见根目录 README。按 Ctrl+C 停止。

仅安装不启动：`python3 scripts/launch.py --setup-only`。不自动打开浏览器：`sh start.sh --no-browser`。记录存储在项目内 data/，不要把这个目录或 private/.env 随代码分享。

## 公网部署

本地快速启动不等于公网部署：当前页面通过本机 3001 端口连接共享账号服务。仅用 Nginx 代理 8000 会遗漏账号、安全页面和记录服务，远程访客无法完整使用。旧的仅启动 uvicorn 的部署步骤已移除。

如需公网部署，需要另行配置统一域名下的账号服务代理、前端服务地址、可信来源和 HTTPS，并完善花屿星原有 SQLite 接口的多用户隔离。可选 AI / MySQL 配置参见根目录 README 和 LOCAL-WORKSPACES.md。
