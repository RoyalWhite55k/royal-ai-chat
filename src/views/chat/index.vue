<template>
  <div class="chat-layout">
    
    <div class="sidebar-container" :class="{ 'is-collapsed': isSidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-area" v-show="!isSidebarCollapsed">
          <span class="logo-text">AI Chat</span>
        </div>
        <el-button link class="toggle-btn" @click="toggleSidebar">
          <el-icon :size="20"><component :is="isSidebarCollapsed ? Expand : Fold" /></el-icon>
        </el-button>
      </div>
      
      <div class="action-area">
        <el-tooltip content="新建会话" placement="right" :disabled="!isSidebarCollapsed">
          <el-button type="primary" :class="{ 'is-icon-only': isSidebarCollapsed }" round block @click="chatStore.newSession()">
            <span v-if="!isSidebarCollapsed" style="white-space: nowrap;">+ 新建会话</span>
            <span v-else>+</span>
          </el-button>
        </el-tooltip>
      </div>

      <div class="session-list-scroll" v-show="!isSidebarCollapsed">
        <div class="session-group-title">最近会话</div>
        <div v-for="s in chatStore.sessions" :key="s.id" @click="chatStore.setActive(s.id)" class="session-item" :class="{ active: s.id === chatStore.activeId }">
          <div class="session-title">{{ s.title }}</div>
          <el-dropdown trigger="click" @command="(cmd: string) => onSessionCommand(cmd, s.id)" popper-class="custom-dropdown-popper">
            <el-icon class="more-icon" @click.stop><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename"><el-icon><Edit /></el-icon> 重命名</el-dropdown-item>
                <el-dropdown-item command="delete" class="danger-text"><el-icon><Delete /></el-icon> 删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="sidebar-footer">
        <el-tooltip :content="isDark ? '切换亮色模式' : '切换深色模式'" placement="right" :disabled="!isSidebarCollapsed">
          <div class="footer-item" @click="toggleTheme">
            <el-icon :size="20">
              <component :is="isDark ? Sunny : Moon" />
            </el-icon>
            <span v-if="!isSidebarCollapsed" class="footer-text">{{ isDark ? '亮色模式' : '深色模式' }}</span>
          </div>
        </el-tooltip>

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
          <span class="model-tag">{{ chatStore.settings.modelProvider === 'cloud' ? 'Cloud' : active?.model }}</span>
          <span class="chat-title">{{ active?.title || '新会话' }}</span>
        </div>
        <el-button text circle @click="showConfig = !showConfig">
          <el-icon :size="18"><Operation /></el-icon>
        </el-button>
      </div>

      <div class="message-scroll-container" :class="{ 'is-ready': isScrollerReady }">
        <DynamicScroller class="scroller" ref="scrollerRef" :items="activeMessages" key-field="id" :min-item-size="60">
          <template #default="{ item, active }">
            <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[item.content]">
              <div class="message-row" :class="item.role">
                <div class="message-content-box">
                  <div class="avatar-col">
                    <div class="avatar-circle">{{ item.role === 'user' ? 'ME' : 'AI' }}</div>
                  </div>
                  <div class="text-col">
                    <div v-if="item.role === 'assistant'" class="ai-content-wrapper">
                      <div class="ai-content"><MarkdownText :content="item.content" /></div>
                      <div class="ai-actions">
                        <el-tooltip content="朗读" placement="top">
                          <el-icon class="action-icon" @click="toggleSpeak(item.content)">
                            <component :is="isSpeaking(item.content) ? VideoPause : Microphone" />
                          </el-icon>
                        </el-tooltip>
                      </div>
                    </div>
                    <div v-else class="user-bubble">{{ item.content }}</div>
                  </div>
                </div>
              </div>
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
      </div>

      <div class="input-area-wrapper">
        <div class="input-centered-box">
          <div class="input-box" :class="{ 'is-recording': isRecording }">
            <el-input
              v-model="input"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 8 }"
              :placeholder="isRecording ? '正在聆听...' : '发送消息...'"
              @keydown.enter.exact.prevent="send"
              resize="none"
              class="chat-input"
            />
            <div class="input-actions">
               <div class="left-tools">
                 <el-tooltip content="清空对话">
                   <el-button circle text class="action-btn" @click="clearChat">
                     <el-icon><Delete /></el-icon>
                   </el-button>
                 </el-tooltip>
                 
                 <el-tooltip :content="isRecording ? '点击停止' : '语音输入'">
                   <el-button 
                     circle 
                     text 
                     class="action-btn"
                     @click="toggleRecording"
                     :class="{ 'recording-btn': isRecording }"
                   >
                     <el-icon><Microphone /></el-icon>
                   </el-button>
                 </el-tooltip>
               </div>
               
               <div class="right-tools">
                 <el-button v-if="streaming" type="danger" round class="action-btn-send" @click="stop">停止</el-button>
                 <el-button v-else type="primary" round class="action-btn-send" :disabled="!input.trim()" @click="send">
                   <el-icon><Position /></el-icon>
                 </el-button>
               </div>
            </div>
          </div>
          <div class="footer-tips">AI 生成的内容可能不准确，请核实重要信息。</div>
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
            <template v-if="chatStore.settings.modelProvider === 'local'">
              <el-select v-model="active.model" style="width:100%" @change="onModelChange">
                <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
              </el-select>
            </template>
            <template v-else>
               <el-input :model-value="chatStore.settings.cloudModelName" disabled><template #prefix>☁️</template></el-input>
            </template>
          </el-form-item>
          <el-form-item label="System Prompt">
            <el-input v-model="active.systemPrompt" type="textarea" :rows="10" @input="onSystemPromptInput"/>
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
  MoreFilled, Operation, Close, Edit,
  Microphone, VideoPause, Moon, Sunny 
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { exportSessionJSON, exportSessionMarkdown } from '@/utils/export'
import { ollamaChatOnce, ollamaChatStream, ollamaTags, type ChatMessage } from '@/services/ollama'
import { openaiChatStream } from '@/services/openai'
import { computed, onMounted, ref, watch, nextTick, onUnmounted } from 'vue' 
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import MarkdownText from '@/components/MarkdownText.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'

