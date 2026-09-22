<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CircleAlert, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ResourceEditorDrawer from '@/components/ResourceEditorDrawer.vue'
import { resourceConfigs, type ResourceRow, type ResourceValue } from '@/config/resources'
import {
  createCatalogResource,
  deleteCatalogResource,
  listCatalogResource,
  toggleCatalogResource,
  updateCatalogResource,
} from '@/services/catalog'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { PageResult } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const config = computed(() => resourceConfigs[String(route.name)] || null)
const loading = ref(true)
const error = ref('')
const result = ref<PageResult<ResourceRow>>({ content: [], totalElements: 0, page: 0, size: 10, totalPages: 1 })
const pageSize = ref(10)
const filters = reactive<Record<string, string | number>>({})

const editorOpen = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editTarget = ref<ResourceRow | null>(null)
const editorSaving = ref(false)
const editorError = ref('')

const actionTarget = ref<ResourceRow | null>(null)
const actionType = ref<'toggle' | 'delete'>('toggle')
const actionLoading = ref(false)

const integer = new Intl.NumberFormat('zh-CN')
const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 })

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function percent(value: number) {
  return `${value.toFixed(1)}%`
}

function metricValue(metricKey: string) {
  const key = String(route.name)
  const rows = result.value.content
  switch (metricKey) {
    case 'total': return result.value.totalElements
    case 'enabled': return rows.filter((row) => Boolean(row.enabled)).length
    case 'sdk': return rows.filter((row) => row.accessMode === 'SDK').length
    case 'adSpaces': return rows.reduce((sum, row) => sum + numberValue(row.adSpaceCount), 0)
    case 'production': return rows.filter((row) => row.adStatus === 'production').length
    case 'avgEcpm': {
      const values = rows.map((row) => numberValue(row.actualEcpm)).filter(Boolean)
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    }
    case 'bound': return rows.reduce((sum, row) => sum + numberValue(row.boundAdSpaceCount), 0)
    case 'healthy': return rows.filter((row) => numberValue(row.successRate) >= 95).length
    case 'spend': return rows.reduce((sum, row) => sum + numberValue(row.todaySpend), 0)
    case 'success': {
      const values = rows.map((row) => numberValue(row.successRate)).filter(Boolean)
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    }
    case 'impressions': return rows.reduce((sum, row) => sum + numberValue(row.impressions), 0)
    case 'ctr': {
      const values = rows.map((row) => numberValue(row.ctr)).filter(Boolean)
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    }
    case 'admins': return rows.filter((row) => String(row.rolesText || '').includes('管理员')).length
    case 'newUsers': return rows.filter((row) => String(row.createdAt || '').startsWith('2026-09')).length
    case 'permissions': return rows.reduce((sum, row) => sum + numberValue(row.permissionCount), 0)
    case 'users': return rows.reduce((sum, row) => sum + numberValue(row.userCount), 0)
    case 'platforms': return new Set(rows.map((row) => row.platform).filter(Boolean)).size
    case 'latest': return rows.reduce((max, row) => Math.max(max, numberValue(String(row.version || '').split('.')[1])), 0)
    default: return key ? 0 : 0
  }
}

function formatMetric(metricKey: string, value: number, format?: 'number' | 'currency' | 'percent' | 'count') {
  if (format === 'currency') return currency.format(value)
  if (format === 'percent') return percent(value)
  return integer.format(value)
}

function rowText(row: ResourceRow, key: string) {
  const value = row[key]
  if (Array.isArray(value)) return value.join('、')
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}

function subtextFor(row: ResourceRow, key: string) {
  const candidate = key === 'appName' ? row.mediaId
    : key === 'sourceName' ? row.sourceId
      : key === 'name' ? row.code
        : key === 'displayName' ? row.username
          : key === 'sdkType' ? row.platform
            : row.sourceId || row.username || row.mediaId
  return candidate ? String(candidate) : '—'
}

function dateText(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false })
}

