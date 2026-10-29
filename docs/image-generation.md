# 梦境画面生成

在 `private/.env` 中配置以下服务端变量，然后重启后端：

```dotenv
IMAGE_API_KEY=你的图像服务密钥
IMAGE_BASE_URL=https://你的服务地址/v1
IMAGE_MODEL=你的图像模型名称
```

服务需兼容 `POST /images/generations`，支持 `response_format=b64_json` 和 `1024x1024`。密钥不放入前端环境变量。未配置时页面会明确提示，不使用示例图替代生成结果。

进入 `/capture`，描述画面并点击生成。图片压缩后与快照保存在当前浏览器，受浏览器存储容量限制。
