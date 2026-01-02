import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import debounce from 'lodash.debounce'

export type PromptTemplate = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

const LS_KEY = 'royal-ai-chat:prompts'

function now() { return Date.now() }

function defaults(): PromptTemplate[] {
  const t = now()
  return [
    {
      id: crypto.randomUUID(),
      title: '通用提问（结构化）',
      content:
        `你是{role}
        目标：{goal}
        背景/约束：{context}
        请输出：结论 + 分步方案 + 注意事项。`,
      createdAt: t, updatedAt: t,
    },
    {
      id: crypto.randomUUID(),
      title: '前端代码评审',
      content:
        `你是资深前端 Code Reviewer（{role}）。
        请评审下面内容，目标：{goal}
        上下文：{context}
        输出：问题点/风险/建议改法/可选优化。`,
      createdAt: t, updatedAt: t,
    },
    {
      id: crypto.randomUUID(),
      title: '写作生成（分段小标题）',
      content:
        `你是{role}。
        请写一篇关于「{goal}」的内容。
        背景信息：{context}
        要求：分段 + 小标题 + 逻辑清晰 + 口吻自然。`,
      createdAt: t, updatedAt: t,
    },
    {
      id: crypto.randomUUID(),
      title: '学习计划（7天）',
      content:
        `你是我的学习教练（{role}）。
        我的目标：{goal}
        我的基础/时间/限制：{context}
        请输出：7天计划（每天任务+验收标准+建议资源）。`,
      createdAt: t, updatedAt: t,
    },
    {
      id: crypto.randomUUID(),
      title: '需求拆解（产品/开发）',
      content:
        `你是{role}，请帮我把需求拆解为可开发任务。
        需求目标：{goal}
        已知信息：{context}
        输出：功能列表/接口与数据/边界与异常/拆分里程碑。`,
      createdAt: t, updatedAt: t,
    },
  ]
}

export const usePromptStore = defineStore('prompts', () => {
  const templates = ref<PromptTemplate[]>([])

  function load() {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      try {
        templates.value = JSON.parse(raw)
      } catch {
        templates.value = defaults()
      }
    } else {
      templates.value = defaults()
    }
  }

  const persist = debounce(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(templates.value))
  }, 300)

  watch(templates, persist, { deep: true })

  function upsert(tpl: { id?: string; title: string; content: string }) {
    const t = now()
    if (tpl.id) {
      const idx = templates.value.findIndex(x => x.id === tpl.id)
      if (idx !== -1) {
        templates.value[idx] = { ...templates.value[idx], ...tpl, updatedAt: t }
        return
      }
    }
    templates.value.unshift({
      id: crypto.randomUUID(),
      title: tpl.title.trim() || '未命名模板',
      content: tpl.content,
      createdAt: t,
      updatedAt: t,
    })
  }

  function remove(id: string) {
    const idx = templates.value.findIndex(x => x.id === id)
    if (idx !== -1) templates.value.splice(idx, 1)
  }

  return { templates, load, upsert, remove }
})
