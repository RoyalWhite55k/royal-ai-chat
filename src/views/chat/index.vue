<template>
  <div class="chat-layout">
    
    <div 
      class="sidebar-container" 
      :class="{ 'is-collapsed': isSidebarCollapsed }"
    >
      <div class="sidebar-header">
        <div class="logo-area" v-show="!isSidebarCollapsed">
          <span class="logo-text">AI Chat</span>
        </div>
        <el-button 
          link 
          class="toggle-btn" 
          @click="toggleSidebar"
        >
          <el-icon :size="20">
            <component :is="isSidebarCollapsed ? Expand : Fold" />
          </el-icon>
        </el-button>
      </div>

      <div class="action-area">
        <el-tooltip content="新建会话" placement="right" :disabled="!isSidebarCollapsed">
          <el-button 
            type="primary" 
            :class="{ 'is-icon-only': isSidebarCollapsed }" 
            round 
            block 
            @click="chat.newSession()"
          >
            <span v-if="!isSidebarCollapsed" style="white-space: nowrap;">+ 新建会话</span>
            <span v-else>+</span>
          </el-button>
        </el-tooltip>
      </div>

      <div class="session-list-scroll" v-show="!isSidebarCollapsed">
        <div class="session-group-title">最近会话</div>
        <div
          v-for="s in chat.sessions"
          :key="s.id"
          @click="chat.setActive(s.id)"
          class="session-item"
          :class="{ active: s.id === chat.activeId }"
        >
          <div class="session-title">{{ s.title }}</div>
          
          <el-dropdown 
            trigger="click" 
            @command="(cmd: string) => onSessionCommand(cmd, s.id)"
            popper-class="custom-dropdown-popper"
          >
            <el-icon class="more-icon" @click.stop><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">
                  <el-icon><Edit /></el-icon> 重命名
                </el-dropdown-item>
                <el-dropdown-item command="delete" class="danger-text">
                  <el-icon><Delete /></el-icon> 删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="sidebar-footer">
        <el-tooltip content="全局设置" placement="right" :disabled="!isSidebarCollapsed">
          <div class="footer-item" @click="router.push('/settings')">
            <el-icon :size="20"><Setting /></el-icon>
            <span v-if="!isSidebarCollapsed" class="footer-text">设置</span>
          </div>
        </el-tooltip>
      </div>
    </div>

    <div class="main-chat-area">
      <div class="chat-header">
        <div class="header-info">
          <span class="model-tag">{{ chat.settings.modelProvider === 'cloud' ? 'Cloud' : active?.model }}</span>
          <span class="chat-title">{{ active?.title || '新会话' }}</span>
        </div>
        <el-button text circle @click="showConfig = !showConfig">
          <el-icon :size="18"><Operation /></el-icon>
        </el-button>
      </div>

      <div class="message-scroll-container" :class="{ 'is-ready': isScrollerReady }">
        <DynamicScroller
          class="scroller"
          ref="scrollerRef"
          :items="activeMessages"
          key-field="id"
          :min-item-size="60"
        >
          <template #default="{ item, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.content]"
            >
              <div class="message-row" :class="item.role">
                <div class="message-content-box">
                  <div class="avatar-col">
                    <div class="avatar-circle">
                      {{ item.role === 'user' ? 'ME' : 'AI' }}
                    </div>
                  </div>
                  <div class="text-col">
                    <div v-if="item.role === 'assistant'" class="ai-content">
                       <MarkdownText :content="item.content" />
                    </div>
                    <div v-else class="user-bubble">
                      {{ item.content }}
                    </div>
                  </div>
                </div>
              </div>
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
      </div>

      <div class="input-area-wrapper">
        <div class="input-centered-box">
          <div class="input-box">
            <el-input
              v-model="input"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 8 }"
              placeholder="发送消息给 AI..."
              @keydown.enter.exact.prevent="send"
              resize="none"
              class="chat-input"
            />
            <div class="input-actions">
               <el-tooltip content="清空对话">
                 <el-button circle size="small" text @click="clearChat">
                    <el-icon><Delete /></el-icon>
                 </el-button>
               </el-tooltip>
               <el-button 
                 v-if="streaming" 
                 type="danger" 
                 size="small" 
                 round 
                 @click="stop"
               >
                 停止
               </el-button>
               <el-button 
                 v-else 
                 type="primary" 
                 size="small" 
                 round 
                 :disabled="!input.trim()" 
                 @click="send"
               >
                 <el-icon><Position /></el-icon>
               </el-button>
            </div>
          </div>
          <div class="footer-tips">
            AI 生成的内容可能不准确，请核实重要信息。
          </div>
        </div>
      </div>
    </div>

    <div class="right-drawer" :class="{ 'is-open': showConfig }">
      <div class="drawer-header">
        <span>当前会话设置</span>
        <el-icon class="close-btn" @click="showConfig = false"><Close /></el-icon>
      </div>
      
      <div class="drawer-content">
        <el-form label-position="top" v-if="active" size="small">
          <el-form-item label="模型">
            <template v-if="chat.settings.modelProvider === 'local'">
              <el-select v-model="active.model" style="width:100%" @change="onModelChange">
                <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
              </el-select>
            </template>
            <template v-else>
               <el-input :model-value="chat.settings.cloudModelName" disabled>
                 <template #prefix>☁️</template>
               </el-input>
            </template>
          </el-form-item>
          <el-form-item label="System Prompt">
            <el-input 
              v-model="active.systemPrompt" 
              type="textarea" 
              :rows="10" 
              @input="onSystemPromptInput"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="drawer-footer">
         <el-button size="small" @click="exportMD">导出 Markdown</el-button>
         <el-button size="small" @click="exportJSON">导出 JSON</el-button>
      </div>
    </div>

  </div>
  
  <el-dialog v-model="renameOpen" title="重命名" width="300px" align-center>
    <el-input v-model="renameText" @keyup.enter="doRename" />
    <template #footer>
      <el-button @click="renameOpen = false">取消</el-button>
      <el-button type="primary" @click="doRename">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { 
  Fold, Expand, Delete, Position, Setting, 
  MoreFilled, Operation, Close, Edit 
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { exportSessionJSON, exportSessionMarkdown } from '@/utils/export'
import { ollamaChatOnce, ollamaChatStream, ollamaTags, type ChatMessage } from '@/services/ollama'
import { openaiChatStream } from '@/services/openai'
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import MarkdownText from '@/components/MarkdownText.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'

const router = useRouter()
const chat = useChatStore()
const input = ref('')
const streaming = ref(false)
const showConfig = ref(false)

// 读取初始状态
const isSidebarCollapsed = ref(sessionStorage.getItem('chat_sidebar_collapsed') === 'true')

// 监听并保存状态
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  sessionStorage.setItem('chat_sidebar_collapsed', String(isSidebarCollapsed.value))
}

