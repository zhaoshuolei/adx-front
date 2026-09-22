<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Copy,
  Download,
  FileWarning,
  GitCompareArrows,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-vue-next'
import EChart from '@/components/EChart.vue'
import {
  getReconciliation,
  summarizeReconciliation,
  type ReconciliationQuery,
  type ReconciliationSource,
} from '@/services/reconciliation'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useToastStore } from '@/stores/toast'
import type {
  DspReconciliationRow,
  MediaReconciliationRow,
  ReconciliationAttribution,
  ReconciliationGapReport,
} from '@/types/api'

type StatusFilter = 'all' | 'difference' | 'matched' | 'missing'
type ReconciliationRow = DspReconciliationRow | MediaReconciliationRow

const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToastStore()
const loading = ref(true)
const error = ref('')
const report = ref<ReconciliationGapReport>({ dsp: [], media: [], attributions: [] })
const activeSource = ref<ReconciliationSource>('dsp')
const startDate = ref('2026-09-16')
const endDate = ref('2026-09-22')
const statusFilter = ref<StatusFilter>('all')
const keyword = ref('')
const selectedAttributionId = ref<number | null>(null)
const activeRowKey = ref('')

const integer = new Intl.NumberFormat('zh-CN')
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 })
const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 })

const sourceRows = computed<ReconciliationRow[]>(() => activeSource.value === 'dsp' ? report.value.dsp : report.value.media)
const summary = computed(() => summarizeReconciliation(sourceRows.value, activeSource.value))

const metrics = computed(() => {
  const value = summary.value
  const sourceLabel = activeSource.value === 'dsp' ? 'DSP 消耗' : '媒体请求'
  const isDsp = activeSource.value === 'dsp'
  return [
    {
      label: `${sourceLabel}差异`,
      value: isDsp ? currency.format(value.gap) : compact.format(value.gap),
      hint: `ADX ${isDsp ? currency.format(value.adxValue) : compact.format(value.adxValue)} / 参考 ${isDsp ? currency.format(value.referenceValue) : compact.format(value.referenceValue)}`,
      icon: GitCompareArrows,
      tone: value.gap > 0 ? 'warning' : 'success',
    },
    { label: '综合差异率', value: `${(value.gapRate * 100).toFixed(2)}%`, hint: '差异绝对值 / 参考侧', icon: ArrowUpRight, tone: Math.abs(value.gapRate) > .02 ? 'danger' : 'success' },
    { label: '超阈值明细', value: integer.format(value.mismatchRows), hint: '差异率绝对值 > 2%', icon: FileWarning, tone: value.mismatchRows ? 'warning' : 'success' },
    { label: '参考数据缺失', value: integer.format(value.missingRows), hint: '不参与差异率计算', icon: CircleAlert, tone: value.missingRows ? 'danger' : 'success' },
    { label: '对账匹配率', value: `${(value.matchRate * 100).toFixed(1)}%`, hint: `共 ${value.totalRows} 条对账明细`, icon: ShieldCheck, tone: value.matchRate >= .9 ? 'success' : 'warning' },
  ]
})

function rowGapRate(row: ReconciliationRow) {
  return activeSource.value === 'dsp' ? (row as DspReconciliationRow).costGapRate : (row as MediaReconciliationRow).impressionsGapRate
}

const filteredRows = computed(() => sourceRows.value.filter((row) => {
  const text = `${row.date} ${row.adSlotId} ${'dsp' in row ? row.dsp : ''}`.toLowerCase()
  if (keyword.value && !text.includes(keyword.value.trim().toLowerCase())) return false
  if (statusFilter.value === 'missing') return row.status === 'REFERENCE_MISSING'
  if (statusFilter.value === 'matched') return row.status === 'OK' && Math.abs(rowGapRate(row)) <= .02
  if (statusFilter.value === 'difference') return row.status === 'OK' && Math.abs(rowGapRate(row)) > .02
  return true
}))

const dailyTrend = computed(() => {
  const grouped = new Map<string, { adx: number; reference: number }>()
  sourceRows.value.forEach((row) => {
    const current = grouped.get(row.date) || { adx: 0, reference: 0 }
    if (activeSource.value === 'dsp') {
      const dspRow = row as DspReconciliationRow
      current.adx += dspRow.adxCost
      current.reference += dspRow.dspCost
    } else {
      const mediaRow = row as MediaReconciliationRow
      current.adx += mediaRow.adxRequests
      current.reference += mediaRow.mediaRequests
    }
    grouped.set(row.date, current)
  })
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({
    date: date.slice(5),
    adx: values.adx,
    reference: values.reference,
    gapRate: values.reference ? (values.adx - values.reference) / values.reference * 100 : 0,
  }))
})

