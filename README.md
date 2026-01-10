

一个功能完备的前端 AI 聊天应用，专为**极致的对话体验**而设计。

- ✅ 支持云端模型：DeepSeek /  Siliconflow
- ✅ 深度适配本地 Ollama：离线运行大模型，隐私更安全、成本更低
- ✅ 流式响应（打字机效果）/ Markdown 渲染 / 代码高亮 / 语音输入&朗读
- ✅ 移动端深度适配：抽屉式导航、防遮挡优化
- ✅ 性能优化：虚拟滚动，千条对话依旧丝滑

---

##  Features

###  双模态模型架构

- **Local**：支持本地运行 Llama3、Mistral 等模型，零成本、无速率限制、隐私安全  
- **Cloud**：轻松接入 DeepSeek-V3/R1 等高性能云端模型  

###  极致对话体验

- **流式响应（Streaming）**：基于 Fetch API 处理 SSE 数据流，实现打字机效果  
- **Markdown 渲染**：支持代码块高亮、数学公式（KaTeX）、表格等  
- **语音交互**：集成 Web Speech API，支持语音输入（STT）与文本朗读（TTS）  

###  全端响应式设计

- **桌面端**：可折叠侧边栏，宽屏沉浸式体验  
- **移动端**：抽屉式导航、遮罩交互

###  性能优化

- **虚拟滚动**：引入 `vue-virtual-scroller`，渲染不卡顿  
- **轻量化**：基于 Vite 构建，极速启动与打包  

---

##  Tech Stack

- **核心框架**：Vue 3 + TypeScript  
- **构建工具**：Vite  
- **状态管理**：Pinia（配合 `pinia-plugin-persistedstate`）  
- **UI 组件库**：Element Plus  
- **样式**：SCSS + CSS Variables（深色模式主题系统）  
- **核心依赖**：
  - `markdown-it`：Markdown 解析  
  - `highlight.js`：代码高亮  
  - `vue-virtual-scroller`：虚拟列表高性能渲染  
  - `lodash`：防抖与节流优化  

---

##  Quick Start

### 1) 克隆项目

```bash
git clone https://github.com/RoyalWhite55k/royal-ai-chat.git
cd royal-ai-chat
```

### 2) 安装依赖

```bash
# 推荐使用 pnpm 或 npm
npm install
```

### 3) 启动开发服务器

```bash
npm run dev
```

打开浏览器访问：

```text
http://localhost:5173
```

---

##  模型配置指南

### 方式一：使用云端模型

1. 进入项目设置页面（Settings）
2. 选择 **Cloud** 模式
3. 填入 **API Key** 与 **Base URL**

**DeepSeek 示例**

- URL：`https://api.deepseek.com`
- Model：`deepseek-chat`

---

### 方式二：使用本地 Ollama

1. 下载并安装 Ollama  
2. 拉取一个模型，例如 Llama3：

```bash
ollama run llama3
```


```sh
npm run build
```
