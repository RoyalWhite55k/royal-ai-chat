<template>
  <div style="display:flex; gap:12px;">
    <!-- 左：模板列表 -->
    <el-card style="width: 320px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:700;">模板库</div>
        <el-button type="primary" size="small" @click="createNew">新建</el-button>
      </div>

      <el-divider />

      <div style="display:flex; flex-direction:column; gap:8px;">
        <div
          v-for="t in store.templates"
          :key="t.id"
          @click="select(t.id)"
          :style="{
            padding:'10px',
            borderRadius:'8px',
            cursor:'pointer',
            border: t.id===activeId ? '1px solid var(--el-color-primary)' : '1px solid var(--el-border-color)',
            background: t.id===activeId ? 'var(--el-color-primary-light-9)' : 'transparent'
          }"
        >
          <div style="font-weight:600; display:flex; justify-content:space-between; gap:8px;">
            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 220px;">
              {{ t.title }}
            </div>

            <el-dropdown @command="(cmd) => onCommand(cmd, t.id)">
              <el-button text>⋯</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="use">使用</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div style="font-size:12px; opacity:.7; margin-top:6px;">
            {{ preview(t.content) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 右：编辑区 -->
    <el-card style="flex:1;">
      <template v-if="active">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:700;">编辑模板</div>
          <el-button type="primary" @click="save">保存</el-button>
        </div>

        <el-divider />

        <el-form label-width="80px">
          <el-form-item label="标题">
            <el-input v-model="draft.title" placeholder="比如：前端代码评审" />
          </el-form-item>

          <el-form-item label="内容">
            <el-input
              v-model="draft.content"
              type="textarea"
              :autosize="{ minRows: 12, maxRows: 20 }"
              placeholder="支持变量：{role} {goal} {context}"
            />
          </el-form-item>
        </el-form>

        <el-alert
          type="info"
          :closable="false"
          title="变量说明"
          description="在 chat 页使用时会替换：{role}、{goal}、{context}。"
        />
      </template>

      <el-empty v-else description="请选择或新建一个模板" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePromptStore } from '@/stores/prompts'
import { useRouter } from 'vue-router'

const store = usePromptStore()
const router = useRouter()

const activeId = ref('')
const active = computed(() => store.templates.find(t => t.id === activeId.value) || null)

const draft = reactive({ id: '', title: '', content: '' })

watch(active, (t) => {
  if (!t) return
  draft.id = t.id
  draft.title = t.title
  draft.content = t.content
}, { immediate: true })

function preview(s: string) {
  return (s || '').replace(/\s+/g, ' ').slice(0, 40) + ((s?.length ?? 0) > 40 ? '…' : '')
}

function select(id: string) {
  activeId.value = id
}

function createNew() {
  store.upsert({ title: '新模板', content: '你是{role}\n目标：{goal}\n上下文：{context}\n请输出：结论 + 分步方案。' })
  activeId.value = store.templates[0].id
  ElMessage.success('已创建模板')
}

function save() {
  if (!draft.id) return
  store.upsert({ id: draft.id, title: draft.title, content: draft.content })
  ElMessage.success('已保存')
}

function onCommand(cmd: string, id: string) {
  if (cmd === 'use') {
    router.push({ path: '/chat', query: { tpl: id } })
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('确认删除该模板？', '提示', { type: 'warning' })
      .then(() => {
        store.remove(id)
        if (activeId.value === id) activeId.value = store.templates[0]?.id ?? ''
      })
      .catch(() => {})
  }
}
</script>