const trendOption = computed<EChartsOption>(() => {
  const dark = theme.effective === 'dark'
  const axis = dark ? '#7e93a3' : '#8a96a0'
  const isDsp = activeSource.value === 'dsp'
  return {
    animationDuration: 560,
    grid: { left: 56, right: 48, top: 34, bottom: 32 },
    tooltip: { trigger: 'axis', backgroundColor: dark ? '#0d1a26' : '#14293d', borderWidth: 0, textStyle: { color: '#fff', fontSize: 10 } },
    legend: { top: 2, left: 10, itemWidth: 12, itemHeight: 7, textStyle: { color: axis, fontSize: 9 }, data: ['ADX', isDsp ? 'DSP 账单' : '媒体参考'] },
    xAxis: { type: 'category', data: dailyTrend.value.map((item) => item.date), axisLine: { lineStyle: { color: dark ? '#294154' : '#dce4e9' } }, axisTick: { show: false }, axisLabel: { color: axis, fontSize: 9 } },
    yAxis: [
      { type: 'value', axisLabel: { color: axis, fontSize: 9, formatter: (value: number) => isDsp ? `${Math.round(value / 1000)}k` : compact.format(value) }, splitLine: { lineStyle: { color: dark ? '#1c3041' : '#edf1f4' } } },
      { type: 'value', axisLabel: { color: axis, fontSize: 9, formatter: '{value}%' }, splitLine: { show: false } },
    ],
    series: [
      { name: 'ADX', type: 'bar', barWidth: 14, data: dailyTrend.value.map((item) => item.adx), itemStyle: { color: '#12b886', borderRadius: [5, 5, 0, 0] } },
      { name: isDsp ? 'DSP 账单' : '媒体参考', type: 'bar', barWidth: 14, data: dailyTrend.value.map((item) => item.reference), itemStyle: { color: dark ? '#5574b9' : '#9eb6f8', borderRadius: [5, 5, 0, 0] } },
      { name: '差异率', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 5, data: dailyTrend.value.map((item) => item.gapRate), lineStyle: { width: 2, color: '#f0a13f' }, itemStyle: { color: '#f0a13f' } },
    ],
  }
})

const attributions = computed(() => {
  const type = activeSource.value === 'dsp' ? 'DSP' : 'MEDIA'
  return report.value.attributions.filter((item) => item.sourceType === type)
})

const selectedAttribution = computed(() => attributions.value.find((item) => item.id === selectedAttributionId.value) || attributions.value[0] || null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query: ReconciliationQuery = { startDate: startDate.value, endDate: endDate.value, source: activeSource.value }
    report.value = await getReconciliation(auth.accessToken, query)
    selectedAttributionId.value = attributions.value[0]?.id ?? null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '对账数据加载失败'
  } finally {
    loading.value = false
  }
}

function switchSource(source: ReconciliationSource) {
  activeSource.value = source
  statusFilter.value = 'all'
  keyword.value = ''
  selectedAttributionId.value = null
  void load()
}

function selectRow(row: ReconciliationRow) {
  activeRowKey.value = `${row.date}-${row.adSlotId}`
  const match = attributions.value.find((item) => item.statDate === row.date && item.adSlotId === row.adSlotId)
  if (match) {
    selectedAttributionId.value = match.id
  } else {
    toast.show('该明细暂无归因记录')
  }
}

