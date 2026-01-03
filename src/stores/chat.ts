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

// 修改：增加 Cloud 相关配置
export type AppSettings = {
  userNickname: string

  // 模型服务商选择
  modelProvider: 'local' | 'cloud'

  // Local (Ollama) 配置
  ollamaUrl: string

  // Cloud (OpenAI/DeepSeek) 配置
  cloudBaseUrl: string
  cloudApiKey: string
  cloudModelName: string

  // 通用配置
  defaultModel: string      // 本地模式的默认模型
  defaultTemperature: number
  defaultSystemPrompt: string
}

// ==========================================
// 2. 常量与默认值
// ==========================================

const LS_SESSION_KEY = 'royal-ai-chat:sessions'
const LS_SETTINGS_KEY = 'royal-ai-chat:settings'

// 修改：增加 Cloud 默认值
const defaultSettings: AppSettings = {
  userNickname: 'User',
  modelProvider: 'local',

  // 本地默认值
  ollamaUrl: '/ollama',
  defaultModel: 'qwen2.5:3b',

  // Cloud 默认值 (默认预设为 DeepSeek，便宜好用)
  cloudBaseUrl: 'https://api.deepseek.com',
  cloudApiKey: '',
  cloudModelName: 'deepseek-chat',

  // 通用
  defaultTemperature: 0.7,
  defaultSystemPrompt: '你是一个有帮助的助手。'
}

function now() {
  return Date.now()
}

// 辅助函数：创建新会话对象
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
    // 1. 加载设置
    const rawSettings = localStorage.getItem(LS_SETTINGS_KEY)
    if (rawSettings) {
      try {
        // 使用解构合并，确保旧数据不会覆盖掉新增加的字段
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

    // 3. 兜底：如果没有会话，创建一个新的
    if (!sessions.value.length) {
      const s = createSessionHelper({
        model: settings.value.defaultModel,
        systemPrompt: settings.value.defaultSystemPrompt
      })
      sessions.value = [s]
      activeId.value = s.id
    }

    // 4. 数据清洗
    sessions.value.forEach(s => {
      if (!s.messages?.length || s.messages[0].role !== 'system') {
        s.messages = [
          { id: crypto.randomUUID(), role: 'system', content: s.systemPrompt },
          ...(s.messages as any ?? [])
        ]
      }
      s.messages = (s.messages as any[]).map(m => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        content: m.content,
      }))
    })
  }

  // --- Watchers: Persistence (持久化) ---
  const persistSessions = debounce(() => {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(sessions.value))
  }, 300)

  watch(settings, () => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings.value))
  }, { deep: true })

  watch(sessions, persistSessions, { deep: true })


  // --- Actions: Session Management ---

  function setActive(id: string) {
    activeId.value = id
  }

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