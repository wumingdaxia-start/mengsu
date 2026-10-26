# Ubuntu 服务器部署（Nginx + systemd）

以下步骤适用于 Ubuntu 22.04/24.04 VPS。FastAPI 在本机 127.0.0.1:8000 同时提供 API 和 frontend/dist 静态页面，Nginx 负责 HTTPS 与公网入口。无需单独运行 Vite 开发服务器。

## 1. 准备服务器

为域名配置 A/AAAA 记录指向服务器，并在云防火墙放行 SSH、HTTP (80)、HTTPS (443)。不要把 8000 端口直接开放到公网。

~~~bash
sudo apt update
sudo apt install -y git nginx python3 python3-venv python3-pip nodejs npm
~~~

建议使用 Node.js 20 或更新 LTS 版本。若 Ubuntu 软件源中的 Node.js 版本太旧，请按 Node.js 官方安装说明安装 LTS。

## 2. 拉取项目、配置密钥并构建

~~~bash
sudo mkdir -p /opt/mengsu
sudo chown "$USER":"$USER" /opt/mengsu
git clone https://github.com/zkmluck/mengsu.git /opt/mengsu
cd /opt/mengsu

python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

cp private/.env.example private/.env
nano private/.env
~~~

在 private/.env 中填入服务器自己的 QWEN_API_KEY。如不需要 AI，可先留空；不要把真实密钥提交到 Git。然后构建前端：

~~~bash
cd /opt/mengsu/frontend
npm ci
npm run build
~~~

## 3. 创建 systemd 服务

~~~bash
sudo tee /etc/systemd/system/mengsu.service >/dev/null <<'EOF'
[Unit]
Description=Mengsu health journal API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/mengsu/backend
ExecStart=/opt/mengsu/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo chown -R www-data:www-data /opt/mengsu/data
sudo chmod 600 /opt/mengsu/private/.env
sudo chown www-data:www-data /opt/mengsu/private/.env
sudo systemctl daemon-reload
sudo systemctl enable --now mengsu
sudo systemctl status mengsu --no-pager
~~~

服务用户需要写入 data/（SQLite、附件与导出）；代码目录保持只读即可。部署更新后若重建目录或文件，确认 data/ 仍归 www-data 所有。

检查：

~~~bash
curl http://127.0.0.1:8000/api/health
~~~

## 4. 配置 Nginx

把 dream.example.com 换成自己的域名：

~~~bash
sudo tee /etc/nginx/sites-available/mengsu >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name dream.example.com;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/mengsu /etc/nginx/sites-enabled/mengsu
sudo nginx -t
sudo systemctl reload nginx
~~~

启用 HTTPS：

~~~bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dream.example.com
~~~

然后打开 https://dream.example.com/entry。

## 5. 后续更新

~~~bash
cd /opt/mengsu
sudo -u "$USER" git pull --ff-only
cd frontend && npm ci && npm run build
sudo chown -R www-data:www-data /opt/mengsu/data
sudo systemctl restart mengsu
sudo systemctl reload nginx
~~~

查看服务日志：

~~~bash
sudo journalctl -u mengsu -n 100 --no-pager
sudo journalctl -u mengsu -f
~~~

## 部署前请了解

- 当前登录是演示用本地会话，不是生产级账户认证；后端还没有多用户权限隔离。不要直接用于存放多人真实健康档案或向公网开放敏感数据。
- 个人档案、主观感受滑条和挑战打卡保存在浏览器本地；换设备不会自动同步。
- SQLite 文件及上传数据位于 /opt/mengsu/data/，应定期做离线备份，并限制备份访问权限。
- 外部心潮、记忆服务不是基础网页运行的必需项。AI 功能需要有效 API 配置；请勿让可选服务监听公网地址。
- 生产环境建议在开放给他人使用之前补齐真实认证、授权、多用户数据隔离、备份恢复和安全审查。
