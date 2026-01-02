<template>
  <el-card>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-weight:700;">本地模型（Ollama /api/tags）</div>
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>
    <el-divider />
    <el-alert
      type="info"
      :closable="false"
      title="说明"
      description="需要本机已启动 Ollama 服务（默认 http://localhost:11434）。"
      style="margin-bottom:12px;"
    />

    <el-table :data="models" v-loading="loading" style="width:100%;">
      <el-table-column prop="name" label="模型名" />
      <el-table-column prop="size" label="大小" />
      <el-table-column prop="modified_at" label="更新时间" />
    </el-table>

    <el-empty v-if="!loading && models.length===0" description="没有读取到模型（请先 ollama pull 一个模型）" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ollamaTags } from '@/services/ollama'

const loading = ref(false)
const models = ref<Array<{ name: string; size: number; modified_at: string }>>([])

async function load() {
  loading.value = true
  try {
    const data = await ollamaTags()
    models.value = data.models ?? []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>

</style>