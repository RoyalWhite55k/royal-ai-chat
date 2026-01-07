<template>
  <div class="markdown-body" v-html="renderedContent" @click="handleCopy"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css' // 引入代码高亮样式

const props = defineProps<{ content: string }>()

const md:any = new MarkdownIt({
  html: false, // 禁止 HTML 标签，防止 XSS 攻击
  linkify: true, // 自动识别链接
  breaks: true, // 换行符转 <br>
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const renderedContent = computed(() => {
  return md.render(props.content || '')
})

// 可选：简单的点击复制功能（这里可以后续优化为专门的复制按钮）
const handleCopy = async (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'CODE' && target.parentElement?.tagName === 'PRE') {
    // 这里可以后续加复制逻辑
  }
}
</script>

<style lang="scss">
/* 这里使用非 scoped 样式，因为 v-html 内部的内容需要全局样式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.6;
  color: #24292e;
  
  /* 基础排版 */
  p { margin-bottom: 12px; }
  ul, ol { padding-left: 20px; margin-bottom: 12px; }
  h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
  h1 { font-size: 1.8em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
  blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding: 0 1em; margin: 0 0 16px 0; }
  
  /* 代码块样式 */
  pre {
    background-color: #282c34;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
    margin-bottom: 16px;
    
    code {
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      background: transparent;
      padding: 0;
      color: #abb2bf;
    }
  }

  /* 行内代码 */
  :not(pre) > code {
    background-color: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 6px;
    font-family: monospace;
    font-size: 85%;
  }
  
  /* 链接 */
  a { color: #0366d6; text-decoration: none; &:hover { text-decoration: underline; } }
  
  /* 表格 */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    tr:nth-child(2n) { background-color: #f6f8fa; }
  }
}
</style>