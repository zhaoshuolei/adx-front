<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const { visible, message } = storeToRefs(toast)
</script>

<template>
  <Transition name="adx-toast">
    <div v-if="visible" class="adx-floating-toast" role="status">
      <CheckCircle2 class="adx-icon" />
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>
