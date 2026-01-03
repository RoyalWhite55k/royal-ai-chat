<template>
  <el-container class="app-layout">
    
    <el-aside width="220px" class="app-sidebar">
      <div style="padding:14px 12px; font-weight:700; font-size: 16px;">AI 对话平台</div>
      <el-menu router :default-active="$route.path" style="border-right: none;">
        <el-menu-item index="/chat">聊天</el-menu-item>
        <el-menu-item index="/settings">设置</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="right-container">
      <el-header class="app-header">
        <div style="font-weight:700;">{{ titleMap[$route.path] ?? 'AI 对话平台' }}</div>
      </el-header>
      
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>

  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
const chatStore = useChatStore()
const titleMap: Record<string, string> = {
  '/chat': '聊天',
  '/prompts': 'Prompt 模板库',
  '/models': '模型管理',
  '/settings': '设置',
}
onMounted(() => {
  chatStore.load()
})
</script>

<style>
/* 全局样式重置：确保 html/body 没有默认 margin 且占满高度 */
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden; /* 禁止浏览器最外层滚动 */
}
</style>

<style scoped lang="scss">
.app-layout {
  height: 100vh; /* 强制占满屏幕高度 */
  width: 100vw;
  overflow: hidden;
}

.app-sidebar {
  border-right: 1px solid var(--el-border-color);
  background-color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.right-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止 header 被卷走 */
}

.app-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color);
  height: 60px; /* 固定头部高度 */
  flex-shrink: 0;
  background-color: #fff;
}

.app-main {
  flex: 1;
  padding: 12px;
  overflow-y: auto; 
  background-color: #f5f7fa; 

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e4e7ed;
    border-radius: 3px;
  }
}
</style>