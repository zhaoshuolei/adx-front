<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, CircleAlert, Clock3, History, RefreshCw, RotateCcw, Save, Search, SlidersHorizontal, X } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { getRuntimeConfigHistory, getRuntimeConfigs, rollbackRuntimeConfig, updateRuntimeConfig, type RuntimeConfigHistory, type RuntimeConfigRecord } from '@/services/special'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const loading = ref(true)
const error = ref('')
const rows = ref<RuntimeConfigRecord[]>([])
const keyword = ref('')
const scope = ref('')
const category = ref('')
const editOpen = ref(false)
const editTarget = ref<RuntimeConfigRecord | null>(null)
const editValue = ref('')
const saving = ref(false)
const historyOpen = ref(false)
const historyLoading = ref(false)
const history = ref<RuntimeConfigHistory[]>([])
const rollbackTarget = ref<RuntimeConfigHistory | null>(null)
const rollingBack = ref(false)

const filtered = computed(() => rows.value.filter((row) => {
  const query = keyword.value.trim().toLowerCase()
  if (query && !`${row.configKey} ${row.description}`.toLowerCase().includes(query)) return false
  if (scope.value && row.scope !== scope.value) return false
  if (category.value && row.category !== category.value) return false
  return true
}))

const stats = computed(() => ({
  total: rows.value.length,
  immediate: rows.value.filter((row) => row.category === 'immediate').length,
  restart: rows.value.filter((row) => row.category === 'restart').length,
  secrets: rows.value.filter((row) => row.configKey.toLowerCase().includes('secret') || row.configKey.toLowerCase().includes('key')).length,
}))

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await getRuntimeConfigs(auth.accessToken)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '运行时配置加载失败'
  } finally {
    loading.value = false
  }
}

function openEdit(row: RuntimeConfigRecord) {
  editTarget.value = row
  editValue.value = row.configKey.includes('secret') ? '' : row.configValue
  editOpen.value = true
}

async function save() {
  if (!editTarget.value) return
  if (editValue.value === '') { toast.show('请输入新的配置值'); return }
  saving.value = true
  try {
    const updated = await updateRuntimeConfig(auth.accessToken, editTarget.value, editValue.value)
    const index = rows.value.findIndex((row) => row.id === updated.id)
    if (index >= 0) rows.value.splice(index, 1, updated)
    editOpen.value = false
    toast.show('配置值已更新，下一次引擎同步会应用该变更')
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '配置更新失败')
  } finally {
    saving.value = false
  }
}

async function openHistory(row: RuntimeConfigRecord) {
  editTarget.value = row
  historyOpen.value = true
  historyLoading.value = true
  try {
    history.value = await getRuntimeConfigHistory(auth.accessToken, row)
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '历史版本加载失败')
  } finally {
    historyLoading.value = false
  }
}

async function confirmRollback() {
  if (!editTarget.value || !rollbackTarget.value) return
  rollingBack.value = true
  try {
    const updated = await rollbackRuntimeConfig(auth.accessToken, editTarget.value, rollbackTarget.value)
    const index = rows.value.findIndex((row) => row.id === updated.id)
    if (index >= 0) rows.value.splice(index, 1, updated)
    rollbackTarget.value = null
    historyOpen.value = false
    toast.show('配置已回滚，等待引擎同步')
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '配置回滚失败')
  } finally {
    rollingBack.value = false
  }
}

