# 饮食拍照识别

饮食健康中「拍照识别」位于「添加饮食」左边。支持移动端拍照与 JPEG/PNG/WebP 上传，浏览器先压缩照片；照片只在请求中发送，不保存原图。结果需确认食物、做法和克数；调整克数会按每100克参考值重算，确认后使用现有账号健康记录存储保存。

在项目 private/.env 设置支持图片输入的千问模型接口，密钥只放服务器：

FOOD_VISION_API_KEY=你的服务密钥
FOOD_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/
FOOD_VISION_MODEL=qwen-vl-plus

也可复用已有 QWEN_API_KEY / QWEN_BASE_URL。若使用兼容服务，需确认其开通图片输入模型，并把 FOOD_VISION_MODEL 改成该服务实际提供的千问图像模型名称。普通聊天模型无法替代图像识别。

手机本机浏览器的拍照按钮可调用相机；桌面端可选择图片。相册照片格式不受支持时请转换为 JPEG 或 PNG。识别失败不创建记录。照片估计不能准确判断重量、油量、过敏原或食品是否安全。