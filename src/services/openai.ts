import type { ChatMessage } from './ollama'

export interface OpenAIChatOptions {
  apiKey: string
  baseUrl: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  onToken: (text: string) => void
  signal?: AbortSignal
}

export async function openaiChatStream(options: OpenAIChatOptions) {
  let url = options.baseUrl.trim()

  if (url.includes('googleapis.com')) {
    url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  }
  else if (!url.endsWith('/chat/completions')) {
    url = url.replace(/\/+$/, '') + '/chat/completions'
  }

  console.log('🚀 [Request] URL:', url)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      temperature: options.temperature ?? 0.7
    }),
    signal: options.signal
  })

  // --- 错误处理 ---
  if (!res.ok) {
    let errText = await res.text().catch(() => '')
    try {
      const errJson = JSON.parse(errText)
      if (errJson?.error?.message) {
        errText = errJson.error.message
      }
    } catch { }

    console.error('API Error:', errText)
    throw new Error(`Cloud API Error (${res.status}): ${errText}`)
  }

  if (!res.body) throw new Error('Response body is empty')

  // --- SSE 解析 ---
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimLine = line.trim()
      if (!trimLine || trimLine === 'data: [DONE]') continue

      if (trimLine.startsWith('data: ')) {
        try {
          const jsonStr = trimLine.slice(6)
          const data = JSON.parse(jsonStr)
          const content = data.choices?.[0]?.delta?.content || ''
          if (content) options.onToken(content)
        } catch (e) { }
      }
    }
  }
}