<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Plus, Save, X } from 'lucide-vue-next'
import type { AdSize, AdSpace, AdSpaceFormValues, AdType, MediaApp, StrategyProfile } from '@/types/api'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  initial?: AdSpace | null
  mediaOptions: MediaApp[]
  adSizeOptions: AdSize[]
  strategyOptions: StrategyProfile[]
  saving: boolean
  serverError: string
}>()

const emit = defineEmits<{ close: []; submit: [values: AdSpaceFormValues] }>()
const errors = ref<Record<string, string>>({})
const form = reactive<AdSpaceFormValues>({
  mediaId: 0,
  name: '',
  adSlotId: '',
  adType: 'BANNER',
  adStatus: 'PRODUCTION',
  enabled: true,
  templateRendering: false,
  discount: 100,
  tag: '',
  priceFloor: 0,
  adSizeId: undefined,
  strategyProfileId: undefined,
})

function reset() {
  errors.value = {}
  const item = props.initial
  Object.assign(form, item ? {
    mediaId: item.mediaId,
    name: item.name,
    adSlotId: item.adSlotId,
    adType: item.adType,
    adStatus: item.adStatus,
    enabled: item.enabled,
    templateRendering: item.templateRendering,
    discount: item.discountPercent,
    tag: item.tag,
    priceFloor: item.priceFloor,
    adSizeId: undefined,
    strategyProfileId: item.strategyProfileId,
  } : {
    mediaId: props.mediaOptions[0]?.id || 0,
    name: '',
    adSlotId: '',
    adType: 'BANNER',
    adStatus: 'PRODUCTION',
    enabled: true,
    templateRendering: false,
    discount: 100,
    tag: '',
    priceFloor: 0,
    adSizeId: undefined,
    strategyProfileId: undefined,
  })
}

watch(() => [props.open, props.initial, props.mediaOptions.length], () => { if (props.open) reset() }, { immediate: true })

function validate() {
  const next: Record<string, string> = {}
  if (!form.mediaId) next.mediaId = '请选择媒体应用'
  if (!form.name.trim()) next.name = '请输入广告位名称'
  if (form.name.length > 100) next.name = '名称不能超过 100 个字符'
  if (!form.adSlotId.trim()) next.adSlotId = '请输入广告位业务 ID'
  if (!/^[a-zA-Z0-9_-]+$/.test(form.adSlotId)) next.adSlotId = '仅允许字母、数字、下划线和短横线'
  if (form.discount < 0 || form.discount > 100) next.discount = '折扣范围为 0-100'
  if (form.priceFloor < 0) next.priceFloor = '底价不能小于 0'
  errors.value = next
  return Object.keys(next).length === 0
}