function rowStatus(row: ResourceRow, key: string) {
  const value = row[key]
  const labels = config.value?.statusLabels
  if (labels && labels[String(value)]) return { text: labels[String(value)], tone: Boolean(row.enabled) ? 'success' : 'danger' }
  if (typeof value === 'boolean') return { text: value ? '已启用' : '已停用', tone: value ? 'success' : 'danger' }
  const text = String(value ?? '')
  const good = ['ANDROID', 'IOS', 'SDK', 'production', 'BANNER', 'NATIVE', 'VIDEO', 'SPLASH', 'INTERSTITIAL'].includes(text)
  return { text, tone: good ? 'info' : 'warning' }
}

async function load(page = result.value.page) {
  if (!config.value) return
  loading.value = true
  error.value = ''
  try {
    result.value = await listCatalogResource(auth.accessToken, String(route.name), config.value, { page, size: pageSize.value, filters })
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : `${config.value.entityLabel}加载失败`
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.keys(filters).forEach((key) => delete filters[key])
  void load(0)
}

function openCreate() {
  editorMode.value = 'create'
  editTarget.value = null
  editorError.value = ''
  editorOpen.value = true
}

function openEdit(row: ResourceRow) {
  editorMode.value = 'edit'
  editTarget.value = row
  editorError.value = ''
  editorOpen.value = true
}

async function save(values: Record<string, ResourceValue>) {
  if (!config.value) return
  editorSaving.value = true
  editorError.value = ''
  try {
    if (editorMode.value === 'create') await createCatalogResource(auth.accessToken, String(route.name), config.value, values)
    else if (editTarget.value) await updateCatalogResource(auth.accessToken, String(route.name), config.value, Number(editTarget.value.id), values)
    editorOpen.value = false
    toast.show(`${config.value.entityLabel}${editorMode.value === 'create' ? '已创建' : '已更新'}`)
    await load(editorMode.value === 'create' ? 0 : result.value.page)
  } catch (reason) {
    editorError.value = reason instanceof Error ? reason.message : '保存失败'
  } finally {
    editorSaving.value = false
  }
}

function openToggle(row: ResourceRow) {
  actionTarget.value = row
  actionType.value = 'toggle'
}

function openDelete(row: ResourceRow) {
  actionTarget.value = row
  actionType.value = 'delete'
}

async function confirmAction() {
  if (!config.value || !actionTarget.value) return
  actionLoading.value = true
  try {
    if (actionType.value === 'toggle') {
      await toggleCatalogResource(auth.accessToken, String(route.name), config.value, Number(actionTarget.value.id))
      toast.show(`${config.value.entityLabel}状态已切换`)
    } else {
      await deleteCatalogResource(auth.accessToken, String(route.name), config.value, Number(actionTarget.value.id))
      toast.show(`${config.value.entityLabel}已删除`)
    }
    actionTarget.value = null
    await load()
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '操作失败')
  } finally {
    actionLoading.value = false
  }
}

watch(() => route.name, () => {
  resetFilters()
  void load(0)
})

onMounted(() => { void load(0) })
</script>

