<template>
  <div class="settings-container">
    
    <div class="settings-nav">
      <el-button link @click="router.back()">
        <el-icon :size="20"><ArrowLeft /></el-icon>
        <span style="margin-left: 4px; font-weight: 500">返回</span>
      </el-button>
    </div>

    <div class="settings-content-wrapper">
      <el-card class="settings-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="title none-select">系统设置</span>
          </div>
        </template>

        <el-form :model="settings" label-position="top" class="settings-form">
          
          <div class="section-title none-select">个人偏好</div>
          <el-form-item class="none-select" label="用户昵称">
            <el-input 
              v-model="settings.userNickname" 
              placeholder="例如：主人、老板、阿祖..." 
              maxlength="20"
              show-word-limit
            />
            <div class="tips none-select">AI 在对话中可能会使用这个名字来称呼你。</div>
          </el-form-item>

          <el-divider />

          <div class="section-title none-select">模型服务商</div>
          <el-form-item>
            <el-radio-group v-model="settings.modelProvider" class="provider-group">
              <el-radio-button label="local">Local (Ollama)</el-radio-button>
              <el-radio-button label="cloud">Cloud</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <template v-if="settings.modelProvider === 'local'">
            <el-form-item label="Ollama 服务地址">
              <el-input v-model="settings.ollamaUrl" placeholder="http://localhost:11434">
                <template #prefix>🔗</template>
              </el-input>
            </el-form-item>

            <el-form-item label="默认模型 (Default Model)">
              <el-select 
                v-model="settings.defaultModel" 
                placeholder="请选择模型" 
                style="width: 100%"
                @visible-change="refreshModels"
              >
                <el-option 
                  v-for="m in modelOptions" 
                  :key="m" 
                  :label="m" 
                  :value="m" 
                />
              </el-select>
              <div class="tips">新建会话时将默认使用此模型。</div>
            </el-form-item>
          </template>

          <template v-if="settings.modelProvider === 'cloud'">
            <el-alert
              title=""
              type="warning"
              show-icon
              :closable="false"
              style="margin-bottom: 20px"
            >
              <template #default>
                <div style="line-height: 1.5">
                  建议优先使用 <b><a href="https://platform.deepseek.com/" target="_blank">DeepSeek</a></b> 或 <b><a href="https://siliconflow.cn" target="_blank">SiliconFlow (硅基流动)</a></b> 等国内稳定服务。
                </div>
              </template>
            </el-alert>

            <el-form-item class="none-select" label="API Base URL">
              <el-input v-model="settings.cloudBaseUrl" placeholder="https://api.deepseek.com">
                <template #prefix>🌐</template>
              </el-input>
              <div class="tips">例如: https://api.deepseek.com</div>
            </el-form-item>

            <el-form-item class="none-select" label="API Key">
              <el-input 
                v-model="settings.cloudApiKey" 
                type="password" 
                show-password 
                placeholder="sk-xxxxxxxxxxxxxxxx"
              >
                <template #prefix>🔑</template>
              </el-input>
              <div class="tips none-select">密钥仅存储在本地，不会上传。</div>
            </el-form-item>

            <el-form-item class="none-select" label="云端模型名称 (Model Name)">
              <el-input v-model="settings.cloudModelName" placeholder="例如: deepseek-chat, gpt-4o" />
               <div class="tips">请填写服务商提供的具体模型 ID。</div>
            </el-form-item>
          </template>

          <el-divider />

          <div class="section-title none-select">参数微调</div>
          
          <el-form-item class="none-select" label="默认随机性 (Temperature)">
            <div class="slider-block">
              <el-slider 
                v-model="settings.defaultTemperature" 
                :min="0" 
                :max="1" 
                :step="0.1" 
                show-input
              />
            </div>
            <div class="tips">
              值越低 (0.1) 越严谨逻辑；值越高 (0.9) 越有创意和发散性。
            </div>
          </el-form-item>

          <el-form-item class="none-select" label="全局系统预设 (System Prompt)">
            <el-input 
              v-model="settings.defaultSystemPrompt" 
              type="textarea" 
              :rows="5"
              placeholder="例如：你是一个资深的程序员助手..."
            />
            <div class="tips">这决定了 AI 的基础性格。修改后仅对新创建的会话生效。</div>
          </el-form-item>

        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router' 
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import { ollamaTags } from '@/services/ollama'
import { ArrowLeft } from '@element-plus/icons-vue' 

const router = useRouter()
const chat = useChatStore()
const { settings } = storeToRefs(chat)

const modelOptions = ref<string[]>([])

async function refreshModels(visible: boolean) {
  if (!visible && modelOptions.value.length > 0) return 
  try {
    const data = await ollamaTags()
    modelOptions.value = (data.models ?? []).map(x => x.name)
    if (!modelOptions.value.includes(settings.value.defaultModel) && modelOptions.value.length > 0) {
      settings.value.defaultModel = modelOptions.value[0]
    }
  } catch (e) {
    console.error('Failed to load models:', e)
  }
}

