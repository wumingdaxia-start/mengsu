# 本地工作区

花屿的原始安全页面源码已收录到 `services/safety/`，包括原账号页面资源。无需作者电脑上的任何文件夹。

`start.cmd` / `sh start.sh` 统一启动花屿星（8000）和安全账号服务（3001），并等待接口就绪。关闭启动终端或按 Ctrl+C 停止。

三个空间共用安全服务的 HttpOnly 登录 cookie。健康档案、运动饮食睡眠和心理测试，默认存储在 `data/safety/`；花屿星原有记录使用 `data/mengsu.db`。本地记录不会提交到 Git。不要把旧 `data/`、`private/.env`、`.venv/`、`node_modules/` 发给其他人。

MySQL 为可选持久化后端：在 `private/.env` 设置 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`，先由数据库管理员创建对应数据库并授权；服务自动建表。不会自动启动或读取作者电脑的 MySQL 安装和配置。已有数据不自动迁移，切换存储前需备份。

可通过 `MENGSU_SAFETY_ROOT` 显式指定其他兼容安全服务源码；默认使用仓库内目录。AI、天气需访问相应外部接口；未配置 AI 不影响普通记录功能。长期记忆和心潮是高级可选服务，默认启动不依赖它们。

若自行启用 MCP 长期记忆，在项目虚拟环境运行 `python -m pip install -r requirements-memory.txt`；普通使用无需安装。

验证账号、记录与心理结果的独立持久化：`npm test --prefix services/safety`。测试使用临时目录，不写入日常数据。
