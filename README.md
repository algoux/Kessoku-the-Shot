<img src="./resources/icon.png" style="height: 48px" />
<div style="width: 100vw; height: 60px;  display: flex; justify-content: start; align-items: center; gap: 10px">
    <img src="./public/Vue@128.png" style="height: 48px" />
    <img src="./public/capacitor@128.png" style="height: 48px" />
    <img src="./public/typescript@128.png" style="height: 48px" />
</div>

# Kessoku the Shot 
> 专注于**算法竞赛直播**的移动机位推流 app

## 🛠️ 技术栈
- vue 3.2
- capacitor
- typescript

## 📦️ 环境准备
- nodeJS >= 22 
- pnpm >= 8

## 🚀 快速开始

### 依赖安装
```bash
pnpm run init
```

### 启动开发

由于移动端启动依赖 Android Simulator / iOS Simulator 等沙盒环境，所以想要在虚拟机内预览，需要配置 vite 开放局域网访问。
但是 `navigator.mediaDevices` 会将局域网环境认定为不安全的上下文，会自动将其值设置为 `undefined` ，所以想要在开发环境下使用 vite 的热更新机制，需要在浏览器环境中访问 localhost 进行预览。

启动 vite 服务器
```bash
pnpm dev:web
```

浏览器访问 <http://localhost:5173>，并打开 Dev Tools 预览移动端设备。

### 生产环境预览

确保你安装好了 Xcode 以及 Android Studio 开发移动端所需的依赖。

```bash
# android 
pnpm start:android

# ios
pnpm start:ios
```