function dateText(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
onMounted(load)
</script>

<template>
  <div class="config-page">
    <header class="adx-page-header"><div><p class="adx-page-kicker">系统设置 · 平台运行时</p><h1 class="adx-page-title">运行时配置</h1><p class="adx-page-description">管理引擎调优参数、协议密钥、缓存时间与审计历史，并支持版本回滚。</p></div><button class="adx-button adx-button--secondary" type="button" @click="load"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button></header>
    <div v-if="error" class="config-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load">重新加载</button></div>
    <section class="config-metrics"><article><span>配置项</span><strong>{{ stats.total }}</strong><small>全部运行时配置</small></article><article><span>热更新</span><strong>{{ stats.immediate }}</strong><small>保存后立即同步</small></article><article><span>重启生效</span><strong>{{ stats.restart }}</strong><small>需要引擎重启</small></article><article><span>敏感配置</span><strong>{{ stats.secrets }}</strong><small>密钥与协议参数</small></article></section>
    <section class="adx-panel config-filter"><label class="adx-input-shell config-search"><Search class="adx-icon" /><input v-model="keyword" placeholder="配置键或说明" /></label><span class="adx-input-shell"><select v-model="scope"><option value="">全部消费方</option><option value="engine">Engine</option><option value="admin">Admin</option><option value="shared">Shared</option></select></span><span class="adx-input-shell"><select v-model="category"><option value="">全部生效方式</option><option value="immediate">热更新</option><option value="restart">重启生效</option></select></span><button class="adx-button adx-button--secondary" type="button" @click="keyword = ''; scope = ''; category = ''">重置</button></section>
    <section class="adx-panel config-table-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">配置列表</h2><p class="adx-panel__meta">共 {{ filtered.length }} 项，敏感值默认隐藏</p></div><span class="adx-status adx-status--warning"><AlertTriangle class="adx-icon" />修改会影响线上引擎</span></div>
      <div v-if="loading" class="config-loading"><div v-for="index in 6" :key="index" class="adx-skeleton" /></div>
      <div v-else class="adx-table-wrap"><table class="adx-table config-table"><thead><tr><th>配置键</th><th>当前值</th><th>类型</th><th>消费方</th><th>生效方式</th><th>版本</th><th>最后更新</th><th>更新人</th><th>操作</th></tr></thead><tbody><tr v-for="row in filtered" :key="row.id"><td><div class="config-key"><SlidersHorizontal class="adx-icon" /><span><strong>{{ row.configKey }}</strong><small>{{ row.description }}</small></span></div></td><td><code :class="{ secret: row.configKey.includes('secret') }">{{ row.configKey.includes('secret') ? '••••••••' : row.configValue }}</code></td><td>{{ row.configType }}</td><td><span class="adx-status adx-status--info">{{ row.scope }}</span></td><td><span class="adx-status" :class="row.category === 'immediate' ? 'adx-status--success' : 'adx-status--warning'">{{ row.category === 'immediate' ? '热更新' : '重启生效' }}</span></td><td>v{{ row.version }}</td><td>{{ dateText(row.updatedAt) }}</td><td>{{ row.updatedBy }}</td><td><div class="config-actions"><button type="button" title="编辑" @click="openEdit(row)"><Save class="adx-icon" /></button><button type="button" title="历史版本" @click="openHistory(row)"><History class="adx-icon" /></button></div></td></tr></tbody></table></div>
    </section>
    <Teleport to="body"><Transition name="adx-fade"><div v-if="editOpen || historyOpen" class="adx-overlay" @click="saving || rollingBack ? undefined : (editOpen = false, historyOpen = false)" /></Transition><Transition name="adx-drawer"><aside v-if="editOpen && editTarget" class="adx-drawer" role="dialog" aria-modal="true"><header class="adx-drawer__head"><div><p class="adx-drawer__kicker">RUNTIME CONFIG</p><h2 class="adx-drawer__title">编辑配置值</h2><p class="adx-drawer__description">{{ editTarget.configKey }} · {{ editTarget.category === 'immediate' ? '保存后热更新' : '重启后生效' }}</p></div><button class="adx-drawer__close" type="button" @click="editOpen = false"><X class="adx-icon" /></button></header><div class="adx-drawer__body"><form id="configForm" class="config-form" @submit.prevent="save"><div class="config-form__current"><span>当前值</span><code>{{ editTarget.configKey.includes('secret') ? '••••••••' : editTarget.configValue }}</code></div><label class="adx-field"><span class="adx-field__label">新的配置值 *</span><span class="adx-input-shell config-value"><input v-model="editValue" :type="editTarget.configKey.includes('secret') ? 'password' : 'text'" placeholder="请输入新值" /></span><small>{{ editTarget.description }}</small></label><div class="config-warning"><AlertTriangle class="adx-icon" /><p>{{ editTarget.scope === 'engine' ? '该配置会下发到全部引擎实例。' : '该配置只影响管理面服务。' }} 保存前请确认值和格式正确。</p></div></form></div><footer class="adx-drawer__foot"><button class="adx-button adx-button--secondary" type="button" @click="editOpen = false">取消</button><button class="adx-button adx-button--primary" form="configForm" type="submit" :disabled="saving"><Save class="adx-icon" />{{ saving ? '保存中…' : '保存配置' }}</button></footer></aside></Transition><Transition name="adx-drawer"><aside v-if="historyOpen && editTarget" class="adx-drawer" role="dialog" aria-modal="true"><header class="adx-drawer__head"><div><p class="adx-drawer__kicker">CONFIG HISTORY</p><h2 class="adx-drawer__title">历史版本</h2><p class="adx-drawer__description">{{ editTarget.configKey }} · 支持回滚到任一历史值</p></div><button class="adx-drawer__close" type="button" @click="historyOpen = false"><X class="adx-icon" /></button></header><div class="adx-drawer__body"><div v-if="historyLoading" class="config-history-loading"><div v-for="index in 5" :key="index" class="adx-skeleton" /></div><div v-else class="config-history"><article v-for="item in history" :key="item.historyId"><div><span class="config-history-icon"><Clock3 class="adx-icon" /></span><div><strong>v{{ item.version }}</strong><small>{{ dateText(item.updatedAt) }} · {{ item.updatedBy }}</small></div></div><code>{{ editTarget.configKey.includes('secret') ? '••••••••' : item.configValue }}</code><button type="button" @click="rollbackTarget = item"><RotateCcw class="adx-icon" />回滚</button></article></div></div></aside></Transition></Teleport>
    <ConfirmDialog :open="Boolean(rollbackTarget)" title="确认回滚配置？" :description="`将 ${editTarget?.configKey} 回滚到版本 v${rollbackTarget?.version}，该操作会生成新的当前版本并触发同步。`" confirm-label="确认回滚" :loading="rollingBack" @close="rollbackTarget = null" @confirm="confirmRollback" />
  </div>
</template>

<style scoped>
.config-page { min-width: 0; }
.config-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.config-error .adx-icon { width: 15px; height: 15px; }
.config-error button { margin-left: auto; border: 0; color: inherit; background: transparent; }
.config-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.config-metrics article { min-height: 100px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.config-metrics span { color: var(--adx-text-muted); font-size: 9px; }
.config-metrics strong { display: block; margin-top: 12px; font-size: 21px; }
.config-metrics small { display: block; margin-top: 7px; color: var(--adx-text-muted); font-size: 8px; }
.config-filter { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 12px; }
.config-search { width: 280px; }
.config-filter select { appearance: auto; }
.config-table-panel { margin-top: 12px; }
.config-table-panel .adx-status .adx-icon { width: 12px; height: 12px; }
.config-loading { display: grid; gap: 7px; padding: 12px; }
.config-loading .adx-skeleton { height: 44px; }
.config-key { display: flex; align-items: center; gap: 8px; }
.config-key .adx-icon { width: 15px; height: 15px; color: var(--adx-success); }
.config-key strong { display: block; color: var(--adx-text-strong); font-family: "Cascadia Code", Consolas, monospace; font-size: 8px; }
.config-key small { display: block; max-width: 260px; margin-top: 4px; overflow: hidden; color: var(--adx-text-muted); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.config-table code { padding: 4px 6px; border-radius: 7px; color: var(--adx-text-body); background: var(--adx-surface-muted); font-size: 8px; }
.config-table code.secret { letter-spacing: .1em; }
.config-actions { display: flex; gap: 5px; }
.config-actions button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.config-actions button:hover { color: var(--adx-success); background: var(--adx-brand-soft); }
.config-actions .adx-icon { width: 13px; height: 13px; }
.config-form { display: grid; gap: 15px; }
.config-form__current { display: flex; justify-content: space-between; padding: 12px; border-radius: 11px; background: var(--adx-surface-muted); }
.config-form__current span { color: var(--adx-text-muted); font-size: 8px; }
.config-form__current code { color: var(--adx-text-strong); font-size: 9px; }
.config-value { height: 44px; }
.config-warning { display: flex; gap: 8px; padding: 11px; border-radius: 11px; color: var(--adx-warning); background: var(--adx-warning-soft); }
.config-warning .adx-icon { flex: 0 0 auto; width: 15px; height: 15px; }
.config-warning p { margin: 0; font-size: 8px; line-height: 1.55; }
.config-history-loading { display: grid; gap: 8px; }
.config-history-loading .adx-skeleton { height: 62px; }
.config-history { display: grid; gap: 8px; }
.config-history article { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 11px; border-radius: 12px; background: var(--adx-surface-muted); }
.config-history article > div { display: flex; align-items: center; gap: 8px; }
.config-history-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--adx-success); background: var(--adx-surface); }
.config-history-icon .adx-icon { width: 14px; height: 14px; }
.config-history strong { display: block; font-size: 9px; }
.config-history small { display: block; margin-top: 3px; color: var(--adx-text-muted); font-size: 7px; }
.config-history code { color: var(--adx-text-body); font-size: 8px; }
.config-history button { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 8px; border: 0; border-radius: 8px; color: var(--adx-warning); background: var(--adx-warning-soft); font-size: 8px; }
.config-history button .adx-icon { width: 12px; height: 12px; }
.spinning { animation: config-spin .9s linear infinite; }
@keyframes config-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) { .config-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .config-search { width: 240px; } }
</style>
