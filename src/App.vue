<template>
  <el-container style="height: 100%;">
    <el-aside width="220px" style="border-right:1px solid var(--el-border-color);">
      <div style="padding:14px 12px;font-weight:700;">AI 对话平台</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/chat">聊天</el-menu-item>
        <el-menu-item index="/prompts">模板库</el-menu-item>
        <el-menu-item index="/models">模型管理</el-menu-item>
        <el-menu-item index="/settings">设置</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="display:flex;align-items:center;border-bottom:1px solid var(--el-border-color);">
        <div style="font-weight:700;">{{ titleMap[$route.path] ?? 'AI 对话平台' }}</div>
      </el-header>
      <el-main style="padding:12px;">
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
onMounted(() => chatStore.load())
</script>
