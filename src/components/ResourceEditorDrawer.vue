<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import type { ResourceConfig, ResourceField, ResourceRow, ResourceValue } from '@/config/resources'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  config: ResourceConfig | null
  initial?: ResourceRow | null
  saving: boolean
  serverError: string
}>()

const emit = defineEmits<{ close: []; submit: [values: Record<string, ResourceValue>] }>()
const form = reactive<Record<string, ResourceValue>>({})
const errors = ref<Record<string, string>>({})

function defaultValue(field: ResourceField): ResourceValue {
  if (field.type === 'switch') return true
  if (field.type === 'number') return 0
  if (field.type === 'select') return field.options?.[0]?.value ?? ''
  return ''
}

function reset() {
  if (!props.config) return
  Object.keys(form).forEach((key) => delete form[key])
  props.config.fields.forEach((field) => {
    const value = props.mode === 'edit' && props.initial ? props.initial[field.key] : undefined
    form[field.key] = (value as ResourceValue) ?? defaultValue(field)
  })
  errors.value = {}
}

watch(() => [props.open, props.initial, props.config], () => { if (props.open) reset() }, { immediate: true, deep: true })

function submit() {
  if (!props.config) return
  const next: Record<string, string> = {}
  props.config.fields.forEach((field) => {
    if (field.required && (form[field.key] === '' || form[field.key] === null || form[field.key] === undefined)) next[field.key] = `请填写${field.label}`
  })
  errors.value = next
  if (Object.keys(next).length) return
  emit('submit', { ...form })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="adx-fade"><div v-if="open" class="adx-overlay" @click="saving ? undefined : emit('close')" /></Transition>
    <Transition name="adx-drawer">
      <aside v-if="open && config" class="adx-drawer" role="dialog" aria-modal="true" aria-labelledby="resourceEditorTitle">
        <header class="adx-drawer__head"><div><p class="adx-drawer__kicker">{{ mode === 'create' ? 'NEW RECORD' : 'EDIT RECORD' }}</p><h2 id="resourceEditorTitle" class="adx-drawer__title">{{ mode === 'create' ? `新增${config.entityLabel}` : `编辑${config.entityLabel}` }}</h2><p class="adx-drawer__description">{{ mode === 'create' ? '填写必要字段后保存，列表会自动刷新。' : `正在编辑 #${initial?.id}` }}</p></div><button class="adx-drawer__close" type="button" aria-label="关闭" :disabled="saving" @click="emit('close')"><X class="adx-icon" /></button></header>
        <div class="adx-drawer__body">
          <form id="resourceEditorForm" class="resource-form" @submit.prevent="submit">
            <label v-for="field in config.fields" :key="field.key" class="adx-field" :class="{ full: field.type === 'textarea' }">
              <span class="adx-field__label">{{ field.label }}<template v-if="field.required"> *</template></span>
              <span v-if="field.type === 'textarea'" class="adx-input-shell resource-form__textarea"><textarea v-model="form[field.key] as string" :placeholder="field.placeholder" /></span>
              <span v-else-if="field.type === 'select'" class="adx-input-shell"><select v-model="form[field.key]" :disabled="field.disabled"><option v-for="option in field.options" :key="String(option.value)" :value="option.value">{{ option.label }}</option></select></span>
              <span v-else-if="field.type === 'switch'" class="resource-form__switch"><button class="switch" :class="{ on: Boolean(form[field.key]) }" type="button" role="switch" :aria-checked="Boolean(form[field.key])" @click="form[field.key] = !form[field.key]" /><small>{{ Boolean(form[field.key]) ? '已启用' : '已停用' }}</small></span>
              <span v-else class="adx-input-shell"><input v-model="form[field.key]" :type="field.type === 'number' ? 'number' : 'text'" :placeholder="field.placeholder" :disabled="field.disabled" /></span>
              <small v-if="errors[field.key]" class="resource-form__error">{{ errors[field.key] }}</small><small v-else-if="field.hint" class="adx-field__hint">{{ field.hint }}</small>
            </label>
          </form>
        </div>
        <footer class="adx-drawer__foot"><span v-if="serverError" class="resource-form__error">{{ serverError }}</span><button class="adx-button adx-button--secondary" type="button" :disabled="saving" @click="emit('close')">取消</button><button class="adx-button adx-button--primary" form="resourceEditorForm" type="submit" :disabled="saving"><Save class="adx-icon" />{{ saving ? '保存中…' : '保存' }}</button></footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.resource-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.resource-form .full { grid-column: 1 / -1; }
.resource-form select { appearance: auto; cursor: pointer; }
.resource-form__textarea { height: 90px; padding-top: 10px; }
.resource-form__textarea textarea { height: 70px; resize: none; line-height: 1.5; }
.resource-form__switch { display: inline-flex; align-items: center; gap: 8px; min-height: 38px; }
.resource-form__switch small { color: var(--adx-text-muted); font-size: 8px; }
.resource-form__error { color: var(--adx-danger); font-size: 8px; }
</style>
