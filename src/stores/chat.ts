import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import debounce from 'lodash.debounce'
import type { ChatMessage } from '@/services/ollama'

export type Session = {
  id: string
  title: string
  model: string
  systemPrompt: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const LS_KEY = 'royal-ai-chat:sessions'
const LS_LAST_MODEL = 'royal-ai-chat:lastModel'

function now() {
  return Date.now()
}

function createSession(init?: Partial<Session>): Session {
  const model = init?.model ?? localStorage.getItem(LS_LAST_MODEL) ?? 'qwen2.5:3b'
  const systemPrompt = init?.systemPrompt ?? '你是一个有帮助的助手。'

  return {
    id: crypto.randomUUID(),
    title: init?.title ?? '新会话',
    model,
    systemPrompt,
    messages: [{ role: 'system', content: systemPrompt }],
    createdAt: now(),
    updatedAt: now(),
  }
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<Session[]>([])
  const activeId = ref<string>('')

  const activeSession = computed(() => sessions.value.find(s => s.id === activeId.value) || null)

  function load() {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      try {
        sessions.value = JSON.parse(raw)
        activeId.value = sessions.value[0]?.id ?? ''
      } catch {
        sessions.value = []
        activeId.value = ''
      }
    }

    if (!sessions.value.length) {
      const s = createSession()
      sessions.value = [s]
      activeId.value = s.id
    }

    // 修复：确保每个会话第一条是 system
    sessions.value.forEach(s => {
      if (!s.messages?.length || s.messages[0].role !== 'system') {
        s.messages = [{ role: 'system', content: s.systemPrompt }, ...(s.messages ?? [])]
      }
    })
  }

  const persist = debounce(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(sessions.value))
  }, 300)

  watch(sessions, persist, { deep: true })

  function setActive(id: string) {
    activeId.value = id
  }

  function newSession() {
    const s = createSession()
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
    localStorage.setItem(LS_LAST_MODEL, model)
  }

  function updateSystemPrompt(id: string, prompt: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.systemPrompt = prompt
    if (!s.messages.length || s.messages[0].role !== 'system') {
      s.messages.unshift({ role: 'system', content: prompt })
    } else {
      s.messages[0].content = prompt
    }
    s.updatedAt = now()
  }

  function pushMessage(id: string, msg: ChatMessage) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.messages.push(msg)
    s.updatedAt = now()
  }

  function clearMessages(id: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.messages = [{ role: 'system', content: s.systemPrompt }]
    s.updatedAt = now()
  }

  function setTitle(id: string, title: string) {
    const s = sessions.value.find(x => x.id === id)
    if (!s) return
    s.title = title.trim() || s.title
    s.updatedAt = now()
  }

  return {
    sessions,
    activeId,
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
  }
})
