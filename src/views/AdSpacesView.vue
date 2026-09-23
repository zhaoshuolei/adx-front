<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Boxes,
  CircleAlert,
  Filter,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-vue-next'
import AdSpaceEditorDrawer from '@/components/AdSpaceEditorDrawer.vue'
import AdSourceBindingDrawer from '@/components/AdSourceBindingDrawer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import {
  adTypeLabels,
  createAdSpace,
  getAdSpaceOptions,
  getAdSpaces,
  getAdSourceOptions,
  getBoundAdSources,
  toggleAdSpaceStatus,
  updateAdSpace,
  updateAdSpaceSources,
  type AdSpaceQuery,
} from '@/services/adSpaces'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { AdSize, AdSource, AdSpace, AdSpaceFormValues, MediaApp, PageResult, StrategyProfile } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const loading = ref(true)
const optionsLoading = ref(true)
const error = ref('')
const result = ref<PageResult<AdSpace>>({ content: [], totalElements: 0, page: 0, size: 10, totalPages: 1 })
const mediaOptions = ref<MediaApp[]>([])
const adSizeOptions = ref<AdSize[]>([])
const strategyOptions = ref<StrategyProfile[]>([])

const filters = reactive({ keyword: '', mediaId: 0, status: '' as '' | '1' | '0', adStatus: '' })
const pageSize = ref(10)

const editorOpen = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editTarget = ref<AdSpace | null>(null)
const editorSaving = ref(false)
const editorError = ref('')

const toggleTarget = ref<AdSpace | null>(null)
const toggleLoading = ref(false)

const bindingOpen = ref(false)
const bindingTarget = ref<AdSpace | null>(null)
const bindingSources = ref<AdSource[]>([])
const bindingBoundIds = ref<number[]>([])
const bindingLoading = ref(false)
const bindingSaving = ref(false)
const bindingError = ref('')

const integer = new Intl.NumberFormat('zh-CN')
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 })

const currentPageStats = computed(() => {
  const rows = result.value.content
  return {
    enabled: rows.filter((item) => item.enabled).length,
    production: rows.filter((item) => item.adStatus === 'PRODUCTION').length,
    bound: rows.reduce((sum, item) => sum + item.boundSourceNames.length, 0),
    requests: rows.reduce((sum, item) => sum + item.todayRequests, 0),
  }
})

const paginationPages = computed(() => {
  const total = result.value.totalPages
  const current = result.value.page
  const start = Math.max(0, Math.min(current - 2, total - 5))
  const end = Math.min(total, start + 5)
  return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index)
})

const filterActive = computed(() => Boolean(filters.keyword || filters.mediaId || filters.status || filters.adStatus))

async function load(page = result.value.page) {
  loading.value = true
  error.value = ''
  const query: AdSpaceQuery = {
    page,
    size: pageSize.value,
    keyword: filters.keyword.trim() || undefined,
    mediaId: filters.mediaId || undefined,
    status: filters.status === '' ? undefined : Number(filters.status) as 0 | 1,
    adStatus: filters.adStatus || undefined,
  }
  try {
    result.value = await getAdSpaces(auth.accessToken, query)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '广告位列表加载失败'
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  optionsLoading.value = true
  try {
    const options = await getAdSpaceOptions(auth.accessToken)
    mediaOptions.value = options.media
    adSizeOptions.value = options.sizes
    strategyOptions.value = options.strategies
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '媒体、尺寸或策略选项加载失败')
  } finally {
    optionsLoading.value = false
  }
}

function submitFilters() {
  void load(0)
}

function resetFilters() {
  Object.assign(filters, { keyword: '', mediaId: 0, status: '', adStatus: '' })
  void load(0)
}

function openCreate() {
  editorMode.value = 'create'
  editTarget.value = null
  editorError.value = ''
  editorOpen.value = true
}

function openEdit(item: AdSpace) {
  editorMode.value = 'edit'
  editTarget.value = item
  editorError.value = ''
  editorOpen.value = true
}