function exportCsv() {
  const isDsp = activeSource.value === 'dsp'
  const headers = isDsp
    ? ['date', 'adSlotId', 'dsp', 'adxImpressions', 'dspImpressions', 'impressionsGapRate', 'adxCost', 'dspCost', 'costGap', 'costGapRate', 'status']
    : ['date', 'adSlotId', 'adxRequests', 'mediaRequests', 'requestsGapRate', 'adxImpressions', 'mediaImpressions', 'impressionsGapRate', 'status']
  const lines = filteredRows.value.map((row) => headers.map((header) => JSON.stringify(String((row as unknown as Record<string, unknown>)[header] ?? ''))).join(','))
  const blob = new Blob([`\uFEFF${headers.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reconciliation-${activeSource.value}-${startDate.value}-${endDate.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.show(`已导出 ${filteredRows.value.length} 条对账明细`)
}

async function copyAttribution(item: ReconciliationAttribution) {
  const text = `${item.statDate} ${item.adSlotId} ${item.category}：${item.suggestion}`
  try {
    await navigator.clipboard.writeText(text)
    toast.show('归因建议已复制')
  } catch {
    toast.show('浏览器未允许复制，请手动选择文本')
  }
}

function rateClass(rate: number) {
  if (Math.abs(rate) > .02) return 'danger'
  if (Math.abs(rate) > .01) return 'warning'
  return 'success'
}

onMounted(load)
</script>

<template>
  <div class="reconciliation-page">
    <header class="adx-page-header">
      <div><p class="adx-page-kicker">数据报表 · 差异归因</p><h1 class="adx-page-title">三方对账</h1><p class="adx-page-description">比较 ADX 与 DSP、ADX 与媒体的逐日明细，并基于归因结果定位差异原因。</p></div>
      <div class="adx-page-actions"><button class="adx-button adx-button--secondary" type="button" @click="load"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button class="adx-button adx-button--primary" type="button" :disabled="!filteredRows.length" @click="exportCsv"><Download class="adx-icon" />导出明细</button></div>
    </header>

    <div v-if="error" class="reconciliation-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load">重新加载</button></div>

    <section class="reconciliation-filter adx-panel">
      <div class="reconciliation-source"><button type="button" :class="{ active: activeSource === 'dsp' }" @click="switchSource('dsp')">ADX vs DSP</button><button type="button" :class="{ active: activeSource === 'media' }" @click="switchSource('media')">ADX vs 媒体</button></div>
      <label class="reconciliation-date"><CalendarRange class="adx-icon" /><input v-model="startDate" type="date" aria-label="起始日期" /><span>至</span><input v-model="endDate" type="date" aria-label="结束日期" /><button type="button" @click="load">查询</button></label>
      <label class="adx-input-shell reconciliation-search"><Search class="adx-icon" /><input v-model="keyword" placeholder="广告位 ID 或 DSP 编码" /></label>
      <div class="reconciliation-status-filter"><button v-for="item in [{ value: 'all', label: '全部' }, { value: 'difference', label: '超阈值' }, { value: 'matched', label: '已匹配' }, { value: 'missing', label: '参考缺失' }]" :key="item.value" type="button" :class="{ active: statusFilter === item.value }" @click="statusFilter = item.value as StatusFilter">{{ item.label }}</button></div>
    </section>

    <section class="reconciliation-metrics">
      <article v-for="metric in metrics" :key="metric.label" class="reconciliation-metric">
        <template v-if="loading"><div class="adx-skeleton rec-skeleton-label" /><div class="adx-skeleton rec-skeleton-value" /><div class="adx-skeleton rec-skeleton-hint" /></template>
        <template v-else><div class="reconciliation-metric__top"><span>{{ metric.label }}</span><i :class="metric.tone"><component :is="metric.icon" class="adx-icon" /></i></div><strong :class="metric.tone">{{ metric.value }}</strong><small>{{ metric.hint }}</small></template>
      </article>
    </section>

    <section class="reconciliation-main-grid">
      <article class="adx-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">{{ activeSource === 'dsp' ? 'ADX 与 DSP 日差异' : 'ADX 与媒体日差异' }}</h2><p class="adx-panel__meta">{{ startDate }} 至 {{ endDate }} · 柱状为两侧数值，折线为差异率</p></div><span class="adx-status" :class="Math.abs(summary.gapRate) > .02 ? 'adx-status--warning' : 'adx-status--success'">{{ Math.abs(summary.gapRate) > .02 ? '存在差异' : '差异正常' }}</span></div>
        <EChart v-if="!loading && dailyTrend.length" :option="trendOption" :height="280" />
        <div v-else class="reconciliation-chart-state"><CircleAlert class="adx-icon" /><span>当前日期范围内没有可对比数据</span></div>
      </article>

      <aside class="adx-panel reconciliation-attribution-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">差异归因</h2><p class="adx-panel__meta">自动匹配的差异原因与处理建议</p></div><span class="adx-status adx-status--info">{{ attributions.length }} 项</span></div>
        <div v-if="loading" class="reconciliation-attribution-loading"><div v-for="index in 3" :key="index" class="adx-skeleton" /></div>
        <template v-else-if="selectedAttribution"><div class="reconciliation-attribution-list"><button v-for="item in attributions" :key="item.id" type="button" :class="{ active: selectedAttribution.id === item.id }" @click="selectedAttributionId = item.id"><span>{{ item.statDate.slice(5) }}</span><strong>{{ item.category }}</strong><small>{{ item.adSlotId }}</small></button></div>
          <div class="reconciliation-attribution-detail"><div class="reconciliation-attribution-detail__head"><div><span>{{ selectedAttribution.sourceType }} · {{ selectedAttribution.metric }}</span><h3>{{ selectedAttribution.category }}</h3></div><button type="button" aria-label="复制归因建议" @click="copyAttribution(selectedAttribution)"><Copy class="adx-icon" /></button></div><div class="reconciliation-compare"><div><span>ADX</span><strong>{{ integer.format(selectedAttribution.adxValue) }}</strong></div><i><GitCompareArrows class="adx-icon" /></i><div><span>参考</span><strong>{{ integer.format(selectedAttribution.refValue) }}</strong></div></div><p>{{ selectedAttribution.suggestion }}</p><button class="adx-button adx-button--secondary" type="button" @click="toast.show('已生成差异处理清单')"><ClipboardCheck class="adx-icon" />生成处理清单</button></div>
        </template>
        <div v-else class="reconciliation-attribution-empty"><CheckCircle2 class="adx-icon" /><strong>当前没有归因记录</strong><span>筛选范围内未发现可解释差异。</span></div>
      </aside>
    </section>

    <section class="adx-panel reconciliation-table-panel">
      <div class="adx-panel__head"><div><h2 class="adx-panel__title">对账明细</h2><p class="adx-panel__meta">共 {{ sourceRows.length }} 条，当前显示 {{ filteredRows.length }} 条</p></div><span class="reconciliation-threshold"><AlertTriangle class="adx-icon" />阈值：绝对差异率 &gt; 2%</span></div>
      <div v-if="loading" class="reconciliation-table-loading"><div v-for="index in 6" :key="index" class="adx-skeleton" /></div>
      <div v-else-if="filteredRows.length" class="adx-table-wrap">
        <table v-if="activeSource === 'dsp'" class="adx-table reconciliation-table"><thead><tr><th>日期</th><th>广告位</th><th>DSP</th><th>ADX 曝光</th><th>DSP 曝光</th><th>曝光差异率</th><th>ADX 消耗</th><th>DSP 消耗</th><th>金额差异</th><th>状态</th><th /></tr></thead><tbody><tr v-for="row in filteredRows as DspReconciliationRow[]" :key="`${row.date}-${row.adSlotId}-${row.dsp}`" :class="{ active: activeRowKey === `${row.date}-${row.adSlotId}` }" @click="selectRow(row)"><td>{{ row.date.slice(5) }}</td><td><strong>{{ row.adSlotId }}</strong></td><td>{{ row.dsp }}</td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : integer.format(row.adxImpressions) }}</td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : integer.format(row.dspImpressions) }}</td><td><span class="reconciliation-rate" :class="rateClass(row.impressionsGapRate)">{{ row.status === 'REFERENCE_MISSING' ? '—' : `${(row.impressionsGapRate * 100).toFixed(2)}%` }}</span></td><td>{{ currency.format(row.adxCost) }}</td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : currency.format(row.dspCost) }}</td><td :class="rateClass(row.costGapRate)">{{ row.status === 'REFERENCE_MISSING' ? '—' : currency.format(row.costGap) }}</td><td><span class="adx-status" :class="row.status === 'OK' ? (Math.abs(row.costGapRate) > .02 ? 'adx-status--warning' : 'adx-status--success') : 'adx-status--danger'">{{ row.status === 'OK' ? (Math.abs(row.costGapRate) > .02 ? '超阈值' : '已匹配') : '参考缺失' }}</span></td><td><button class="reconciliation-row-action" type="button" @click.stop="selectRow(row)">归因</button></td></tr></tbody></table>
        <table v-else class="adx-table reconciliation-table"><thead><tr><th>日期</th><th>广告位</th><th>ADX 请求</th><th>媒体请求</th><th>请求差异率</th><th>ADX 曝光</th><th>媒体曝光</th><th>曝光差异率</th><th>状态</th><th /></tr></thead><tbody><tr v-for="row in filteredRows as MediaReconciliationRow[]" :key="`${row.date}-${row.adSlotId}`" :class="{ active: activeRowKey === `${row.date}-${row.adSlotId}` }" @click="selectRow(row)"><td>{{ row.date.slice(5) }}</td><td><strong>{{ row.adSlotId }}</strong></td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : compact.format(row.adxRequests) }}</td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : compact.format(row.mediaRequests) }}</td><td><span class="reconciliation-rate" :class="rateClass(row.requestsGapRate)">{{ row.status === 'REFERENCE_MISSING' ? '—' : `${(row.requestsGapRate * 100).toFixed(2)}%` }}</span></td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : compact.format(row.adxImpressions) }}</td><td>{{ row.status === 'REFERENCE_MISSING' ? '—' : compact.format(row.mediaImpressions) }}</td><td><span class="reconciliation-rate" :class="rateClass(row.impressionsGapRate)">{{ row.status === 'REFERENCE_MISSING' ? '—' : `${(row.impressionsGapRate * 100).toFixed(2)}%` }}</span></td><td><span class="adx-status" :class="row.status === 'OK' ? (Math.abs(row.impressionsGapRate) > .02 ? 'adx-status--warning' : 'adx-status--success') : 'adx-status--danger'">{{ row.status === 'OK' ? (Math.abs(row.impressionsGapRate) > .02 ? '超阈值' : '已匹配') : '参考缺失' }}</span></td><td><button class="reconciliation-row-action" type="button" @click.stop="selectRow(row)">归因</button></td></tr></tbody></table>
      </div>
      <div v-else class="reconciliation-empty"><Search class="adx-icon" /><strong>没有符合条件的对账明细</strong><span>调整日期、关键词或状态筛选后重试。</span></div>
    </section>
  </div>
</template>

<style scoped>
.reconciliation-page { min-width: 0; }
.reconciliation-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.reconciliation-error .adx-icon { width: 15px; height: 15px; }
.reconciliation-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; font-weight: 650; }
.reconciliation-filter { display: flex; align-items: center; gap: 10px; padding: 12px 13px; }
.reconciliation-source { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--adx-surface-muted); }
.reconciliation-source button { height: 30px; padding: 0 11px; border: 0; border-radius: 9px; color: var(--adx-text-muted); background: transparent; font-size: 9px; white-space: nowrap; }
.reconciliation-source button.active { color: var(--adx-success); background: var(--adx-surface); box-shadow: var(--adx-shadow-card); font-weight: 650; }
.reconciliation-date { display: flex; align-items: center; gap: 7px; height: 38px; padding: 0 10px; border-radius: 11px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.reconciliation-date .adx-icon { width: 14px; height: 14px; }
.reconciliation-date input { width: 105px; border: 0; outline: 0; color: var(--adx-text-body); background: transparent; font-size: 9px; }
.reconciliation-date span { color: var(--adx-text-muted); font-size: 8px; }
.reconciliation-date button { height: 27px; padding: 0 9px; border: 0; border-radius: 8px; color: #fff; background: var(--adx-brand-600); font-size: 8px; }
.reconciliation-search { width: 230px; }
.reconciliation-search input { font-size: 9px; }
.reconciliation-status-filter { display: flex; gap: 4px; margin-left: auto; }
.reconciliation-status-filter button { height: 30px; padding: 0 9px; border: 0; border-radius: 9px; color: var(--adx-text-muted); background: transparent; font-size: 8px; }
.reconciliation-status-filter button.active { color: var(--adx-success); background: var(--adx-brand-soft); font-weight: 650; }
.reconciliation-metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 9px; margin-top: 12px; }
.reconciliation-metric { min-width: 0; min-height: 108px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.reconciliation-metric__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--adx-text-muted); font-size: 9px; }
.reconciliation-metric__top i { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--adx-success); background: var(--adx-success-soft); }
.reconciliation-metric__top i.warning { color: var(--adx-warning); background: var(--adx-warning-soft); }
.reconciliation-metric__top i.danger { color: var(--adx-danger); background: var(--adx-danger-soft); }
.reconciliation-metric__top .adx-icon { width: 13px; height: 13px; }
.reconciliation-metric > strong { display: block; margin-top: 12px; font-size: 20px; letter-spacing: -.3px; }
.reconciliation-metric > strong.success { color: var(--adx-success); }
.reconciliation-metric > strong.warning { color: var(--adx-warning); }
.reconciliation-metric > strong.danger { color: var(--adx-danger); }
.reconciliation-metric > small { display: block; margin-top: 7px; overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.rec-skeleton-label { width: 70px; height: 8px; }
.rec-skeleton-value { width: 95px; height: 20px; margin-top: 17px; }
.rec-skeleton-hint { width: 90px; height: 7px; margin-top: 10px; }
.reconciliation-main-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(390px, .75fr); gap: 12px; margin-top: 12px; }
.reconciliation-chart-state { display: grid; place-items: center; align-content: center; height: 280px; color: var(--adx-text-muted); font-size: 9px; }
.reconciliation-chart-state .adx-icon { width: 24px; height: 24px; margin-bottom: 9px; color: var(--adx-warning); }
.reconciliation-attribution-panel { min-width: 0; }
.reconciliation-attribution-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 10px 12px 5px; }
.reconciliation-attribution-list button { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 7px; padding: 9px; border: 0; border-radius: 10px; color: var(--adx-text-body); background: var(--adx-surface-muted); text-align: left; }
.reconciliation-attribution-list button.active { color: var(--adx-success); background: var(--adx-brand-soft); }
.reconciliation-attribution-list span { font-family: "Cascadia Code", Consolas, monospace; font-size: 8px; }
.reconciliation-attribution-list strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.reconciliation-attribution-list small { grid-column: 1 / -1; overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.reconciliation-attribution-detail { margin: 8px 12px 12px; padding: 12px; border-radius: 12px; background: var(--adx-surface-muted); }
.reconciliation-attribution-detail__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.reconciliation-attribution-detail__head span { color: var(--adx-text-muted); font-size: 8px; }
.reconciliation-attribution-detail__head h3 { margin: 4px 0 0; font-size: 11px; }
.reconciliation-attribution-detail__head button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; color: var(--adx-text-muted); background: var(--adx-surface); }
.reconciliation-attribution-detail__head .adx-icon { width: 14px; height: 14px; }
.reconciliation-compare { display: grid; grid-template-columns: 1fr 28px 1fr; align-items: center; gap: 7px; margin-top: 11px; }
.reconciliation-compare > div { padding: 8px; border-radius: 9px; background: var(--adx-surface); }
.reconciliation-compare span { display: block; color: var(--adx-text-muted); font-size: 8px; }
.reconciliation-compare strong { display: block; margin-top: 4px; font-size: 10px; }
.reconciliation-compare > i { display: grid; place-items: center; color: var(--adx-warning); }
.reconciliation-compare .adx-icon { width: 15px; height: 15px; }
.reconciliation-attribution-detail > p { margin: 11px 0; color: var(--adx-text-body); font-size: 9px; line-height: 1.6; }
.reconciliation-attribution-detail .adx-button { width: 100%; }
.reconciliation-attribution-empty,
.reconciliation-empty { display: grid; place-items: center; align-content: center; min-height: 210px; color: var(--adx-text-muted); text-align: center; }
.reconciliation-attribution-empty .adx-icon,
.reconciliation-empty .adx-icon { width: 28px; height: 28px; color: var(--adx-success); }
.reconciliation-attribution-empty strong,
.reconciliation-empty strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.reconciliation-attribution-empty span,
.reconciliation-empty span { margin-top: 5px; font-size: 8px; }
.reconciliation-attribution-loading { display: grid; gap: 8px; padding: 12px; }
.reconciliation-attribution-loading .adx-skeleton { height: 50px; }
.reconciliation-table-panel { margin-top: 12px; }
.reconciliation-threshold { display: inline-flex; align-items: center; gap: 5px; color: var(--adx-warning); font-size: 8px; }
.reconciliation-threshold .adx-icon { width: 13px; height: 13px; }
.reconciliation-table td strong { color: var(--adx-text-strong); }
.reconciliation-table tbody tr { cursor: pointer; }
.reconciliation-table tbody tr.active { background: var(--adx-brand-soft); }
.reconciliation-table tbody tr:hover { background: var(--adx-surface-muted); }
.reconciliation-rate { font-weight: 650; }
.reconciliation-rate.success,
.reconciliation-table td.success { color: var(--adx-success); }
.reconciliation-rate.warning,
.reconciliation-table td.warning { color: var(--adx-warning); }
.reconciliation-rate.danger,
.reconciliation-table td.danger { color: var(--adx-danger); }
.reconciliation-row-action { height: 26px; padding: 0 8px; border: 0; border-radius: 8px; color: var(--adx-success); background: var(--adx-brand-soft); font-size: 8px; }
.reconciliation-table-loading { display: grid; gap: 7px; padding: 12px; }
.reconciliation-table-loading .adx-skeleton { height: 34px; }
.spinning { animation: reconciliation-spin .9s linear infinite; }
@keyframes reconciliation-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) {
  .reconciliation-date { display: none; }
  .reconciliation-search { width: 210px; }
  .reconciliation-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .reconciliation-main-grid { grid-template-columns: minmax(0, 1.35fr) minmax(360px, .75fr); }
}
</style>
