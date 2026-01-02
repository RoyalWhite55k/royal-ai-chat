import type { ChatMessage } from '@/services/ollama'
import type { Session } from '@/stores/chat'

function safeFileName(name: string) {
  return (name || 'session')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportSessionJSON(session: Session) {
  const data = {
    id: session.id,
    title: session.title,
    model: session.model,
    systemPrompt: session.systemPrompt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: session.messages,
  }
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = `${safeFileName(session.title)}_${ts}.json`
  downloadText(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
}

function roleCN(role: ChatMessage['role']) {
  return role === 'system' ? '系统' : role === 'user' ? '用户' : '助手'
}

export function exportSessionMarkdown(session: Session) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = `${safeFileName(session.title)}_${ts}.md`

  const lines: string[] = []
  lines.push(`# ${session.title}`)
  lines.push('')
  lines.push(`- 模型：${session.model}`)
  lines.push(`- 更新时间：${new Date(session.updatedAt).toLocaleString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const m of session.messages) {
    // system 也导出（你也可以选择不导出 system）
    lines.push(`## ${roleCN(m.role)}`)
    lines.push('')
    lines.push(m.content.trim())
    lines.push('')
  }

  downloadText(filename, lines.join('\n'), 'text/markdown;charset=utf-8')
}