async function saveAdSpace(values: AdSpaceFormValues) {
  editorSaving.value = true
  editorError.value = ''
  try {
    if (editorMode.value === 'create') {
      await createAdSpace(auth.accessToken, values)
      toast.show('广告位已创建')
    } else if (editTarget.value) {
      await updateAdSpace(auth.accessToken, editTarget.value.id, values)
      toast.show('广告位已更新')
    }
    editorOpen.value = false
    await load(editorMode.value === 'create' ? 0 : result.value.page)
  } catch (reason) {
    editorError.value = reason instanceof Error ? reason.message : '保存失败'
  } finally {
    editorSaving.value = false
  }
}

async function confirmToggle() {
  if (!toggleTarget.value) return
  toggleLoading.value = true
  try {
    await toggleAdSpaceStatus(auth.accessToken, toggleTarget.value.id)
    toast.show(`广告位已${toggleTarget.value.enabled ? '停用' : '启用'}`)
    toggleTarget.value = null
    await load()
  } catch (reason) {
    toast.show(reason instanceof Error ? reason.message : '状态切换失败')
  } finally {
    toggleLoading.value = false
  }
}

async function openBinding(item: AdSpace) {
  bindingTarget.value = item
  bindingOpen.value = true
  bindingLoading.value = true
  bindingError.value = ''
  try {
    const [sources, bound] = await Promise.all([
      getAdSourceOptions(auth.accessToken),
      getBoundAdSources(auth.accessToken, item.id),
    ])
    bindingSources.value = sources
    bindingBoundIds.value = bound.map((source) => source.id)
  } catch (reason) {
    bindingError.value = reason instanceof Error ? reason.message : '广告源绑定信息加载失败'
  } finally {
    bindingLoading.value = false
  }
}