const router = useRouter()
const chatStore = useChatStore()
const input = ref('')
const streaming = ref(false)
const showConfig = ref(false)
const isSidebarCollapsed = ref(sessionStorage.getItem('chat_sidebar_collapsed') === 'true')

// 深色模式逻辑 
const isDark = ref(false)

function initTheme() {
  const storedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  }
}

function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  initTheme()
})
// 深色模式逻辑结束 

const isRecording = ref(false)
const currentSpeakingText = ref('')
let recognition: any = null

function initSpeech() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    ElMessage.error('当前浏览器不支持语音识别，请使用 Chrome 或 Edge')
    return null
  }
  const rec = new SpeechRecognition()
  rec.lang = 'zh-CN'
  rec.continuous = false 
  rec.interimResults = true 

  rec.onstart = () => { isRecording.value = true }
  rec.onend = () => { isRecording.value = false }
  
  rec.onresult = (event: any) => {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0].transcript)
      .join('')
    input.value = transcript 
  }
  
  rec.onerror = (event: any) => {
    console.error('Speech error:', event.error)
    isRecording.value = false
    ElMessage.error('语音识别出错: ' + event.error)
  }
  return rec
}

function toggleRecording() {
  if (!recognition) recognition = initSpeech()
  if (!recognition) return

  if (isRecording.value) {
    recognition.stop()
  } else {
    input.value = '' 
    recognition.start()
  }
}

function toggleSpeak(text: string) {
  if (currentSpeakingText.value === text) {
    window.speechSynthesis.cancel()
    currentSpeakingText.value = ''
    return
  }
  
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 1.0 
  
  u.onend = () => { currentSpeakingText.value = '' }
  u.onerror = () => { currentSpeakingText.value = '' }
  
  currentSpeakingText.value = text
  window.speechSynthesis.speak(u)
}

function isSpeaking(text: string) {
  return currentSpeakingText.value === text
}

onUnmounted(() => {
  window.speechSynthesis.cancel()
  if (recognition) recognition.stop()
})

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  sessionStorage.setItem('chat_sidebar_collapsed', String(isSidebarCollapsed.value))
}

