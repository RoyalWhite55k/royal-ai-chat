<template>
  <div class="settings-container">
    <el-card class="settings-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">系统设置</span>
          <span class="subtitle">配置模型参数与个人偏好</span>
        </div>
      </template>

      <el-form label-position="top" class="settings-form">
        
        <div class="section-title">个人偏好</div>
        <el-form-item label="用户昵称">
          <el-input 
            v-model="settings.userNickname" 
            placeholder="例如：主人、老板、阿祖..." 
            maxlength="20"
            show-word-limit
          />
          <div class="tips">AI 在对话中可能会使用这个名字来称呼你。</div>
        </el-form-item>

        <el-divider />

        <div class="section-title">模型服务商</div>
        <el-form-item>
          <el-radio-group v-model="settings.modelProvider">
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
            title="部分服务暂时不可用"
            type="warning"
            show-icon
            :closable="false"
            style="margin-bottom: 20px"
          >
            <template #default>
              <div style="line-height: 1.5">
                目前 <b>OpenAI</b> 和 <b>Google (Gemini)</b> 暂不可用，后续版本或将进行修复。
                <br/>
                建议优先使用 <b>DeepSeek</b> 或 <b>SiliconFlow (硅基流动)</b> 等国内稳定服务。
              </div>
            </template>
          </el-alert>

          <el-form-item label="API Base URL">
            <el-input v-model="settings.cloudBaseUrl" placeholder="https://api.deepseek.com">
              <template #prefix>🌐</template>
            </el-input>
            <div class="tips">例如: https://api.deepseek.com</div>
          </el-form-item>

          <el-form-item label="API Key">
            <el-input 
              v-model="settings.cloudApiKey" 
              type="password" 
              show-password 
              placeholder="sk-xxxxxxxxxxxxxxxx"
            >
              <template #prefix>🔑</template>
            </el-input>
            <div class="tips">密钥仅存储在本地浏览器，不会上传。</div>
          </el-form-item>

          <el-form-item label="云端模型名称 (Model Name)">
            <el-input v-model="settings.cloudModelName" placeholder="例如: deepseek-chat, gpt-4o" />
             <div class="tips">请填写服务商提供的具体模型 ID。</div>
          </el-form-item>
        </template>

        <el-divider />

        <div class="section-title">参数微调</div>
        
        <el-form-item label="默认随机性 (Temperature)">
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

        <el-form-item label="全局系统预设 (System Prompt)">
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import { ollamaTags } from '@/services/ollama'

const chat = useChatStore()
// 使用 storeToRefs 保持响应性，修改表单会自动同步到 Pinia 和 LocalStorage
const { settings } = storeToRefs(chat)

const modelOptions = ref<string[]>([])

// 获取模型列表
async function refreshModels(visible: boolean) {
  if (!visible && modelOptions.value.length > 0) return 
  try {
    const data = await ollamaTags()
    modelOptions.value = (data.models ?? []).map(x => x.name)
    
    // 自动修正：如果当前选中的模型不在列表里，且列表不为空，默认选第一个
    if (!modelOptions.value.includes(settings.value.defaultModel) && modelOptions.value.length > 0) {
      settings.value.defaultModel = modelOptions.value[0]
    }
  } catch (e) {
    console.error('Failed to load models:', e)
  }
}

// 页面加载时自动获取一次模型
onMounted(() => {
  if (settings.value.modelProvider === 'local') {
    refreshModels(true)
  }
})
</script>

<style scoped lang="scss">
/* ✨ 修复重点：让容器占满高度并处理滚动 */
.settings-container {
  height: 100%;          /* 填满 router-view 的高度 */
  overflow-y: auto;      /* 开启垂直滚动 */
  padding: 12px;
  background-color: #f5f7fa; /* 确保背景色统一 */

  /* ✨ 补回漂亮的滚动条样式 */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }
  &::-webkit-scrollbar-track { background: transparent; }
}

.settings-card {
  border-radius: 12px;
  /* ✨ 将居中逻辑移到这里，这样滚动条会在屏幕最右边，而不是卡片边缘 */
  max-width: 800px;
  margin: 0 auto;

  :deep(.el-card__header) {
    padding: 16px 24px;
  }
}

.card-header {
  display: flex;
  flex-direction: column;
  .title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
  .subtitle {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  border-left: 3px solid var(--el-color-primary);
  padding-left: 8px;
}

.settings-form {
  padding: 0 12px;
}

.tips {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 6px;
}

.slider-block {
  display: flex;
  align-items: center;
  width: 100%; /* 强制占满宽度 */
  
  :deep(.el-slider) {
    flex: 1; /* 让滑块占据剩余空间 */
    margin-right: 12px; /* 给右侧可能存在的元素留白 */
  }
}
</style>