onMounted(() => {
  if (settings.value.modelProvider === 'local') {
    refreshModels(true)
  }
})
</script>

<style scoped lang="scss">
  /* 基础 A 标签样式 */
  a {
    color: inherit;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    cursor: pointer;
    box-sizing: border-box;
  }

  a:visited { color: inherit; }
  a:hover { text-decoration: none; color: #165DFF; }
  a:active { text-decoration: none; color: inherit; }
  a:focus { outline: none; }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  /* CSS 变量定义 (本页面独立管理) */
  :global(:root) {
    /* 浅色模式变量 */
    --set-bg-page: #f5f7fa;      /* 页面大背景：浅灰 */
    --set-bg-card: #ffffff;      /* 卡片背景：纯白 */
    --set-bg-header: #ffffff;    /* 导航栏背景：纯白 */
    
    --set-text-main: #303133;    /* 主文字 */
    --set-text-sub: #909399;     /* 次要文字 */
    
    --set-border-color: #ebeef5; /* 浅色分割线 */
    --set-card-border: #e4e7ed;  /* 卡片边框 */
    
    --set-scrollbar-bg: transparent;
    --set-scrollbar-thumb: #dcdfe6;
  }

  :global(html.dark) {
    /* 深色模式变量 */
    --set-bg-page: #121212;      
    --set-bg-card: #1e1e1e;      
    --set-bg-header: #1e1e1e;    
    
    --set-text-main: #ffffff;    
    --set-text-sub: #a0a0a0;     
    
    --set-border-color: #333333; 
    --set-card-border: #333333;  
    
    --set-scrollbar-thumb: #444;
  }

  /* --- 页面布局 --- */
  .settings-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--set-bg-page);
    overflow-y: auto; 
    overflow-x: hidden; /* 防止页面级横向滚动 */
    transition: background-color 0.3s;
  }

  /* --- 顶部导航 --- */
  .settings-nav {
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    background-color: var(--set-bg-header);
    border-bottom: 1px solid var(--set-border-color);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 10;
    
    .el-button { color: var(--set-text-main); }
    span { color: var(--set-text-main); }
  }

  /* --- 内容包裹 --- */
  .settings-content-wrapper {
    padding: 20px;
    display: flex;
    justify-content: center;
    width: 100%; /* 确保不溢出 */
    box-sizing: border-box; /* 关键：padding包含在宽度内 */
  }

  /* --- 卡片样式 --- */
  .settings-card {
    width: 100%;
    max-width: 800px;
    /* 修复：这里可以移除 max-width 的 min 计算，因为外层 wrapper 已经控制了 padding */
    box-sizing: border-box;
    overflow: hidden; /* 防止子元素溢出圆角 */
    border-radius: 12px;
    
    background-color: var(--set-bg-card);
    border: 1px solid var(--set-card-border);
    
    :deep(.el-card__header) {
      padding: 16px 24px;
      border-bottom: 1px solid var(--set-border-color);
    }
    
    :deep(.el-card__body) {
      padding: 24px;
      /* 这里加 overflow 可以防止内部某些组件（如 slider）溢出 */
      overflow: hidden; 
    }
  }

  .card-header {
    display: flex;
    flex-direction: column;
  }

  .settings-form {
    padding: 0; /* 移除额外的 padding，交给 card body */
    
    .title { 
      font-size: 18px; font-weight: 600; display: block; margin-bottom: 4px; 
      color: var(--set-text-main);
    }
    .subtitle { 
      font-size: 12px; display: block; 
      color: var(--set-text-sub);
    }
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 16px;
    border-left: 3px solid var(--el-color-primary);
    padding-left: 8px;
    color: var(--set-text-main);
  }

  .provider-group {
    width: 100%;
    :deep(.el-radio-button__inner) { width: 100%; padding: 10px 20px; }
    :deep(.el-radio-button) { flex: 1; display: flex; }
  }

  .tips {
    font-size: 12px;
    line-height: 1.4;
    margin-top: 6px;
    color: var(--set-text-sub);
  }

  .slider-block {
    display: flex;
    align-items: center;
    width: 100%;
    /* 修复：给 slider 右侧留一点 buffer，防止滑块阴影溢出 */
    padding-right: 5px; 
    
    :deep(.el-slider) { 
      flex: 1; 
      margin-right: 12px; 
    }
  }

  /* 滚动条美化 */
  .settings-container::-webkit-scrollbar { width: 6px; }
  .settings-container::-webkit-scrollbar-thumb { background: var(--set-scrollbar-thumb); border-radius: 3px; }
  .settings-container::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }
  .settings-container::-webkit-scrollbar-track { background: var(--set-scrollbar-bg); }

  .link-colorful { color: #333; }
  .link-colorful:hover { color: #165DFF; font-weight: 500; }

  none-select {
    -webkit-user-select: none; /* Safari */
    -moz-user-select: none;    /* Firefox */
    -ms-user-select: none;     /* IE10+/Edge */
    user-select: none;         /* Standard */
  }
</style>