let controller: AbortController | null = null
const modelOptions = ref<string[]>([])
const active = computed(() => chatStore.activeSession)
const activeMessages = computed(() => active.value?.messages ?? [])

async function loadModels() {
  if (chatStore.settings.modelProvider !== 'local') return
  try {
    const data = await ollamaTags()
    const names = (data.models ?? []).map(x => x.name)
    if (names.length) modelOptions.value = names
  } catch {}
}
onMounted(loadModels)
watch(() => chatStore.settings.modelProvider, (val) => { if (val === 'local') loadModels() })

function onModelChange(val: string) { if (active.value) chatStore.updateModel(active.value.id, val) }
function onSystemPromptInput() { if (active.value) chatStore.updateSystemPrompt(active.value.id, active.value.systemPrompt) }

function clearChat() {
  if (!active.value || streaming.value) return
  ElMessageBox.confirm('确定清空当前所有对话吗？此操作无法撤销。', '提示', {
    confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning', center: true
  }).then(() => chatStore.clearMessages(active.value!.id))
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value || !active.value) return
  // 在发送前校验模型配置：
  const settings = chatStore.settings
  if (settings.modelProvider === 'cloud') {
    const missing: string[] = []
    if (!(settings.cloudModelName || '').trim()) missing.push('模型名称')
    if (!(settings.cloudBaseUrl || '').trim()) missing.push('API Base URL')
    if (!(settings.cloudApiKey || '').trim()) missing.push('API Key')
    if (missing.length) {
      ElMessageBox.confirm(`缺少必填配置：${missing.join('、')}，发送前请在设置页填写，是否前往设置？`, '缺少配置', {
        confirmButtonText: '去设置', cancelButtonText: '取消', type: 'warning', center: true
      }).then(() => router.push('/settings'))
      return
    }
  }
  if (settings.modelProvider === 'local') {
    const curModel = active.value.model || settings.defaultModel || ''
    if (!(curModel || '').trim()) {
      ElMessageBox.confirm('当前未配置本地模型，发送前请在设置页填写默认模型或在会话中选择模型，是否前往设置？', '缺少模型', {
        confirmButtonText: '去设置', cancelButtonText: '取消', type: 'warning', center: true
      }).then(() => router.push('/settings'))
      return
    }
  }

  const sid = active.value.id
  input.value = ''

  const userMsg: any = { role: 'user', content: text }

  chatStore.pushMessage(sid, userMsg)
  chatStore.pushMessage(sid, { role: 'assistant', content: '' })
  const assistantIndex = chatStore.activeSession!.messages.length - 1

  streaming.value = true
  controller = new AbortController()

  const allMessages = chatStore.activeSession!.messages
  const payload = allMessages.slice(0, -1).map((m: any) => {
    return { role: m.role, content: m.content }
  })

  try {
    const settings = chatStore.settings
    if (settings.modelProvider === 'cloud') {
      if (!settings.cloudApiKey) throw new Error('请先在设置页配置 API Key')
      
      await openaiChatStream({
        baseUrl: settings.cloudBaseUrl,
        apiKey: settings.cloudApiKey,
        model: settings.cloudModelName,
        messages: payload as any, 
        temperature: settings.defaultTemperature,
        signal: controller.signal,
        onToken(t) { chatStore.activeSession!.messages[assistantIndex].content += t }
      })
      await autoRenameIfNeeded(sid)
    } else {
      const ollamaPayload = allMessages.slice(0, -1).map((m: any) => ({
        role: m.role,
        content: m.content
      }))

      await ollamaChatStream({
        model: chatStore.activeSession!.model,
        messages: ollamaPayload,
        signal: controller.signal,
        onToken(t) { chatStore.activeSession!.messages[assistantIndex].content += t }
      })
      await autoRenameIfNeeded(sid)
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') chatStore.activeSession!.messages[assistantIndex].content += '\n\n[已停止生成]'
    else {
      chatStore.activeSession!.messages[assistantIndex].content += `\n\n[Error] ${e?.message ?? String(e)}`
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
    const s = chatStore.sessions.find(x => x.id === id)
    renameId.value = id
    renameText.value = s?.title ?? ''
    renameOpen.value = true
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确认删除该会话？', '警告', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'error', center: true
    }).then(() => chatStore.removeSession(id))
  }
}
function doRename() {
  if (!renameId.value) return
  chatStore.renameSession(renameId.value, renameText.value)
  renameOpen.value = false
}

