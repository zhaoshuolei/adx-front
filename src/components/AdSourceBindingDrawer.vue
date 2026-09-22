<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Link2, Save, Search, Unlink, X } from 'lucide-vue-next'
import type { AdSource, AdSpace } from '@/types/api'

const props = defineProps<{
  open: boolean
  adSpace: AdSpace | null
  sources: AdSource[]
  boundIds: number[]
  loading: boolean
  saving: boolean
  error: string
}>()

const emit = defineEmits<{ close: []; save: [ids: number[]] }>()
const query = ref('')
const selected = ref<Set<number>>(new Set())
const touched = ref(false)

watch(() => [props.open, props.boundIds], () => {
  if (!props.open) return
  selected.value = new Set(props.boundIds)
  touched.value = false
  query.value = ''
}, { deep: true })

const visibleSources = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return props.sources
  return props.sources.filter((source) => `${source.sourceName} ${source.sourceId}`.toLowerCase().includes(keyword))
})

const changes = computed(() => {
  const current = new Set(props.boundIds)
  const bindCount = [...selected.value].filter((id) => !current.has(id)).length
  const unbindCount = [...current].filter((id) => !selected.value.has(id)).length
  return { bindCount, unbindCount }
})

function toggle(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
  touched.value = true
}

function selectVisible() {
  const next = new Set(selected.value)
  visibleSources.value.forEach((source) => next.add(source.id))
  selected.value = next
  touched.value = true
}

function clearVisible() {
  const next = new Set(selected.value)
  visibleSources.value.forEach((source) => next.delete(source.id))
  selected.value = next
  touched.value = true
}
</script>

<template>
  <Teleport to="body">
    <Transition name="adx-fade"><div v-if="open" class="adx-overlay" @click="saving ? undefined : emit('close')" /></Transition>
    <Transition name="adx-drawer">
      <aside v-if="open" class="adx-drawer adx-drawer--wide" role="dialog" aria-modal="true" aria-labelledby="bindingDrawerTitle">
        <header class="adx-drawer__head"><div><p class="adx-drawer__kicker">AD SOURCE BINDING</p><h2 id="bindingDrawerTitle" class="adx-drawer__title">管理广告源绑定</h2><p class="adx-drawer__description">{{ adSpace?.name }} · {{ adSpace?.adSlotId }}</p></div><button class="adx-drawer__close" type="button" aria-label="关闭" :disabled="saving" @click="emit('close')"><X class="adx-icon" /></button></header>
        <div class="adx-drawer__body">
          <div class="binding-toolbar"><label class="adx-input-shell"><Search class="adx-icon" /><input v-model="query" placeholder="搜索广告源名称或标识" /></label><button class="adx-button adx-button--secondary" type="button" @click="selectVisible">选择可见</button><button class="adx-button adx-button--secondary" type="button" @click="clearVisible">取消可见</button></div>
          <div class="binding-summary"><span><Link2 class="adx-icon" />当前已绑定 <strong>{{ boundIds.length }}</strong></span><span>待绑定 <strong>{{ changes.bindCount }}</strong></span><span>待解绑 <strong>{{ changes.unbindCount }}</strong></span></div>
          <div v-if="loading" class="binding-loading"><div v-for="index in 5" :key="index" class="adx-skeleton" /></div>
          <div v-else-if="error" class="binding-state"><Unlink class="adx-icon" /><strong>广告源加载失败</strong><span>{{ error }}</span></div>
          <div v-else-if="visibleSources.length" class="binding-list">
            <label v-for="source in visibleSources" :key="source.id" class="binding-item" :class="{ selected: selected.has(source.id) }">
              <input type="checkbox" :checked="selected.has(source.id)" @change="toggle(source.id)" />
              <span class="binding-check"><Check class="adx-icon" /></span>
              <span class="binding-copy"><strong>{{ source.sourceName }}</strong><small>{{ source.sourceId }} · DSP #{{ source.dspConfigId }} · eCPM ¥{{ (source.actualEcpm || source.estEcpm || 0).toFixed(2) }}</small></span>
              <span class="adx-status" :class="source.enabled && source.adStatus === 'production' ? 'adx-status--success' : 'adx-status--warning'">{{ source.enabled && source.adStatus === 'production' ? '可用' : '申请中' }}</span>
            </label>
          </div>
          <div v-else class="binding-state"><Search class="adx-icon" /><strong>没有匹配的广告源</strong><span>调整关键词后重试。</span></div>
        </div>
        <footer class="adx-drawer__foot"><span>{{ touched ? `将变更 ${changes.bindCount + changes.unbindCount} 项绑定关系` : '尚未修改绑定关系' }}</span><button class="adx-button adx-button--secondary" type="button" :disabled="saving" @click="emit('close')">取消</button><button class="adx-button adx-button--primary" type="button" :disabled="saving || (!changes.bindCount && !changes.unbindCount)" @click="emit('save', [...selected])"><Save class="adx-icon" />{{ saving ? '保存中…' : '保存绑定' }}</button></footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.binding-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; }
.binding-toolbar .adx-input-shell { min-width: 0; }
.binding-summary { display: flex; align-items: center; gap: 15px; margin-top: 13px; padding: 10px 11px; border-radius: 11px; color: var(--adx-text-muted); background: var(--adx-surface-muted); font-size: 8px; }
.binding-summary span { display: inline-flex; align-items: center; gap: 5px; }
.binding-summary .adx-icon { width: 13px; height: 13px; color: var(--adx-success); }
.binding-summary strong { color: var(--adx-text-strong); }
.binding-list { display: grid; gap: 7px; margin-top: 13px; }
.binding-item { position: relative; display: grid; grid-template-columns: 0 22px minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 11px 12px; border: 1px solid transparent; border-radius: 12px; background: var(--adx-surface-muted); cursor: pointer; }
.binding-item:hover { background: var(--adx-surface-hover); }
.binding-item.selected { border-color: var(--adx-brand-500); background: var(--adx-brand-soft); }
.binding-item input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.binding-check { display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--adx-text-faint); border-radius: 7px; color: transparent; background: var(--adx-surface); }
.binding-item.selected .binding-check { border-color: var(--adx-brand-500); color: #fff; background: var(--adx-brand-500); }
.binding-check .adx-icon { width: 12px; height: 12px; }
.binding-copy strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.binding-copy small { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; }
.binding-loading { display: grid; gap: 8px; margin-top: 13px; }
.binding-loading .adx-skeleton { height: 55px; }
.binding-state { display: grid; place-items: center; align-content: center; min-height: 260px; color: var(--adx-text-muted); text-align: center; }
.binding-state .adx-icon { width: 28px; height: 28px; color: var(--adx-warning); }
.binding-state strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.binding-state span { margin-top: 5px; font-size: 8px; }
</style>