<template>
  <div v-if="config" class="catalog-page">
    <header class="adx-page-header"><div><p class="adx-page-kicker">{{ config.kicker }}</p><h1 class="adx-page-title">{{ config.title }}</h1><p class="adx-page-description">{{ config.description }}</p></div><div class="adx-page-actions"><button class="adx-button adx-button--secondary" type="button" @click="load()"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button v-if="config.canCreate" class="adx-button adx-button--primary" type="button" @click="openCreate"><Plus class="adx-icon" />新增{{ config.entityLabel }}</button></div></header>
    <div v-if="error" class="catalog-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load()">重新加载</button></div>

    <section class="catalog-metrics"><article v-for="metric in config.metrics" :key="metric.key"><span>{{ metric.label }}</span><strong>{{ formatMetric(metric.key, metricValue(metric.key), metric.format) }}</strong><small>{{ metric.hint }}</small></article></section>

    <section class="adx-panel catalog-filter"><div class="catalog-filter__grid"><label v-for="filter in config.filters" :key="filter.key" class="adx-field" :class="{ keyword: filter.type !== 'select' }"><span class="adx-field__label">{{ filter.label }}</span><span class="adx-input-shell"><Search v-if="filter.type !== 'select'" class="adx-icon" /><input v-if="filter.type !== 'select'" v-model="filters[filter.key] as string" placeholder="输入关键词" @keyup.enter="load(0)" /><select v-else v-model="filters[filter.key]"><option value="">全部</option><option v-for="option in filter.options" :key="String(option.value)" :value="option.value">{{ option.label }}</option></select></span></label><div class="catalog-filter__actions"><button class="adx-button adx-button--secondary" type="button" @click="resetFilters"><RotateCcw class="adx-icon" />重置</button><button class="adx-button adx-button--primary" type="button" @click="load(0)"><Search class="adx-icon" />查询</button></div></div></section>

    <section class="adx-panel catalog-table-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">{{ config.entityLabel }}列表</h2><p class="adx-panel__meta">共 {{ result.totalElements }} 条 · 第 {{ result.page + 1 }} / {{ result.totalPages }} 页</p></div><span class="adx-status adx-status--info">每页 {{ pageSize }} 条</span></div>
      <div v-if="loading" class="catalog-loading"><div v-for="index in 7" :key="index" class="adx-skeleton" /></div>
      <div v-else-if="result.content.length" class="adx-table-wrap"><table class="adx-table catalog-table"><thead><tr><th v-for="column in config.columns" :key="column.key" :class="{ right: column.align === 'right' }">{{ column.label }}</th><th v-if="config.canEdit || config.canToggle || config.canDelete">操作</th></tr></thead><tbody><tr v-for="row in result.content" :key="String(row.id)"><td v-for="column in config.columns" :key="column.key" :class="{ right: column.align === 'right' }"><template v-if="column.type === 'subtext'"><strong>{{ rowText(row, column.key) }}</strong><small>{{ subtextFor(row, column.key) }}</small></template><template v-else-if="column.type === 'status'"><span class="adx-status" :class="`adx-status--${rowStatus(row, column.key).tone}`">{{ rowStatus(row, column.key).text }}</span></template><template v-else-if="column.type === 'boolean'"><span class="adx-status" :class="Boolean(row[column.key]) ? 'adx-status--success' : 'adx-status--danger'"><i class="catalog-dot" />{{ Boolean(row[column.key]) ? '已启用' : '已停用' }}</span></template><template v-else-if="column.type === 'currency'">{{ currency.format(numberValue(row[column.key])) }}</template><template v-else-if="column.type === 'percent'">{{ percent(numberValue(row[column.key])) }}</template><template v-else-if="column.type === 'date'">{{ dateText(row[column.key]) }}</template><template v-else>{{ rowText(row, column.key) }}</template></td><td v-if="config.canEdit || config.canToggle || config.canDelete"><div class="catalog-actions"><button v-if="config.canEdit" type="button" title="编辑" @click="openEdit(row)"><Pencil class="adx-icon" /></button><button v-if="config.canToggle" type="button" :title="Boolean(row[config.toggleKey || 'enabled']) ? '停用' : '启用'" @click="openToggle(row)"><component :is="Boolean(row[config.toggleKey || 'enabled']) ? ToggleRight : ToggleLeft" class="adx-icon" /></button><button v-if="config.canDelete" class="danger" type="button" title="删除" @click="openDelete(row)"><Trash2 class="adx-icon" /></button></div></td></tr></tbody></table></div>
      <div v-else class="catalog-empty"><Search class="adx-icon" /><strong>暂无{{ config.entityLabel }}数据</strong><span>调整筛选条件或新增一条记录。</span></div>
      <footer v-if="result.totalPages > 1" class="catalog-pagination"><span>共 {{ result.totalElements }} 条</span><div><button type="button" :disabled="result.page === 0" @click="load(result.page - 1)">上一页</button><span>第 {{ result.page + 1 }} 页</span><button type="button" :disabled="result.page >= result.totalPages - 1" @click="load(result.page + 1)">下一页</button></div><select v-model.number="pageSize" @change="load(0)"><option :value="10">10 条/页</option><option :value="20">20 条/页</option><option :value="50">50 条/页</option></select></footer>
    </section>

    <ResourceEditorDrawer :open="editorOpen" :mode="editorMode" :config="config" :initial="editTarget" :saving="editorSaving" :server-error="editorError" @close="editorOpen = false" @submit="save" />
    <ConfirmDialog :open="Boolean(actionTarget)" :title="actionType === 'delete' ? `确认删除${config.entityLabel}？` : `确认${actionTarget?.enabled ? '停用' : '启用'}${config.entityLabel}？`" :description="actionType === 'delete' ? '删除后无法恢复，请确认该记录没有被其他资源引用。' : '状态变更会立即影响该记录的可用范围。'" :confirm-label="actionType === 'delete' ? '确认删除' : '确认切换'" :danger="actionType === 'delete' || Boolean(actionTarget?.enabled)" :loading="actionLoading" @close="actionTarget = null" @confirm="confirmAction" />
  </div>
