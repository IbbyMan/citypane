<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 窗中城 CityPane

一扇在浏览器里共同打开的城市窗口，和远方的人分享同一片随时间与天气变化的窗边景色。

</div>

## 项目说明

本项目的**雏形**由 [Google AI Studio](https://aistudio.google.com/) 生成，使用 **Gemini Imagen 2.5** 模型进行图像生成，画面质感较为出色。

后续通过 **CodeBuddy** 进行功能完善、UI 优化和部署上线，图像生成切换为免费开源的 **Flux**（via Pollinations.ai），因此在线版本的生图质感与 AI Studio 版本略有差异。

如需体验更好的生图效果，可在 AI Studio 中查看原版：  
https://ai.studio/apps/drive/1B3cWVCv7KYE8R-Zv9WN5_eiPT2d9lJo1

## 功能特性

- 🌍 支持全球多个城市的实时天气与时间
- 🎨 像素风格的城市窗景生成
- 🌦️ 天气动态效果（雨、雪、雾等）
- 🎵 沉浸式环境音效
- 📱 响应式设计，支持移动端

## 本地运行

**前置条件：** Node.js

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 技术栈

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Pollinations.ai (Flux 模型)