async function autoRenameIfNeeded(sessionId: string) {
  const s = chatStore.sessions.find(x => x.id === sessionId)
  if (!s || s.title !== '新会话') return
  const msgs = s.messages.filter(m => m.role !== 'system')
  if (msgs.length < 2) return 
  const promptMessages: ChatMessage[] = [
    { role: 'system', content: '请生成一个10字以内的中文标题，不要标点。' },
    { role: 'user', content: `用户:${msgs[0].content}\nAI:${msgs[1].content}` },
  ]
  try {
    let title = ''
    if (chatStore.settings.modelProvider === 'cloud') {
      await openaiChatStream({
        baseUrl: chatStore.settings.cloudBaseUrl,
        apiKey: chatStore.settings.cloudApiKey,
        model: chatStore.settings.cloudModelName,
        messages: promptMessages,
        temperature: 0.7,
        onToken: (t) => title += t
      })
    } else {
      title = await ollamaChatOnce({ model: s.model, messages: promptMessages })
    }
    const finalTitle = title.trim().replace(/["《》]/g, '').slice(0, 20)
    if (finalTitle) chatStore.setTitle(sessionId, finalTitle)
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
watch(() => chatStore.activeId, () => { isScrollerReady.value = false; scrollToBottom(false) }, { immediate: true })
</script>

<style scoped lang="scss">
/* 全局变量定义 */
:global(:root) {
  /* 浅色模式 */
  --bg-app: #fff;
  
  --bg-sidebar: #f2f3f5; 
  --bg-header: #ffffff;
  --bg-drawer: #f2f3f5;
  --bg-message-area: #ffffff;
  
  --text-main: #333;
  --text-secondary: #666;
  --text-muted: #999;
  --text-logo: #444;
  --text-bubble-user: #000;
  --text-bubble-ai: #222;
  
  --bg-active-item: #e5e5e5;
  --bg-hover-item: #e1e3e6;
  --bg-hover-danger: #ddd;
  
  --bg-tag: #e4e6e9;
  --bg-user-bubble: #f3f3f3;
  
  --bg-input-wrapper: #ffffff;
  --bg-input-box: #f4f4f4;
  --bg-input-box-focus: #ffffff;
  
  --border-color: #e5e7eb;
  --border-light: #e5e7eb;
  --border-input-focus: #ccc;
  
  --shadow-input-focus: rgba(0,0,0,0.05);
  
  --scrollbar-thumb: #dcdfe6;
  --scrollbar-hover: #c0c4cc;
  
  --recording-border: #67c23a;
  --recording-bg: #f0f9eb;
  --recording-shadow: rgba(103, 194, 58, 0.2);
}

/* 深色模式 */
:global(html.dark) {
  --bg-app: #121212;
  --bg-sidebar: #1e1e1e;
  --bg-header: #1e1e1e; 
  --bg-message-area: #121212;
  --bg-drawer: #1e1e1e;
  
  --text-main: #ffffff;       
  --text-secondary: #bbbbbb; 
  --text-muted: #888888;
  --text-logo: #ffffff;
  --text-bubble-user: #ffffff;
  --text-bubble-ai: #ececec; 
  
  --bg-active-item: #333;
  --bg-hover-item: #2a2a2a;
  --bg-hover-danger: #3a3a3a;
  
  --bg-tag: #333;
  --bg-user-bubble: #2c2c2c;
  
  --bg-input-wrapper: #121212;
  --bg-input-box: #2c2c2c;
  --bg-input-box-focus: #333;
  
  --border-color: #333;
  --border-light: #2c2c2c;
  --border-input-focus: #555;
  
  --shadow-input-focus: rgba(0,0,0,0.5);
  
  --scrollbar-thumb: #444;
  --scrollbar-hover: #555;
  
  --recording-border: #67c23a;
  --recording-bg: #1a2e1a; 
  --recording-shadow: rgba(103, 194, 58, 0.1);

  /* Element Plus 适配 */
  --el-bg-color: #1e1e1e;
  --el-bg-color-page: #121212;
  --el-bg-color-overlay: #2a2a2a;
  --el-text-color-primary: #ffffff;
  --el-text-color-regular: #cccccc;
  --el-text-color-secondary: #999999;
  --el-text-color-placeholder: #666666;
  --el-text-color-disabled: #555555;
  --el-border-color: #333333;
  --el-border-color-light: #444444;
  --el-fill-color-blank: #2a2a2a;
  --el-fill-color-light: #333333;
}

/* 布局 */
.chat-layout {
  display: flex;
  height: 100%;
  background-color: var(--bg-app);
  color: var(--text-main);
  overflow: hidden;
  transition: background-color 0.3s, color 0.3s;
}

/* 侧边栏 */
.sidebar-container {
  width: 260px; 
  background-color: var(--bg-sidebar); 
  border-right: 1px solid var(--border-color); 
  display: flex; 
  flex-direction: column;
  transition: width 0.3s ease, background-color 0.3s; 
  flex-shrink: 0; 
  position: relative; 
  white-space: nowrap;
  &.is-collapsed {
    width: 64px;
    .sidebar-header { 
      justify-content: center; 
      padding: 12px 0; 
    }
    .action-area { 
      padding: 0 10px; 
    }
  }
}
.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  .logo-text {
    font-weight: bold;
    font-size: 18px;
    color: var(--text-logo);
    white-space: nowrap;
  }
  .toggle-btn {
    color: var(--text-secondary);
    font-size: 18px;
  }
}
  .action-area {
    padding: 0 16px;
    margin-bottom: 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .action-area .is-icon-only {
    padding: 8px;
    width: 100%;
  }
.session-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
  margin-bottom: 60px;
}
.session-group-title {
  font-size: 12px;
  color: var(--text-muted);
  margin: 8px 8px;
}

/* ✨✨✨ 修复部分：列表项防抖动 ✨✨✨ */
.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-main);
  font-size: 14px;
  position: relative;

  &:hover { background-color: var(--bg-hover-item); }
  &.active {
    background-color: var(--bg-active-item);
    font-weight: 500;
  }

  .session-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    padding-right: 24px;
  }

  .more-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);

    color: var(--text-muted);
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.2s, background-color 0.2s;
  }

  &:hover .more-icon {
    opacity: 1;
    display: block;
    &:hover { background: var(--bg-hover-danger); }
  }
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0;
  background: var(--bg-sidebar);
    .footer-item {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 0 16px;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.3s;
      white-space: nowrap;
    }
    .footer-item:hover { color: var(--text-main); }
    .footer-text { margin-left: 8px; }
    .sidebar-container.is-collapsed .footer-item { justify-content: center; padding: 0; }
}

