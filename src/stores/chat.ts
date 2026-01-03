import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import debounce from 'lodash.debounce'
import type { ChatMessage } from '@/services/ollama'

// ==========================================
// 1. 类型定义 
// ==========================================

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

// 新增：应用全局设置类型
export type AppSettings = {
  theme: 'light' | 'dark' | 'auto'
  sendKey: 'Enter' | 'Ctrl+Enter'
  ollamaUrl: string
  defaultModel: string
  defaultTemperature: number
  defaultSystemPrompt: string
}

// ==========================================
// 2. 常量与默认值
// ==========================================

const LS_SESSION_KEY = 'royal-ai-chat:sessions'
const LS_SETTINGS_KEY = 'royal-ai-chat:settings'

// 默认设置配置
const defaultSettings: AppSettings = {
  theme: 'auto',
  sendKey: 'Enter',
  ollamaUrl: '/ollama',
  defaultModel: 'qwen2.5:3b',
  defaultTemperature: 0.7,
  defaultSystemPrompt: '你是一个有帮助的助手。'
}

function now() {
  return Date.now()
}

// 辅助函数：创建新会话对象
// 注意：现在它接收参数，不再自己去读 localStorage，由 Store 传入
function createSessionHelper(args: {
  model: string,
  systemPrompt: string,
  title?: string
}): Session {
  return {
    id: crypto.randomUUID(),
    title: args.title ?? '新会话',
    model: args.model,
    systemPrompt: args.systemPrompt,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'system',
        content: args.systemPrompt
      }
    ],
    createdAt: now(),
    updatedAt: now(),
  }
}

// ==========================================
// 3. Store 定义
// ==========================================

export const useChatStore = defineStore('chat', () => {
  // --- State ---
  const sessions = ref<Session[]>([])
  const activeId = ref<string>('')
  const settings = ref<AppSettings>({ ...defaultSettings })

  // --- Computed ---
  const activeSession = computed(() => sessions.value.find(s => s.id === activeId.value) || null)

  // --- Actions: Load (初始化) ---
  function load() {
    // 1. 加载设置 (必须先加载设置，因为新建会话可能依赖它)
    const rawSettings = localStorage.getItem(LS_SETTINGS_KEY)
    if (rawSettings) {
      try {
        // 使用解构合并，确保如果未来加了新配置项，旧数据里没有也不会报错
        settings.value = { ...defaultSettings, ...JSON.parse(rawSettings) }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }

    // 2. 加载会话
    const rawSessions = localStorage.getItem(LS_SESSION_KEY)
    if (rawSessions) {
      try {
        sessions.value = JSON.parse(rawSessions)
        activeId.value = sessions.value[0]?.id ?? ''
      } catch {
        sessions.value = []
        activeId.value = ''
      }
    }

    // 3.如果没有会话，创建一个新的
    if (!sessions.value.length) {
      const s = createSessionHelper({
        model: settings.value.defaultModel,
        systemPrompt: settings.value.defaultSystemPrompt
      })
      sessions.value = [s]
      activeId.value = s.id
    }

    // 4. 数据清洗/迁移 (防止旧数据结构不兼容)
    sessions.value.forEach(s => {
      // 确保有 System Message
      if (!s.messages?.length || s.messages[0].role !== 'system') {
        s.messages = [
          { id: crypto.randomUUID(), role: 'system', content: s.systemPrompt },
          ...(s.messages as any ?? [])
        ]
      }
      // 确保每条消息都有 ID
      s.messages = (s.messages as any[]).map(m => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        content: m.content,
      }))
    })
  }

  // --- Watchers: Persistence (持久化) ---

  // 会话持久化 (防抖 300ms)
  const persistSessions = debounce(() => {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(sessions.value))
  }, 300)

  // 设置持久化 (立即保存，不需要防抖，因为修改频率低)
  watch(settings, () => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings.value))
  }, { deep: true })

  watch(sessions, persistSessions, { deep: true })


  // --- Actions: Session Management ---

  function setActive(id: string) {
    activeId.value = id
  }

  function newSession() {
    // 使用当前设置里的默认模型和提示词
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

    // 如果删除了当前选中的，选中第一个；如果删光了，新建一个
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

    // 注意：不再保存 LS_LAST_MODEL，因为我们有了 settings.defaultModel
    // 如果你希望用户选的模型自动变成下次的默认模型，可以解开下面这行注释：
    // settings.value.defaultModel = model 
  }

  function updateSystemPrompt(id: string, prompt: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.systemPrompt = prompt
    // 同时更新消息列表里的第一条 System Message
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
    // 清空时保留 System Prompt
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
    // State
    sessions,
    activeId,
    settings, // 导出设置

    // Computed
    activeSession,

    // Actions
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