function submit() {
  if (!validate()) return
  emit('submit', { ...form, tag: form.tag.trim(), name: form.name.trim(), adSlotId: form.adSlotId.trim() })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="adx-fade"><div v-if="open" class="adx-overlay" @click="saving ? undefined : emit('close')" /></Transition>
    <Transition name="adx-drawer">
      <aside v-if="open" class="adx-drawer adx-drawer--wide" role="dialog" aria-modal="true" aria-labelledby="adSpaceEditorTitle">
        <header class="adx-drawer__head"><div><p class="adx-drawer__kicker">{{ mode === 'create' ? 'NEW AD SPACE' : 'EDIT AD SPACE' }}</p><h2 id="adSpaceEditorTitle" class="adx-drawer__title">{{ mode === 'create' ? '新增广告位' : '编辑广告位' }}</h2><p class="adx-drawer__description">{{ mode === 'create' ? '创建后广告位业务 ID 将用于客户端和引擎配置。' : `正在编辑 #${initial?.id} · ${initial?.adSlotId}` }}</p></div><button class="adx-drawer__close" type="button" aria-label="关闭" :disabled="saving" @click="emit('close')"><X class="adx-icon" /></button></header>
        <div class="adx-drawer__body">
          <form id="adSpaceForm" class="ad-space-form" @submit.prevent="submit">
            <div class="ad-space-form__section"><h3>基础信息</h3><div class="ad-space-form__grid">
              <label class="adx-field"><span class="adx-field__label">媒体应用 *</span><span class="adx-input-shell"><select v-model.number="form.mediaId" :disabled="mode === 'edit'"><option :value="0">请选择</option><option v-for="media in mediaOptions" :key="media.id" :value="media.id">{{ media.appName }}</option></select></span><small v-if="errors.mediaId" class="ad-space-form__error">{{ errors.mediaId }}</small></label>
              <label class="adx-field"><span class="adx-field__label">广告类型 *</span><span class="adx-input-shell"><select v-model="form.adType"><option value="BANNER">横幅</option><option value="VIDEO">激励视频</option><option value="NATIVE">原生</option><option value="SPLASH">开屏</option><option value="INTERSTITIAL">插屏</option></select></span></label>
              <label class="adx-field ad-space-form__full"><span class="adx-field__label">广告位名称 *</span><span class="adx-input-shell"><input v-model="form.name" maxlength="100" placeholder="例如：乐商店-首页横幅" /></span><small v-if="errors.name" class="ad-space-form__error">{{ errors.name }}</small></label>
              <label class="adx-field ad-space-form__full"><span class="adx-field__label">广告位业务 ID *</span><span class="adx-input-shell"><input v-model="form.adSlotId" maxlength="100" placeholder="例如：banner_home_01" /></span><small v-if="errors.adSlotId" class="ad-space-form__error">{{ errors.adSlotId }}</small></label>
            </div></div>

            <div class="ad-space-form__section"><h3>投放配置</h3><div class="ad-space-form__grid">
              <label class="adx-field"><span class="adx-field__label">广告状态</span><span class="adx-input-shell"><select v-model="form.adStatus"><option value="PRODUCTION">正式投放</option><option value="TEST">测试</option></select></span></label>
              <label class="adx-field"><span class="adx-field__label">广告尺寸</span><span class="adx-input-shell"><select v-model="form.adSizeId"><option :value="undefined">不限制</option><option v-for="size in adSizeOptions" :key="size.id" :value="size.id">{{ size.name }} · {{ size.width }}×{{ size.height }}</option></select></span></label>
              <label class="adx-field"><span class="adx-field__label">底价（元）</span><span class="adx-input-shell"><input v-model.number="form.priceFloor" type="number" min="0" step="0.01" /></span><small v-if="errors.priceFloor" class="ad-space-form__error">{{ errors.priceFloor }}</small></label>
              <label class="adx-field"><span class="adx-field__label">折扣（%）</span><span class="adx-input-shell"><input v-model.number="form.discount" type="number" min="0" max="100" step="1" /></span><small v-if="errors.discount" class="ad-space-form__error">{{ errors.discount }}</small></label>
              <label class="adx-field ad-space-form__full"><span class="adx-field__label">分组策略方案</span><span class="adx-input-shell"><select v-model="form.strategyProfileId"><option :value="undefined">不绑定策略方案</option><option v-for="strategy in strategyOptions" :key="strategy.id" :value="strategy.id">{{ strategy.name }} · {{ strategy.code }}</option></select></span></label>
              <label class="adx-field ad-space-form__full"><span class="adx-field__label">标签</span><span class="adx-input-shell"><input v-model="form.tag" maxlength="500" placeholder="多个标签使用逗号分隔" /></span></label>
            </div></div>

            <div class="ad-space-form__section"><h3>开关</h3><div class="ad-space-form__switches"><label><button class="switch" :class="{ on: form.enabled }" type="button" role="switch" :aria-checked="form.enabled" @click="form.enabled = !form.enabled" /><span><strong>启用广告位</strong><small>关闭后不再参与竞价和投放。</small></span></label><label><button class="switch" :class="{ on: form.templateRendering }" type="button" role="switch" :aria-checked="form.templateRendering" @click="form.templateRendering = !form.templateRendering" /><span><strong>模板渲染</strong><small>由 ADX 使用模板统一渲染创意。</small></span></label></div></div>
          </form>
        </div>
        <footer class="adx-drawer__foot"><span v-if="serverError" class="ad-space-form__server-error">{{ serverError }}</span><button class="adx-button adx-button--secondary" type="button" :disabled="saving" @click="emit('close')">取消</button><button class="adx-button adx-button--primary" form="adSpaceForm" type="submit" :disabled="saving"><component :is="mode === 'create' ? Plus : Save" class="adx-icon" />{{ saving ? '保存中…' : (mode === 'create' ? '创建广告位' : '保存修改') }}</button></footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ad-space-form { display: grid; gap: 18px; }
.ad-space-form__section { padding: 16px; border-radius: 14px; background: var(--adx-surface-muted); }
.ad-space-form__section h3 { margin: 0 0 14px; font-size: 11px; }
.ad-space-form__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.ad-space-form__full { grid-column: 1 / -1; }
.ad-space-form__grid select { appearance: auto; cursor: pointer; }
.ad-space-form__grid select:disabled { cursor: not-allowed; opacity: .6; }
.ad-space-form__error { color: var(--adx-danger); font-size: 8px; }
.ad-space-form__server-error { color: var(--adx-danger); }
.ad-space-form__switches { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.ad-space-form__switches > label { display: flex; align-items: center; gap: 10px; padding: 11px; border-radius: 11px; background: var(--adx-surface); }
.ad-space-form__switches strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.ad-space-form__switches small { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; line-height: 1.4; }
</style>