let controller: AbortController | null = null
const modelOptions = ref<string[]>([])
const active = computed(() => chat.activeSession)
const activeMessages = computed(() => active.value?.messages ?? [])

async function loadModels() {
  if (chat.settings.modelProvider !== 'local') return
  try {
    const data = await ollamaTags()
    const names = (data.models ?? []).map(x => x.name)
    if (names.length) modelOptions.value = names
  } catch {}
}
onMounted(loadModels)
watch(() => chat.settings.modelProvider, (val) => { if (val === 'local') loadModels() })

function onModelChange(val: string) { if (active.value) chat.updateModel(active.value.id, val) }
function onSystemPromptInput() { if (active.value) chat.updateSystemPrompt(active.value.id, active.value.systemPrompt) }

function clearChat() {
  if (!active.value || streaming.value) return
  ElMessageBox.confirm('确定清空当前所有对话吗？此操作无法撤销。', '提示', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning',
    center: true
  }).then(() => chat.clearMessages(active.value!.id))
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value || !active.value) return
  const sid = active.value.id
  input.value = ''

  chat.pushMessage(sid, { role: 'user', content: text })
  chat.pushMessage(sid, { role: 'assistant', content: '' })
  const assistantIndex = chat.activeSession!.messages.length - 1

  streaming.value = true
  controller = new AbortController()

  const allMessages = chat.activeSession!.messages
  const payload = allMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))

  try {
    const settings = chat.settings
    if (settings.modelProvider === 'cloud') {
      if (!settings.cloudApiKey) throw new Error('请先在设置页配置 API Key')
      await openaiChatStream({
        baseUrl: settings.cloudBaseUrl,
        apiKey: settings.cloudApiKey,
        model: settings.cloudModelName,
        messages: payload,
        temperature: settings.defaultTemperature,
        signal: controller.signal,
        onToken(t) { chat.activeSession!.messages[assistantIndex].content += t }
      })
      await autoRenameIfNeeded(sid)
    } else {
      await ollamaChatStream({
        model: chat.activeSession!.model,
        messages: payload,
        signal: controller.signal,
        onToken(t) { chat.activeSession!.messages[assistantIndex].content += t }
      })
      await autoRenameIfNeeded(sid)
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') chat.activeSession!.messages[assistantIndex].content += '\n\n[已停止生成]'
    else {
      chat.activeSession!.messages[assistantIndex].content += `\n\n[Error] ${e?.message ?? String(e)}`
      ElMessage.error(e?.message ?? 'Request Failed')
    }
  } finally {
    streaming.value = false
    controller = null
  }
}

