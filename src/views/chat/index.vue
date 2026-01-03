<template>
  <div class="chat-layout">
    <el-card class="sidebar-card">
      <div class="sidebar-header">
        <div class="title">会话历史</div>
        <el-button type="primary" size="small" round @click="chat.newSession()">+ 新建</el-button>
      </div>

      <el-divider class="sidebar-divider" />

      <div class="session-list">
        <div
          v-for="s in chat.sessions"
          :key="s.id"
          @click="chat.setActive(s.id)"
          class="session-item"
          :class="{ active: s.id === chat.activeId }"
        >
          <div class="session-info">
            <div class="session-title">{{ s.title }}</div>
            <el-dropdown trigger="click" @command="(cmd: string) => onSessionCommand(cmd, s.id)">
              <el-button text size="small" class="more-btn">⋯</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rename">重命名</el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="danger-text">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="session-meta">{{ s.model }}</div>
        </div>
      </div>
    </el-card>

    <el-card class="main-card chat-area">
      <div class="message-container">
        <DynamicScroller
          class="msgScroller"
          ref="scrollerRef"
          :items="activeMessages"
          key-field="id"
          :min-item-size="64"
          :buffer="400"
        >
          <template #default="{ item, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.content]"
            >
              <div :class="['message-wrapper', item.role]">
                <div class="avatar-col">
                  <div class="role-badge">{{ roleLabel[item.role] ?? item.role }}</div>
                </div>
                <div class="content-col">
                  <MarkdownText 
                    v-if="item.role === 'assistant'" 
                    :content="item.content" 
                  />
                  <div v-else class="user-text">{{ item.content }}</div>
                </div>
              </div>
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
      </div>

      <div class="input-container">
        <div class="input-box">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 8 }"
            placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
            @keydown.enter.exact.prevent="send"
            resize="none"
          />
          <div class="action-bar">
            <div class="left-actions">
               <el-button circle size="small" :disabled="streaming" @click="clearChat" title="清空对话">
                  <el-icon><Delete /></el-icon>
               </el-button>
            </div>
            <div class="right-actions">
              <el-button v-if="streaming" type="danger" plain size="small" round @click="stop">停止生成</el-button>
              <el-button v-else type="primary" size="small" round :disabled="!input.trim()" @click="send">发送</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="sidebar-card settings-panel">
      <div class="sidebar-header">
        <div class="title">会话配置</div>
      </div>

      <el-form label-position="top" v-if="active" class="settings-form">
        <el-form-item label="使用的模型">
          <el-select v-model="active.model" class="w-100" filterable @change="onModelChange">
            <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>

        <el-form-item label="系统提示词 (System Prompt)">
          <el-input
            v-model="active.systemPrompt"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 10 }"
            placeholder="例如：你是一个资深的程序员助手..."
            @input="onSystemPromptInput"
          />
        </el-form-item>
      </el-form>

      <div v-if="active" class="export-actions">
        <el-button size="small" @click="exportMD">导出 MD</el-button>
        <el-button size="small" @click="exportJSON">导出 JSON</el-button>
      </div>
    </el-card>
  </div>

  <el-dialog v-model="renameOpen" title="重命名会话" width="400px" align-center>
    <el-input v-model="renameText" placeholder="输入新的会话标题" @keyup.enter="doRename" />
    <template #footer>
      <el-button @click="renameOpen=false">取消</el-button>
      <el-button type="primary" @click="doRename">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { exportSessionJSON, exportSessionMarkdown } from '@/utils/export'
import { ollamaChatOnce } from '@/services/ollama'
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ollamaChatStream, ollamaTags, type ChatMessage } from '@/services/ollama'
import { useChatStore } from '@/stores/chat'
// 引入新创建的 Markdown 组件
import MarkdownText from '@/components/MarkdownText.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'

const chat = useChatStore()
const roleLabel: Record<string, string> = { system: 'System', user: 'Me', assistant: 'AI' }
const input = ref('')
const streaming = ref(false)
let controller: AbortController | null = null
const modelOptions = ref<string[]>(['qwen2.5:3b'])

const active = computed(() => chat.activeSession)
const activeMessages = computed(() => active.value?.messages ?? [])

async function loadModels() {
  try {
    const data = await ollamaTags()
    const names = (data.models ?? []).map(x => x.name)
    if (names.length) modelOptions.value = names
  } catch {}
}
onMounted(loadModels)

function onModelChange(val: string) {
  if (!active.value) return
  chat.updateModel(active.value.id, val)
}

function onSystemPromptInput() {
  if (!active.value) return
  chat.updateSystemPrompt(active.value.id, active.value.systemPrompt)
}

function clearChat() {
  if (!active.value || streaming.value) return
  ElMessageBox.confirm('确定清空当前所有对话吗？', '提示').then(() => {
    chat.clearMessages(active.value!.id)
  })
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  if (!active.value) return

  const sid = active.value.id
  input.value = ''

  chat.pushMessage(sid, { role: 'user', content: text })
  chat.pushMessage(sid, { role: 'assistant', content: '' })
  const assistantIndex = chat.activeSession!.messages.length - 1

  streaming.value = true
  controller = new AbortController()

  // 构造发送给后端的消息列表
  const payload: ChatMessage[] = chat.activeSession!.messages.map(m => ({ role: m.role, content: m.content }))

  try {
    await ollamaChatStream({
      model: chat.activeSession!.model,
      messages: payload,
      signal: controller.signal,
      onToken(t) {
        // 更新 Pinia 中的状态，响应式更新 UI
        chat.activeSession!.messages[assistantIndex].content += t
      },
    })
    await autoRenameIfNeeded(sid)
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      chat.activeSession!.messages[assistantIndex].content += '\n\n[已停止生成]'
    } else {
      chat.activeSession!.messages[assistantIndex].content += `\n\n[Error] ${e?.message ?? String(e)}`
      ElMessage.error(e?.message ?? 'Request Failed')
    }
  } finally {
    streaming.value = false
    controller = null
  }
}