async function saveBinding(ids: number[]) {
  if (!bindingTarget.value) return
  bindingSaving.value = true
  bindingError.value = ''
  try {
    await updateAdSpaceSources(auth.accessToken, bindingTarget.value.id, bindingBoundIds.value, ids)
    toast.show('广告源绑定关系已更新')
    bindingOpen.value = false
    await load()
  } catch (reason) {
    bindingError.value = reason instanceof Error ? reason.message : '绑定关系保存失败'
  } finally {
    bindingSaving.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN')
}

onMounted(async () => {
  await Promise.all([load(0), loadOptions()])
})
</script>

<template>
  <div class="ad-space-page">
    <header class="adx-page-header">
      <div><p class="adx-page-kicker">广告运营 · 广告资源</p><h1 class="adx-page-title">广告位管理</h1><p class="adx-page-description">维护广告位名称、业务 ID、媒体归属、投放状态、策略方案与广告源绑定关系。</p></div>
      <div class="adx-page-actions"><button class="adx-button adx-button--secondary" type="button" @click="load()"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button class="adx-button adx-button--primary" type="button" :disabled="optionsLoading" @click="openCreate"><Plus class="adx-icon" />新增广告位</button></div>
    </header>

    <div v-if="error" class="ad-space-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load()">重新加载</button></div>

    <section class="ad-space-stats">
      <article><span><Boxes class="adx-icon" />广告位总数</span><strong>{{ integer.format(result.totalElements) }}</strong><small>当前筛选范围</small></article>
      <article><span><ToggleRight class="adx-icon" />当前页启用</span><strong>{{ currentPageStats.enabled }} / {{ result.content.length }}</strong><small>启用比例 {{ result.content.length ? ((currentPageStats.enabled / result.content.length) * 100).toFixed(0) : 0 }}%</small></article>
      <article><span><ShieldCheck class="adx-icon" />正式投放</span><strong>{{ currentPageStats.production }}</strong><small>当前页 PRODUCTION</small></article>
      <article><span><Link2 class="adx-icon" />广告源绑定</span><strong>{{ currentPageStats.bound }}</strong><small>当前页绑定关系</small></article>
      <article><span><RefreshCw class="adx-icon" />今日请求</span><strong>{{ compact.format(currentPageStats.requests) }}</strong><small>当前页广告位汇总</small></article>
    </section>

    <section class="adx-panel ad-space-filter">
      <div class="ad-space-filter__head"><div><Filter class="adx-icon" /><span>筛选条件</span></div><button v-if="filterActive" type="button" @click="resetFilters"><RotateCcw class="adx-icon" />重置</button></div>
      <div class="ad-space-filter__grid">
        <label class="adx-field ad-space-filter__keyword"><span class="adx-field__label">关键词</span><span class="adx-input-shell"><Search class="adx-icon" /><input v-model="filters.keyword" placeholder="广告位名称或业务 ID" @keyup.enter="submitFilters" /></span></label>
        <label class="adx-field"><span class="adx-field__label">媒体应用</span><span class="adx-input-shell adx-select-shell"><select v-model.number="filters.mediaId"><option :value="0">全部媒体</option><option v-for="media in mediaOptions" :key="media.id" :value="media.id">{{ media.appName }}</option></select></span></label>
        <label class="adx-field"><span class="adx-field__label">启用状态</span><span class="adx-input-shell adx-select-shell"><select v-model="filters.status"><option value="">全部状态</option><option value="1">已启用</option><option value="0">已停用</option></select></span></label>
        <label class="adx-field"><span class="adx-field__label">广告状态</span><span class="adx-input-shell adx-select-shell"><select v-model="filters.adStatus"><option value="">全部广告状态</option><option value="PRODUCTION">正式投放</option><option value="TEST">测试</option></select></span></label>
        <div class="ad-space-filter__actions"><button class="adx-button adx-button--secondary" type="button" @click="resetFilters">重置</button><button class="adx-button adx-button--primary" type="button" @click="submitFilters"><Search class="adx-icon" />查询</button></div>
      </div>
    </section>

    <section class="adx-panel ad-space-table-panel">
      <div class="adx-panel__head"><div><h2 class="adx-panel__title">广告位列表</h2><p class="adx-panel__meta">共 {{ result.totalElements }} 条 · 第 {{ result.page + 1 }} / {{ result.totalPages }} 页</p></div><span class="adx-status adx-status--info">每页 {{ pageSize }} 条</span></div>
      <div v-if="loading" class="ad-space-table-loading"><div v-for="index in 7" :key="index" class="adx-skeleton" /></div>
      <div v-else-if="result.content.length" class="adx-table-wrap">
        <table class="adx-table ad-space-table">
          <thead><tr><th>广告位</th><th>媒体应用</th><th>类型</th><th>策略方案</th><th>广告源</th><th>今日表现</th><th>底价 / 折扣</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead>
          <tbody><tr v-for="item in result.content" :key="item.id">
            <td><button class="ad-space-name" type="button" @click="openEdit(item)"><strong>{{ item.name }}</strong><small>{{ item.adSlotId }}</small></button></td>
            <td><strong class="ad-space-media">{{ item.mediaName }}</strong><small class="ad-space-media-code">{{ item.mediaPackageName }}</small></td>
            <td><span class="ad-space-type">{{ adTypeLabels[item.adType] || item.adType }}</span></td>
            <td><template v-if="item.strategyProfileName"><strong class="ad-space-strategy">{{ item.strategyProfileName }}</strong><small class="ad-space-media-code">#{{ item.strategyProfileId }}</small></template><span v-else class="ad-space-muted">未映射</span></td>
            <td><button class="ad-space-source-count" type="button" @click="openBinding(item)"><Link2 class="adx-icon" />{{ item.boundSourceNames.length }} 个</button><small v-if="item.boundSourceNames.length" class="ad-space-source-preview">{{ item.boundSourceNames.slice(0, 2).join('、') }}</small></td>
            <td><strong>{{ compact.format(item.todayRequests) }}</strong><small class="ad-space-media-code">曝光 {{ compact.format(item.todayImpressions) }} · 点击 {{ compact.format(item.todayClicks) }}</small></td>
            <td><strong>¥ {{ item.priceFloor.toFixed(2) }}</strong><small class="ad-space-media-code">折扣 {{ item.discountPercent }}%</small></td>
            <td><span>{{ formatDate(item.createdAt) }}</span></td>
            <td><div class="ad-space-statuses"><span class="adx-status" :class="item.enabled ? 'adx-status--success' : 'adx-status--danger'"><i class="ad-space-status-dot" />{{ item.enabled ? '已启用' : '已停用' }}</span><span class="ad-space-ad-status">{{ item.adStatus === 'PRODUCTION' ? '正式' : '测试' }}</span></div></td>
            <td><div class="ad-space-actions"><button type="button" title="编辑广告位" @click="openEdit(item)"><Pencil class="adx-icon" /></button><button type="button" :title="item.enabled ? '停用广告位' : '启用广告位'" @click="toggleTarget = item"><component :is="item.enabled ? ToggleRight : ToggleLeft" class="adx-icon" /></button></div></td>
          </tr></tbody>
        </table>
      </div>
      <div v-else class="ad-space-empty"><Search class="adx-icon" /><strong>没有符合条件的广告位</strong><span>调整筛选条件，或创建一个新的广告位。</span><button class="adx-button adx-button--primary" type="button" @click="openCreate"><Plus class="adx-icon" />新增广告位</button></div>
      <footer v-if="result.totalPages > 1" class="ad-space-pagination"><span>共 {{ result.totalElements }} 条</span><div><button type="button" :disabled="result.page === 0" @click="load(result.page - 1)">上一页</button><button v-for="page in paginationPages" :key="page" type="button" :class="{ active: result.page === page }" @click="load(page)">{{ page + 1 }}</button><button type="button" :disabled="result.page >= result.totalPages - 1" @click="load(result.page + 1)">下一页</button></div><select v-model.number="pageSize" class="adx-select" @change="load(0)"><option :value="10">10 条/页</option><option :value="20">20 条/页</option><option :value="50">50 条/页</option></select></footer>
    </section>

    <AdSpaceEditorDrawer :open="editorOpen" :mode="editorMode" :initial="editTarget" :media-options="mediaOptions" :ad-size-options="adSizeOptions" :strategy-options="strategyOptions" :saving="editorSaving" :server-error="editorError" @close="editorOpen = false" @submit="saveAdSpace" />
    <AdSourceBindingDrawer :open="bindingOpen" :ad-space="bindingTarget" :sources="bindingSources" :bound-ids="bindingBoundIds" :loading="bindingLoading" :saving="bindingSaving" :error="bindingError" @close="bindingOpen = false" @save="saveBinding" />
    <ConfirmDialog :open="Boolean(toggleTarget)" :title="toggleTarget?.enabled ? '确认停用广告位？' : '确认启用广告位？'" :description="toggleTarget?.enabled ? `停用后“${toggleTarget?.name}”将不再参与竞价和投放，客户端请求会停止返回该广告位。` : `启用后“${toggleTarget?.name}”将重新进入竞价链路。`" :confirm-label="toggleTarget?.enabled ? '确认停用' : '确认启用'" :danger="toggleTarget?.enabled" :loading="toggleLoading" @close="toggleTarget = null" @confirm="confirmToggle" />
  </div>
</template>

<style scoped>
.ad-space-page { min-width: 0; }
.ad-space-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.ad-space-error .adx-icon { width: 15px; height: 15px; }
.ad-space-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; font-weight: 650; }
.ad-space-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 9px; }
.ad-space-stats article { min-width: 0; min-height: 98px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.ad-space-stats span { display: flex; align-items: center; gap: 6px; color: var(--adx-text-muted); font-size: 9px; }
.ad-space-stats span .adx-icon { width: 13px; height: 13px; color: var(--adx-success); }
.ad-space-stats strong { display: block; margin-top: 12px; font-size: 21px; letter-spacing: -.3px; }
.ad-space-stats small { display: block; margin-top: 6px; overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.ad-space-filter { margin-top: 12px; padding: 14px; }
.ad-space-filter__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ad-space-filter__head > div { display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 650; }
.ad-space-filter__head .adx-icon { width: 14px; height: 14px; color: var(--adx-success); }
.ad-space-filter__head > button { display: inline-flex; align-items: center; gap: 5px; border: 0; color: var(--adx-text-muted); background: transparent; font-size: 8px; }
.ad-space-filter__head > button .adx-icon { width: 12px; height: 12px; color: inherit; }
.ad-space-filter__grid { display: grid; grid-template-columns: 1.4fr 1fr .85fr .85fr auto; align-items: end; gap: 10px; }
.ad-space-filter__grid select { appearance: auto; cursor: pointer; }
.ad-space-filter__actions { display: flex; gap: 7px; }
.ad-space-table-panel { margin-top: 12px; }
.ad-space-table-loading { display: grid; gap: 7px; padding: 12px; }
.ad-space-table-loading .adx-skeleton { height: 48px; }
.ad-space-table th { position: sticky; top: 0; z-index: 1; }
.ad-space-table td { padding-top: 11px; padding-bottom: 11px; }
.ad-space-name { display: block; padding: 0; border: 0; background: transparent; text-align: left; }
.ad-space-name strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.ad-space-name small,
.ad-space-media-code { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; }
.ad-space-name:hover strong { color: var(--adx-success); }
.ad-space-media { display: block; color: var(--adx-text-strong); font-size: 9px; }
.ad-space-type { display: inline-flex; padding: 4px 7px; border-radius: 8px; color: var(--adx-info); background: var(--adx-info-soft); font-size: 8px; }
.ad-space-strategy { display: block; color: var(--adx-text-strong); font-size: 9px; }
.ad-space-muted { color: var(--adx-text-muted); font-size: 8px; }
.ad-space-source-count { display: inline-flex; align-items: center; gap: 5px; padding: 0; border: 0; color: var(--adx-success); background: transparent; font-size: 8px; }
.ad-space-source-count .adx-icon { width: 12px; height: 12px; }
.ad-space-source-preview { display: block; max-width: 145px; margin-top: 4px; overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.ad-space-statuses { display: grid; gap: 5px; justify-items: start; }
.ad-space-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.ad-space-ad-status { color: var(--adx-text-muted); font-size: 8px; }
.ad-space-actions { display: flex; gap: 5px; }
.ad-space-actions button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.ad-space-actions button:hover { color: var(--adx-success); background: var(--adx-brand-soft); }
.ad-space-actions .adx-icon { width: 13px; height: 13px; }
.ad-space-empty { display: grid; place-items: center; align-content: center; min-height: 280px; color: var(--adx-text-muted); text-align: center; }
.ad-space-empty > .adx-icon { width: 30px; height: 30px; color: var(--adx-success); }
.ad-space-empty strong { margin-top: 13px; color: var(--adx-text-strong); font-size: 11px; }
.ad-space-empty span { margin-top: 6px; font-size: 9px; }
.ad-space-empty .adx-button { margin-top: 15px; }
.ad-space-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-top: 1px solid var(--adx-divider); color: var(--adx-text-muted); font-size: 8px; }
.ad-space-pagination > div { display: flex; gap: 4px; }
.ad-space-pagination button { min-width: 28px; height: 28px; padding: 0 7px; border: 0; border-radius: 8px; color: var(--adx-text-muted); background: var(--adx-surface-muted); font-size: 8px; }
.ad-space-pagination button.active { color: #fff; background: var(--adx-brand-600); }
.ad-space-pagination button:disabled { cursor: not-allowed; opacity: .4; }
.ad-space-pagination select { height: 28px; padding: 0 7px; border: 0; border-radius: 8px; color: var(--adx-text-body); background: var(--adx-surface-muted); font-size: 8px; }
.spinning { animation: ad-space-spin .9s linear infinite; }
@keyframes ad-space-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) {
  .ad-space-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ad-space-filter__grid { grid-template-columns: 1.2fr 1fr 1fr 1fr; }
  .ad-space-filter__actions { grid-column: 1 / -1; justify-content: flex-end; }
}
</style>