function stop() { controller?.abort() }

const renameOpen = ref(false), renameText = ref(''), renameId = ref('')
function onSessionCommand(cmd: string, id: string) {
  if (cmd === 'rename') {
    const s = chat.sessions.find(x => x.id === id)
    renameId.value = id
    renameText.value = s?.title ?? ''
    renameOpen.value = true
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确认删除该会话？', '警告', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'error',
      center: true
    }).then(() => chat.removeSession(id))
  }
}
function doRename() {
  if (!renameId.value) return
  chat.renameSession(renameId.value, renameText.value)
  renameOpen.value = false
}

async function autoRenameIfNeeded(sessionId: string) {
  const s = chat.sessions.find(x => x.id === sessionId)
  if (!s || s.title !== '新会话') return
  const msgs = s.messages.filter(m => m.role !== 'system')
  if (msgs.length < 2) return 
  
  const promptMessages: ChatMessage[] = [
    { role: 'system', content: '请生成一个10字以内的中文标题，不要标点。' },
    { role: 'user', content: `用户:${msgs[0].content}\nAI:${msgs[1].content}` },
  ]
  try {
    let title = ''
    if (chat.settings.modelProvider === 'cloud') {
      await openaiChatStream({
        baseUrl: chat.settings.cloudBaseUrl,
        apiKey: chat.settings.cloudApiKey,
        model: chat.settings.cloudModelName,
        messages: promptMessages,
        temperature: 0.7,
        onToken: (t) => title += t
      })
    } else {
      title = await ollamaChatOnce({ model: s.model, messages: promptMessages })
    }
    const finalTitle = title.trim().replace(/["《》]/g, '').slice(0, 20)
    if (finalTitle) chat.setTitle(sessionId, finalTitle)
  } catch {}
}

function exportMD() { if (active.value) exportSessionMarkdown(active.value) }
function exportJSON() { if (active.value) exportSessionJSON(active.value) }

const scrollerRef = ref<any>(null)
const isScrollerReady = ref(false)

function scrollToBottom(smooth = false) { 
  if (!smooth) isScrollerReady.value = false
  nextTick(() => {
    setTimeout(() => {
      const scroller = scrollerRef.value
      if (!scroller) return
      const el = scroller.$el
      if (el) el.style.scrollBehavior = smooth ? 'smooth' : 'auto'
      scroller.scrollToBottom()
      if (!smooth) requestAnimationFrame(() => isScrollerReady.value = true)
      if (smooth && el) setTimeout(() => { el.style.scrollBehavior = '' }, 500)
    }, 20) 
  })
}

watch(() => activeMessages.value.at(-1)?.content, () => { if (streaming.value) scrollToBottom(true) })
watch(() => activeMessages.value.length, (newLen, oldLen) => { if (newLen > oldLen) scrollToBottom(true) })
watch(() => chat.activeId, () => { isScrollerReady.value = false; scrollToBottom(false) }, { immediate: true })
</script>

<style scoped lang="scss">
/* --- 整体布局 --- */
.chat-layout {
  display: flex;
  height: 100%; 
  background-color: #fff;
  color: #333;
  overflow: hidden;
}

/* --- 1. 左侧侧边栏 --- */
.sidebar-container {
  width: 260px;
  background-color: #f7f7f8;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  position: relative; 
  white-space: nowrap;

  &.is-collapsed {
    width: 64px;
    .sidebar-header { justify-content: center; padding: 12px 0; }
    .action-area { padding: 0 10px; }
  }
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  .logo-text { font-weight: bold; font-size: 18px; color: #444; white-space: nowrap; }
  .toggle-btn { color: #666; font-size: 18px; }
}

.action-area {
  padding: 0 16px;
  margin-bottom: 12px;
  flex-shrink: 0;
  white-space: nowrap;
  .is-icon-only { padding: 8px; width: 100%; }
}

.session-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
  margin-bottom: 60px; 
}

.session-group-title { font-size: 12px; color: #999; margin: 8px 8px; }

.session-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; margin-bottom: 2px; border-radius: 8px;
  cursor: pointer; color: #333; font-size: 14px;
  &:hover { background-color: #eee; }
  &.active { background-color: #e5e5e5; font-weight: 500; }
  .session-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .more-icon { display: none; color: #999; font-size: 14px; padding: 4px; border-radius: 4px; }
  &:hover .more-icon { display: block; &:hover { background: #ddd; } }
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  padding: 0; 
  background: #f7f7f8;
  
  .footer-item {
    display: flex; align-items: center; width: 100%; height: 100%;
    padding: 0 16px; cursor: pointer; color: #555; transition: all 0.3s;
    white-space: nowrap;
    &:hover { color: #333; }
    
    .footer-text { margin-left: 8px; }

    .sidebar-container.is-collapsed & {
      justify-content: center;
      padding: 0;
    }
  }
}

/* --- 2. 中间聊天区 --- */
.main-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}

.chat-header {
  height: 60px;
  border-bottom: 1px solid #f2f2f2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  .header-info { display: flex; align-items: center; gap: 8px; }
  .model-tag { font-size: 12px; background: #f0f0f0; padding: 2px 6px; border-radius: 4px; color: #666; }
  .chat-title { font-weight: 600; font-size: 16px; }
}

.message-scroll-container {
  flex: 1;
  overflow: hidden; 
  background-color: #fff;
  position: relative;
  opacity: 0;
  transition: opacity 0.15s ease-in;
}

.message-scroll-container.is-ready {
  opacity: 1;
}

.scroller { height: 100%; overflow-y: auto; }

.message-row {
  display: flex; justify-content: center; padding: 24px 0; width: 100%;
  &.user .message-content-box { flex-direction: row-reverse; }
}

.message-content-box {
  width: 100%; max-width: 800px; padding: 0 20px; display: flex; gap: 16px;
}

.avatar-col { flex-shrink: 0; }
.avatar-circle {
  width: 32px; height: 32px; border-radius: 50%; background: #f0f0f0; color: #666;
  font-size: 12px; font-weight: bold; display: flex; align-items: center; justify-content: center;
}
.message-row.user .avatar-circle { background: #333; color: #fff; }

.text-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.message-row.user .text-col { align-items: flex-end; }

.user-bubble {
  background-color: #f3f3f3; color: #000; padding: 10px 16px;
  border-radius: 20px; border-top-right-radius: 4px;
  font-size: 15px; line-height: 1.6; white-space: pre-wrap;
  display: inline-block; max-width: 100%; text-align: left;
}
.ai-content { font-size: 15px; line-height: 1.6; color: #222; }

/* --- 输入框区域 --- */
.input-area-wrapper {
  padding: 0 20px 24px 20px;
  display: flex; justify-content: center; 
  flex-shrink: 0;
  background: #fff;
}
.input-centered-box { width: 100%; max-width: 800px; }

.input-box {
  background: #f4f4f4; border-radius: 24px; padding: 8px 12px 8px 16px;
  display: flex; flex-direction: column; border: 1px solid transparent;
  transition: all 0.2s;
  &:focus-within { background: #fff; border-color: #ccc; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
}

.chat-input {
  :deep(.el-textarea__inner) {
    background: transparent !important; box-shadow: none !important; padding: 0; border: none; font-size: 15px;
  }
}

.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.footer-tips { text-align: center; color: #bbb; font-size: 12px; margin-top: 8px; }

/* --- 3. 右侧配置抽屉 --- */
.right-drawer {
  width: 0; border-left: 1px solid #eee; background: #fcfcfc;
  overflow: hidden; transition: width 0.3s ease; flex-shrink: 0;
  display: flex; flex-direction: column;
  &.is-open { width: 300px; }

  /*  修复：右侧抽屉内部容器固定宽度，防止滑动时内部重排导致闪烁 */
  .drawer-header, .drawer-content, .drawer-footer {
    min-width: 300px;
  }
}

.drawer-header {
  height: 60px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; font-weight: 600; border-bottom: 1px solid #eee; flex-shrink: 0;
  .close-btn { cursor: pointer; color: #999; &:hover { color: #333; } }
}
.drawer-content { padding: 16px; flex: 1; overflow-y: auto; }
.drawer-actions { margin-top: 24px; display: flex; gap: 10px; }
.drawer-footer {
  padding: 16px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: center;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }
::-webkit-scrollbar-track { background: transparent; }
</style>

<style>
.custom-dropdown-popper {
  border-radius: 8px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important; border: none !important;
  .el-dropdown-menu__item {
    border-radius: 6px; margin: 2px 4px;
    &.danger-text { color: #f56c6c; &:hover { background-color: #fef0f0; } }
  }
}
</style>