import { createRouter, createWebHistory } from 'vue-router'

const Chat = () => import('@/views/chat/index.vue')
const Models = () => import('@/views/models/index.vue')
const Prompts = () => import('@/views/prompts/index.vue')
const Settings = () => import('@/views/settings/index.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/chat' },
    { path: '/chat', component: Chat },
    { path: '/prompts', component: Prompts },
    { path: '/models', component: Models },
    { path: '/settings', component: Settings },
  ],
})

export default router
