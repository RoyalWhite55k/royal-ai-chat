import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import debounce from 'lodash.debounce'
import type { ChatMessage } from '@/services/ollama'

// ... 类型定义保持不变 ...
export type SessionMessage = ChatMessage & { id: string }
export type Session = {
  id: string
  title: string
  model: string
  systemPrompt: string
  messages: SessionMessage[]
  createdAt: number
  updatedAt: number
}

export type AppSettings = {
  userNickname: string
  modelProvider: 'local' | 'cloud'
  ollamaUrl: string
  defaultModel: string
  cloudBaseUrl: string
  cloudApiKey: string
  cloudModelName: string
  defaultTemperature: number
  defaultSystemPrompt: string
}

const LS_SESSION_KEY = 'royal-ai-chat:sessions'
const LS_SETTINGS_KEY = 'royal-ai-chat:settings'
const LS_ACTIVE_ID_KEY = 'royal-ai-chat:active-id' // ✨ 新增：激活ID的存储Key

const defaultSettings: AppSettings = {
  userNickname: 'User',
  modelProvider: 'local',
  ollamaUrl: '/ollama',
  defaultModel: 'qwen2.5:3b',
  cloudBaseUrl: 'https://api.deepseek.com',
  cloudApiKey: '',
  cloudModelName: 'deepseek-chat',
  defaultTemperature: 0.7,
  defaultSystemPrompt: '你是一个有帮助的助手。'
}

function now() { return Date.now() }

function createSessionHelper(args: { model: string, systemPrompt: string, title?: string }): Session {
  return {
    id: crypto.randomUUID(),
    title: args.title ?? '新会话',
    model: args.model,
    systemPrompt: args.systemPrompt,
    messages: [
      { id: crypto.randomUUID(), role: 'system', content: args.systemPrompt }
    ],
    createdAt: now(),
    updatedAt: now(),
  }
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<Session[]>([])
  const activeId = ref<string>('')
  const settings = ref<AppSettings>({ ...defaultSettings })

  const activeSession = computed(() => sessions.value.find(s => s.id === activeId.value) || null)

  function load() {
    // 1. 加载设置
    const rawSettings = localStorage.getItem(LS_SETTINGS_KEY)
    if (rawSettings) {
      try {
        settings.value = { ...defaultSettings, ...JSON.parse(rawSettings) }
      } catch (e) { console.error(e) }
    }

    // 2. 加载会话
    const rawSessions = localStorage.getItem(LS_SESSION_KEY)
    if (rawSessions) {
      try {
        sessions.value = JSON.parse(rawSessions)
      } catch { sessions.value = [] }
    }

    // 3. 兜底
    if (!sessions.value.length) {
      const s = createSessionHelper({
        model: settings.value.defaultModel,
        systemPrompt: settings.value.defaultSystemPrompt
      })
      sessions.value = [s]
      activeId.value = s.id
    }

    // 4. ✨ 新增：加载上次激活的 ID
    const savedActiveId = localStorage.getItem(LS_ACTIVE_ID_KEY)
    // 只有当保存的 ID 在当前会话列表中存在时，才使用它
    if (savedActiveId && sessions.value.find(s => s.id === savedActiveId)) {
      activeId.value = savedActiveId
    } else {
      // 否则默认选中第一个
      activeId.value = sessions.value[0]?.id ?? ''
    }

    // 数据清洗 (保持不变)
    sessions.value.forEach(s => {
      if (!s.messages?.length || s.messages[0].role !== 'system') {
        s.messages = [{ id: crypto.randomUUID(), role: 'system', content: s.systemPrompt }, ...(s.messages as any ?? [])]
      }
      s.messages = (s.messages as any[]).map(m => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        content: m.content,
      }))
    })
  }

  const persistSessions = debounce(() => {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(sessions.value))
  }, 300)

  watch(settings, () => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings.value))
  }, { deep: true })

  watch(sessions, persistSessions, { deep: true })

  // ✨ 新增：监听 activeId 变化并保存
  watch(activeId, (val) => {
    localStorage.setItem(LS_ACTIVE_ID_KEY, val)
  })

  function setActive(id: string) { activeId.value = id }

  function newSession() {
    const s = createSessionHelper({
      model: settings.value.defaultModel,
      systemPrompt: settings.value.defaultSystemPrompt
    })
    sessions.value.unshift(s)
    activeId.value = s.id
  }

  function removeSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx === -1) return
    sessions.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = sessions.value[0]?.id ?? ''
      if (!activeId.value) newSession()
    }
  }

  function renameSession(id: string, title: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.title = title.trim() || '未命名会话'
    s.updatedAt = now()
  }

  function updateModel(id: string, model: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.model = model
    s.updatedAt = now()
  }

  function updateSystemPrompt(id: string, prompt: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.systemPrompt = prompt
    if (!s.messages.length || s.messages[0].role !== 'system') {
      s.messages.unshift({ id: crypto.randomUUID(), role: 'system', content: prompt })
    } else {
      s.messages[0].content = prompt
    }
    s.updatedAt = now()
  }

  function pushMessage(id: string, msg: ChatMessage) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.messages.push({ id: crypto.randomUUID(), ...msg })
    s.updatedAt = now()
  }

  function clearMessages(id: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.messages = [{ id: crypto.randomUUID(), role: 'system', content: s.systemPrompt }]
    s.updatedAt = now()
  }

  function setTitle(id: string, title: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.title = title.trim() || s.title
    s.updatedAt = now()
  }

  function getSession(id: string) {
    return sessions.value.find(s => s.id === id) || null
  }

  return {
    sessions,
    activeId,
    settings,
    activeSession,
    load,
    setActive,
    newSession,
    removeSession,
    renameSession,
    updateModel,
    updateSystemPrompt,
    pushMessage,
    clearMessages,
    setTitle,
    getSession,
  }
})