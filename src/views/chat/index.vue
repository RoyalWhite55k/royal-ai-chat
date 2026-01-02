<template>
  <div style="display:flex; gap:12px; height: calc(100vh - 120px);">

    <!-- 左：会话列表 -->
    <el-card style="width: 260px; display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:700;">会话</div>
        <el-button type="primary" size="small" @click="chat.newSession()">新建</el-button>
      </div>

      <el-divider />

      <div style="flex:1; overflow:auto;">
        <div
          v-for="s in chat.sessions"
          :key="s.id"
          @click="chat.setActive(s.id)"
          :style="{
            padding: '10px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '8px',
            border: s.id === chat.activeId ? '1px solid var(--el-color-primary)' : '1px solid var(--el-border-color)',
            background: s.id === chat.activeId ? 'var(--el-color-primary-light-9)' : 'transparent'
          }"
        >
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              {{ s.title }}
            </div>

            <el-dropdown @command="(cmd) => onSessionCommand(cmd, s.id)">
              <el-button text>⋯</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rename">重命名</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div style="font-size:12px; opacity:.7; margin-top:4px;">
            {{ s.model }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 中：消息区 -->
    <el-card style="flex: 1; display:flex; flex-direction:column;">
      <div ref="scrollEl" style="flex:1; overflow:auto; padding:6px;">
        <div v-for="(m, i) in activeMessages" :key="i" style="margin: 10px 0;">
          <div style="font-size:12px; opacity:.7; margin-bottom:4px;">
            {{ roleLabel[m.role] ?? m.role }}
          </div>
          <div style="white-space:pre-wrap; line-height:1.7;">
            {{ m.content }}
          </div>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-top:10px;">
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
          @keydown.enter.exact.prevent="send"
        />
        <div style="display:flex; flex-direction:column; gap:8px;">
          <el-button type="primary" :loading="streaming" @click="send">发送</el-button>
          <el-button :disabled="!streaming" @click="stop">停止</el-button>
          <el-button :disabled="streaming" @click="clearChat">清空</el-button>
        </div>
      </div>
    </el-card>

    <!-- 右：会话设置 -->
    <el-card style="width: 320px;">
      <div style="font-weight:700; margin-bottom:10px;">会话设置</div>

      <el-form label-width="80px" v-if="active">
        <el-form-item label="模型">
          <el-select v-model="active.model" style="width:100%;" filterable @change="onModelChange">
            <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>

        <el-form-item label="系统提示">
          <el-input
            v-model="active.systemPrompt"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            placeholder="你是谁，你要怎么回答…"
            @input="onSystemPromptInput"
          />
        </el-form-item>
      </el-form>

      <el-divider />

      <!-- <el-alert
        type="info"
        :closable="false"
        title="提示"
        description=""
      /> -->
    </el-card>
  </div>

  <!-- 重命名弹窗 -->
  <el-dialog v-model="renameOpen" title="重命名会话" width="420px">
    <el-input v-model="renameText" placeholder="输入会话标题" />
    <template #footer>
      <el-button @click="renameOpen=false">取消</el-button>
      <el-button type="primary" @click="doRename">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ollamaChatStream, ollamaTags, type ChatMessage } from '@/services/ollama'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()

const roleLabel: Record<string, string> = {
  system: '系统',
  user: '用户',
  assistant: '助手',
}

const input = ref('')
const streaming = ref(false)
let controller: AbortController | null = null

const modelOptions = ref<string[]>(['qwen2.5:3b'])

const active = computed(() => chat.activeSession)
const activeMessages = computed(() => active.value?.messages ?? [])

const scrollEl = ref<HTMLElement | null>(null)
watch(activeMessages, async () => {
  await nextTick()
  const el = scrollEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}, { deep: true })

async function loadModels() {
  try {
    const data = await ollamaTags()
    const names = (data.models ?? []).map(x => x.name)
    if (names.length) modelOptions.value = names
  } catch {}
}
onMounted(loadModels)

function onModelChange(val: string) {
  if (!active.value) return
  chat.updateModel(active.value.id, val)
}

function onSystemPromptInput() {
  if (!active.value) return
  chat.updateSystemPrompt(active.value.id, active.value.systemPrompt)
}

function clearChat() {
  if (!active.value || streaming.value) return
  chat.clearMessages(active.value.id)
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  if (!active.value) return

  const sid = active.value.id
  input.value = ''

  chat.pushMessage(sid, { role: 'user', content: text })

  // assistant 占位：注意要用 store 里的数组引用来追加（保证响应式）
  chat.pushMessage(sid, { role: 'assistant', content: '' })
  const assistantIndex = chat.activeSession!.messages.length - 1

  streaming.value = true
  controller = new AbortController()

  // 构造 payload（直接用会话 messages）
  const payload: ChatMessage[] = chat.activeSession!.messages.map(m => ({ role: m.role, content: m.content }))

  try {
    await ollamaChatStream({
      model: chat.activeSession!.model,
      messages: payload,
      signal: controller.signal,
      onToken(t) {
        // 关键：改 store 里的那条消息（proxy），确保实时更新
        chat.activeSession!.messages[assistantIndex].content += t
      },
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      chat.activeSession!.messages[assistantIndex].content += '\n\n[已停止]'
    } else {
      chat.activeSession!.messages[assistantIndex].content += `\n\n[错误] ${e?.message ?? String(e)}`
      ElMessage.error(e?.message ?? '请求失败')
    }
  } finally {
    streaming.value = false
    controller = null
  }
}

function stop() {
  controller?.abort()
}

// 会话菜单（重命名/删除）
const renameOpen = ref(false)
const renameText = ref('')
let renameId = ''

function onSessionCommand(cmd: string, id: string) {
  if (cmd === 'rename') {
    const s = chat.sessions.find(x => x.id === id)
    renameId = id
    renameText.value = s?.title ?? ''
    renameOpen.value = true
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确认删除该会话？', '提示', { type: 'warning' })
      .then(() => chat.removeSession(id))
      .catch(() => {})
  }
}

function doRename() {
  chat.renameSession(renameId, renameText.value)
  renameOpen.value = false
}
</script>