</template>

<style scoped>
.catalog-page { min-width: 0; }
.catalog-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.catalog-error .adx-icon { width: 15px; height: 15px; }
.catalog-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; }
.catalog-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.catalog-metrics article { min-height: 100px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.catalog-metrics span { color: var(--adx-text-muted); font-size: 9px; }
.catalog-metrics strong { display: block; margin-top: 12px; font-size: 22px; letter-spacing: -.3px; }
.catalog-metrics small { display: block; margin-top: 7px; color: var(--adx-text-muted); font-size: 8px; }
.catalog-filter { margin-top: 12px; padding: 14px; }
.catalog-filter__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: 10px; }
.catalog-filter__grid select { appearance: auto; cursor: pointer; }
.catalog-filter__actions { display: flex; gap: 7px; grid-column: 4; }
.catalog-table-panel { margin-top: 12px; }
.catalog-loading { display: grid; gap: 7px; padding: 12px; }
.catalog-loading .adx-skeleton { height: 45px; }
.catalog-table .right { text-align: right; }
.catalog-table td { padding-top: 11px; padding-bottom: 11px; }
.catalog-table td strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.catalog-table td small { display: block; margin-top: 4px; max-width: 170px; overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.catalog-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.catalog-actions { display: flex; gap: 5px; }
.catalog-actions button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.catalog-actions button:hover { color: var(--adx-success); background: var(--adx-brand-soft); }
.catalog-actions button.danger:hover { color: var(--adx-danger); background: var(--adx-danger-soft); }
.catalog-actions .adx-icon { width: 13px; height: 13px; }
.catalog-empty { display: grid; place-items: center; align-content: center; min-height: 260px; color: var(--adx-text-muted); text-align: center; }
.catalog-empty .adx-icon { width: 28px; height: 28px; color: var(--adx-success); }
.catalog-empty strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.catalog-empty span { margin-top: 5px; font-size: 8px; }
.catalog-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-top: 1px solid var(--adx-divider); color: var(--adx-text-muted); font-size: 8px; }
.catalog-pagination > div { display: flex; align-items: center; gap: 8px; }
.catalog-pagination button { height: 27px; padding: 0 8px; border: 0; border-radius: 8px; color: var(--adx-text-body); background: var(--adx-surface-muted); font-size: 8px; }
.catalog-pagination button:disabled { opacity: .4; }
.catalog-pagination select { height: 27px; border: 0; border-radius: 8px; color: var(--adx-text-body); background: var(--adx-surface-muted); font-size: 8px; }
.spinning { animation: catalog-spin .9s linear infinite; }
@keyframes catalog-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) { .catalog-filter__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .catalog-filter__actions { grid-column: 3; } .catalog-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
