export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OllamaChatChunk = {
  message?: { role: 'assistant'; content: string }
  done?: boolean
  error?: string
}

// 获取本地模型列表
export async function ollamaTags() {
  const res = await fetch('/ollama/api/tags')
  if (!res.ok) throw new Error(`tags 失败：${res.status}`)
  return res.json() as Promise<{
    models: Array<{ name: string; size: number; modified_at: string }>
  }>
}

// 流式对话
export async function ollamaChatStream(args: {
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
  onToken: (t: string) => void
}) {
  const res = await fetch('/ollama/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: args.signal,
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      stream: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`chat 失败：${res.status} ${text}`)
  }
  if (!res.body) throw new Error('ReadableStream 不存在')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line) continue

      const data = JSON.parse(line) as OllamaChatChunk
      if (data.error) throw new Error(data.error)
      if (data.message?.content) args.onToken(data.message.content)
      if (data.done) return
    }
  }
}

export async function ollamaChatOnce(args: {
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
}) {
  const res = await fetch('/ollama/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: args.signal,
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`chatOnce 失败：${res.status} ${text}`)
  }

  const data = await res.json() as { message?: { content?: string } }
  return (data.message?.content ?? '').trim()
}