/* 主聊天区 */
.main-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  background-color: var(--bg-message-area);
}
.chat-header {
  height: 60px;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  z-index: 10;

  .header-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .model-tag {
    font-size: 12px;
    background: var(--bg-tag);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-secondary);
  }
  .chat-title {
    font-weight: 600;
    font-size: 16px;
    color: var(--text-main);
  }
}
.message-scroll-container {
  flex: 1;
  overflow: hidden;
  background-color: var(--bg-message-area);
  position: relative;
  opacity: 0;
  transition: opacity 0.15s ease-in;
  &.is-ready { opacity: 1; }
}
.scroller {
  height: 100%;
  overflow-y: auto;
}
.message-row {
  display: flex;
  justify-content: center;
  padding: 24px 0;
  width: 100%;
  &.user .message-content-box { flex-direction: row-reverse; }
}
.message-content-box {
  width: 100%;
  max-width: 800px;
  padding: 0 20px;
  display: flex;
  gap: 16px;
}
.avatar-col { flex-shrink: 0; }
.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tag);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-row.user .avatar-circle {
  background: #333;
  color: #fff;
}
.text-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.message-row.user .text-col { align-items: flex-end; }
.user-bubble {
  background-color: var(--bg-user-bubble);
  color: var(--text-bubble-user);
  padding: 10px 16px;
  border-radius: 20px;
  border-top-right-radius: 4px;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  display: inline-block;
  max-width: 100%;
  text-align: left;
}

