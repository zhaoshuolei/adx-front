<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CircleDashed, ListChecks } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const title = computed(() => String(route.meta.title || 'P0 页面'))
const moduleName = computed(() => String(route.meta.module || 'ADX'))
const purpose = computed(() => String(route.meta.purpose || ''))
const endpoints = computed(() => Array.isArray(route.meta.endpoints) ? route.meta.endpoints as string[] : [])
</script>

<template>
  <div class="placeholder-page">
    <header class="adx-page-header">
      <div><p class="adx-page-kicker">{{ moduleName }} · P0 交付</p><h1 class="adx-page-title">{{ title }}</h1><p class="adx-page-description">{{ purpose }}</p></div>
      <button class="adx-button adx-button--secondary" type="button" @click="router.push('/overview')"><ArrowLeft class="adx-icon" />返回总览</button>
    </header>
    <section class="adx-panel placeholder-panel">
      <div class="placeholder-state"><span class="placeholder-icon"><CircleDashed class="adx-icon" /></span><h2>页面骨架已进入 P0 队列</h2><p>路由、模块归属、接口范围和必备状态已经确定，下一步按页面清单逐项实现列表、筛选与表单交互。</p></div>
      <div class="placeholder-api"><h3><ListChecks class="adx-icon" />已映射接口</h3><div><code v-for="endpoint in endpoints" :key="endpoint">{{ endpoint }}</code></div></div>
    </section>
  </div>
</template>

<style scoped>
.placeholder-panel { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(360px, .65fr); min-height: 380px; padding: 28px; gap: 24px; }
.placeholder-state { display: grid; align-content: center; justify-items: start; }
.placeholder-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 15px; color: var(--adx-success); background: var(--adx-brand-soft); }
.placeholder-icon .adx-icon { width: 22px; height: 22px; }
.placeholder-state h2 { margin: 18px 0 0; font-size: 18px; }
.placeholder-state p { max-width: 540px; margin: 9px 0 0; color: var(--adx-text-muted); font-size: 10px; line-height: 1.7; }
.placeholder-api { align-self: center; padding: 18px; border-radius: 15px; background: var(--adx-surface-muted); }
.placeholder-api h3 { display: flex; align-items: center; gap: 7px; margin: 0 0 11px; font-size: 11px; }
.placeholder-api h3 .adx-icon { width: 15px; height: 15px; color: var(--adx-success); }
.placeholder-api > div { display: grid; gap: 7px; }
.placeholder-api code { display: block; padding: 8px 9px; border-radius: 8px; color: var(--adx-text-body); background: var(--adx-surface); font-family: "Cascadia Code", Consolas, monospace; font-size: 8px; white-space: normal; overflow-wrap: anywhere; }
</style>
