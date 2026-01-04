<template>
  <el-container class="app-layout">
    
    <!-- <el-header class="app-header">
      <div class="header-left">
        <el-button 
          v-if="$route.path !== '/chat'" 
          link 
          :icon="ArrowLeft" 
          @click="$router.push('/chat')"
          style="margin-right: 8px; font-size: 16px;"
        />
        <div class="header-title">{{ currentTitle }}</div>
      </div>

      <div class="header-right">
        <el-button 
          v-if="$route.path === '/chat'" 
          :icon="Setting" 
          circle 
          plain
          @click="$router.push('/settings')"
          title="系统设置" 
        />
        <el-button 
          v-else 
          :icon="Close" 
          circle 
          plain
          @click="$router.push('/chat')"
          title="返回聊天"
        />
      </div>
    </el-header> -->
       <router-view />

  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()


onMounted(() => {
  chatStore.load()
  if (route.path === '/') {
    router.replace('/chat')
  }
})
</script>

<style>
/* 全局样式重置 */
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
</style>

<style scoped lang="scss">
/* 布局样式保持不变 */
.app-layout {
  height: 100vh;
  width: 100vw;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  height: 60px;
  flex-shrink: 0;
  background-color: #fff;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-title {
  font-weight: 700;
  font-size: 18px;
  color: #303133;
}

.app-main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e4e7ed;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}
</style>