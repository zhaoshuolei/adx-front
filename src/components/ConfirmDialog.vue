<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}>()

defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="adx-fade"><div v-if="open" class="adx-overlay" @click="$emit('close')" /></Transition>
    <Transition name="adx-fade">
      <section v-if="open" class="adx-modal" role="alertdialog" aria-modal="true" :aria-busy="loading">
        <span class="adx-modal__icon" :class="{ danger }"><AlertTriangle class="adx-icon" /></span>
        <h2>{{ title }}</h2><p>{{ description }}</p>
        <div class="adx-modal__actions"><button class="adx-button adx-button--secondary" type="button" :disabled="loading" @click="$emit('close')">取消</button><button class="adx-button" :class="danger ? 'adx-button--danger' : 'adx-button--primary'" type="button" :disabled="loading" @click="$emit('confirm')">{{ loading ? '处理中…' : confirmLabel || '确认' }}</button></div>
      </section>
    </Transition>
  </Teleport>
</template>
