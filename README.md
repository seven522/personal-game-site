# 小小游戏屋

使用 HTML、CSS、JavaScript 和 Node.js 构建的个人 Godot 游戏展示与下载网站。无需安装 npm 依赖。

## 启动

安装 Node.js 24 或更新版本，然后运行：

```sh
npm start
```

打开 http://127.0.0.1:8080 。Windows 也可双击 `启动网站.cmd`。

## 配置作品

编辑 `public/site-config.js`，填写工作室名称、游戏名称、介绍、版本和联系邮箱。

安装包放入 `public/downloads/`，例如 Windows 下载地址填写 `downloads/my-game.zip`，Android 填写 `downloads/my-game.apk`。空地址会显示尚未开放下载。安装包默认不进入 Git 历史，可单独分发或使用 Releases。

截图放入 `public/images/`，在 screenshots 数组中填写相对路径。

当前内容和封面是示例素材，并非真实游戏实机画面。

## 公网访问

服务默认仅监听本机回环地址。可用独立内网穿透客户端转发至 `127.0.0.1:8080`。

`tools/` 为本机专用工具和授权配置目录，已排除出版本控制。仓库不包含 cpolar 客户端、授权码、连接日志及临时公网地址。首次在新电脑使用穿透功能时，需要自行从官网下载客户端并完成授权；启动公网脚本依赖本机工具安装位置。

网站和穿透客户端须持续运行。只将可公开的网站素材放入 public，不要存入个人或业务资料。