function stop() { controller?.abort() }

const renameOpen = ref(false)
const renameText = ref('')
let renameId = ''

function onSessionCommand(cmd: string, id: string) {
  if (cmd === 'rename') {
    const s = chat.sessions.find(x => x.id === id)
    renameId = id
    renameText.value = s?.title ?? ''
    renameOpen.value = true
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确认删除该会话？', '提示', { type: 'warning' }).then(() => chat.removeSession(id))
  }
}

function isDefaultTitle(t: string) { return t === '新会话' || t === '未命名会话' || !t?.trim() }

function cleanTitle(raw: string) {
  let s = raw.trim().replace(/^["“”'《》]+|["“”'《》]+$/g, '').replace(/\s+/g, ' ').replace(/[。！？!?,，.]+$/g, '')
  if (s.length > 20) s = s.slice(0, 20)
  return s
}

async function autoRenameIfNeeded(sessionId: string) {
  const s = chat.sessions.find(x => x.id === sessionId)
  if (!s || !isDefaultTitle(s.title)) return
  
  const msgs = s.messages.filter(m => m.role !== 'system')
  // 只有当至少有一轮对话时才重命名
  if (msgs.length < 2) return 

  const firstUser = msgs.find(m => m.role === 'user')?.content ?? ''
  const firstAssistant = msgs.find(m => m.role === 'assistant')?.content ?? ''
  
  try {
    const title = await ollamaChatOnce({
      model: s.model,
      messages: [
        { role: 'system', content: '你是一个标题生成器。请用一个极其简短的中文标题概括对话（10字以内）。不要加任何标点符号。' },
        { role: 'user', content: `用户说：${firstUser}\nAI回复：${firstAssistant}` },
      ],
    })
    const finalTitle = cleanTitle(title)
    if (finalTitle) chat.setTitle(sessionId, finalTitle)
  } catch {}
}

function doRename() {
  chat.renameSession(renameId, renameText.value)
  renameOpen.value = false
}

function exportMD() { if (active.value) exportSessionMarkdown(active.value) }
function exportJSON() { if (active.value) exportSessionJSON(active.value) }

const scrollerRef = ref<any>(null)

// 滚动到底部逻辑优化
function scrollToBottom() {
  nextTick(() => {
    const scroller = scrollerRef.value
    if (scroller) {
      scroller.scrollToBottom() // vue-virtual-scroller 自带的方法，比手动操作 DOM 更稳
    }
  })
}

// 监听消息数量变化，滚动到底部
watch(() => activeMessages.value.length, () => scrollToBottom())

// 监听正在生成时的最后一条消息变化（可选：如果不想每次 token 都滚，可以节流，但这里先保留）
watch(() => activeMessages.value.at(-1)?.content, () => { 
  if (streaming.value) scrollToBottom() 
})

watch(() => chat.activeId, () => scrollToBottom(), { immediate: true })
</script>

<style scoped lang="scss">
/* 布局容器 */
.chat-layout {
  display: flex;
  gap: 12px;
  height: calc(100vh - 120px);
  overflow: hidden;
  background-color: #f5f7fa;
  padding: 12px;
}

/* 卡片通用样式 */
.sidebar-card, .main-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-card {
  width: 280px;
  
  :deep(.el-card__body) {
    padding: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.main-card {
  flex: 1;
  
  :deep(.el-card__body) {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.settings-panel {
  width: 300px;
}

/* 侧边栏元素 */
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  
  .title {
    font-weight: 700;
    font-size: 16px;
  }
}

.sidebar-divider {
  margin: 16px 0;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

/* 会话项 */
.session-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover { background: #f0f2f5; }
  
  &.active {
    background: #ffffff;
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .session-info {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
  }

  .session-title {
    font-weight: 500;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
  }
  
  .session-meta {
    font-size: 11px;
    opacity: .5;
    margin-top: 4px;
    font-family: monospace;
  }
  
  .more-btn {
    padding: 2px 6px;
    height: auto;
  }
}

.danger-text {
  color: var(--el-color-danger);
}

/* 消息区域 */
.message-container {
  flex: 1;
  min-height: 0;
  background-color: #fff;
}

.msgScroller {
  height: 100%;
}

.message-wrapper {
  padding: 24px 32px;
  display: flex;
  gap: 16px;
  transition: background 0.2s;
  border-bottom: 1px solid #f2f2f2;

  &.user { 
    background: #fafafa; 
  }
  &.assistant { 
    background: #fff; 
  }
  
  .avatar-col {
    width: 40px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .content-col {
    flex: 1;
    min-width: 0; /* 防止 Markdown 撑开容器 */
  }
}

.role-badge {
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  color: #909399;
  background: #f0f2f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.user-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

/* 输入框区域 */
.input-container {
  padding: 20px 32px;
  background: #fff;
  border-top: 1px solid #eee;
}

.input-box {
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 8px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transition: border-color 0.3s;
  
  &:focus-within {
    border-color: var(--el-color-primary);
  }
  
  :deep(.el-textarea__inner) {
    border: none;
    box-shadow: none;
    padding: 8px;
    font-size: 14px;
    background: transparent;
  }
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding: 0 4px;
}

/* 设置面板 */
.w-100 { width: 100%; }
.settings-form { margin-top: 10px; }
.export-actions {
  display: flex; 
  gap: 8px; 
  margin-top: 20px;
  
  .el-button { flex: 1; }
}
</style>