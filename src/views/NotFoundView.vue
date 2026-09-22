<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, SearchX } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <main class="not-found"><SearchX class="adx-icon" /><h1>页面不存在</h1><p>请求的路由没有对应页面，或地址已发生变化。</p><button class="adx-button adx-button--primary" type="button" @click="router.push('/overview')"><ArrowLeft class="adx-icon" />返回投放总览</button></main>
</template>

<style scoped>
.not-found { display: grid; place-items: center; align-content: center; width: 100%; height: 100vh; color: var(--adx-text-strong); background: var(--adx-bg-app); text-align: center; }
.not-found > .adx-icon { width: 42px; height: 42px; color: var(--adx-success); }
.not-found h1 { margin: 18px 0 0; font-size: 24px; }
.not-found p { margin: 8px 0 18px; color: var(--adx-text-muted); font-size: 11px; }
</style>