/* AI 气泡样式 */
.ai-content-wrapper {
  position: relative;
  group: ai-bubble;
  .ai-content {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-bubble-ai);
  }

  :global(.dark .ai-content p),
  :global(.dark .ai-content li),
  :global(.dark .ai-content ul),
  :global(.dark .ai-content ol),
  :global(.dark .ai-content blockquote),
  :global(.dark .ai-content h1),
  :global(.dark .ai-content h2),
  :global(.dark .ai-content h3),
  :global(.dark .ai-content h4),
  :global(.dark .ai-content strong),
  :global(.dark .ai-content em),
  :global(.dark .ai-content table) {
    color: #ffffff !important;
  }

  .ai-actions {
    margin-top: 6px;
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;
    .action-icon {
      cursor: pointer;
      color: var(--text-muted);
      font-size: 16px;
      padding: 2px;
      &:hover { color: var(--el-color-primary); }
    }
  }
  &:hover .ai-actions { opacity: 1; }
}

/* 输入框 */
.input-area-wrapper {
  padding: 0 20px 24px 20px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-input-wrapper);
  position: relative;
}
.input-centered-box {
  width: 100%;
  max-width: 800px;
  position: relative;
}
.input-box {
  background: var(--bg-input-box);
  border-radius: 24px;
  padding: 8px 12px 8px 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid transparent;
  transition: all 0.2s;
  &:focus-within {
    background: var(--bg-input-box-focus);
    border-color: var(--border-input-focus);
    box-shadow: 0 2px 10px var(--shadow-input-focus);
  }
  &.is-recording {
    border-color: var(--recording-border);
    background-color: var(--recording-bg);
    box-shadow: 0 0 10px var(--recording-shadow);
  }
}
.chat-input {
  :deep(.el-textarea__inner) {
    background: transparent !important;
    box-shadow: none !important;
    padding: 0;
    border: none;
    font-size: 15px;
    color: var(--text-main);
  }
}
  .input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
  }
  .input-actions .left-tools {
    display: flex;
    gap: 4px;
  }
.footer-tips { text-align: center; color: #bbb; font-size: 12px; margin-top: 8px; }

/* 图标微调 */
.action-btn {
  font-size: 20px !important;
  padding: 8px !important;
  height: auto !important;
  color: var(--text-secondary);
}
.action-btn:hover {
  color: var(--text-main);
  background-color: var(--shadow-input-focus);
}
.action-btn-send {
  padding: 8px 20px !important;
}
.action-btn-send .el-icon { font-size: 18px !important; }

/* 录音按钮动画 */
.recording-btn {
  color: #67c23a !important;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.right-drawer {
  width: 0;
  border-left: 1px solid var(--border-color);
  background: var(--bg-drawer);
  overflow: hidden;
  transition: width 0.3s ease;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  &.is-open { width: 300px; }
  .drawer-header, .drawer-content, .drawer-footer { min-width: 300px; }
}
.drawer-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  color: var(--text-main);
  .close-btn {
    cursor: pointer;
    color: var(--text-muted);
    &:hover { color: var(--text-main); }
  }
}
.drawer-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}
.drawer-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
  justify-content: center;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-hover);
}
::-webkit-scrollbar-track { background: transparent; }
</style>

<style>
/* 下拉菜单适配 */
html.dark .custom-dropdown-popper {
  background-color: #1e1e1e !important;
  border: 1px solid #333 !important;
}
html.dark .custom-dropdown-popper .el-dropdown-menu__item {
  color: #e0e0e0 !important;
}
html.dark .custom-dropdown-popper .el-dropdown-menu__item:hover {
  background-color: #2a2a2a !important;
  color: #fff !important;
}
html.dark .el-popper__arrow::before {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
}

.custom-dropdown-popper {
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: none !important;
}
.el-dropdown-menu__item {
  border-radius: 6px;
  margin: 2px 4px;
}
.el-dropdown-menu__item.danger-text { color: #f56c6c !important; }
.el-dropdown-menu__item.danger-text:hover { background-color: #fef0f0; }
</style>