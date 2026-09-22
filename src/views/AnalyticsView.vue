<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import { CalendarRange, CircleAlert, Download, RefreshCw, Search } from 'lucide-vue-next'
import EChart from '@/components/EChart.vue'
import { getAnalyticsPayload, type AnalyticsMode, type AnalyticsPayload, type AnalyticsTableRow } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToastStore()
const mode = computed(() => String(route.name) as AnalyticsMode)
const startDate = ref('2026-09-16')
const endDate = ref('2026-09-22')
const keyword = ref('')
const specialTab = ref('DSP 结算')
const loading = ref(true)
const error = ref('')
const payload = ref<AnalyticsPayload | null>(null)

const integer = new Intl.NumberFormat('zh-CN')
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 })
const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 })

function format(value: number, type: 'currency' | 'number' | 'percent') {
  if (type === 'currency') return currency.format(value)
  if (type === 'percent') return `${value.toFixed(2)}%`
  return integer.format(value)
}

const filteredRows = computed(() => {
  const rows = payload.value?.rows || []
  const query = keyword.value.trim().toLowerCase()
  return query ? rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query))) : rows
})

const tableColumns = computed(() => {
  const first = filteredRows.value[0]
  if (!first) return []
  return Object.keys(first).filter((key) => key !== 'id').map((key) => ({ key, label: columnLabel(key) }))
})

function columnLabel(key: string) {
  const labels: Record<string, string> = {
    date: '日期', media: '媒体', requests: '请求量', fillRate: '填充率', ecpm: 'eCPM', revenue: '收益', health: '健康度', type: '报表类型', dimension: '维度', amount: '金额', count: '数量', gapRate: '差异率', status: '状态', dsp: 'DSP', adxCost: 'ADX 消耗', billCost: '账单消耗', gap: '差异', adSlotId: '广告位', impressions: '曝光量', clicks: '点击量', occurredAt: '事件时间', requestId: '请求 ID', eventType: '事件类型', retryCount: '重试次数', errorMessage: '错误信息',
  }
  return labels[key] || key
}

const trendOption = computed<EChartsOption>(() => {
  const data = payload.value?.trend || []
  const dark = theme.effective === 'dark'
  const axis = dark ? '#7e93a3' : '#8a96a0'
  const unit = payload.value?.unitLabel || '数值'
  return {
    animationDuration: 560,
    grid: { left: 56, right: 45, top: 38, bottom: 32 },
    tooltip: { trigger: 'axis', backgroundColor: dark ? '#0d1a26' : '#14293d', borderWidth: 0, textStyle: { color: '#fff', fontSize: 10 } },
    legend: { top: 2, left: 10, itemWidth: 12, itemHeight: 7, textStyle: { color: axis, fontSize: 9 }, data: [unit, mode.value.includes('settlement') ? '账单 / 参考' : '参考值', '差异率'] },
    xAxis: { type: 'category', boundaryGap: true, data: data.map((item) => item.date), axisLine: { lineStyle: { color: dark ? '#294154' : '#dce4e9' } }, axisTick: { show: false }, axisLabel: { color: axis, fontSize: 9 } },
    yAxis: [
      { type: 'value', axisLabel: { color: axis, fontSize: 9, formatter: (value: number) => compact.format(value) }, splitLine: { lineStyle: { color: dark ? '#1c3041' : '#edf1f4' } } },
      { type: 'value', axisLabel: { color: axis, fontSize: 9, formatter: '{value}%' }, splitLine: { show: false } },
    ],
    series: [
      { name: unit, type: 'bar', barWidth: 15, data: data.map((item) => item.primary), itemStyle: { color: '#12b886', borderRadius: [5, 5, 0, 0] } },
      { name: mode.value.includes('settlement') ? '账单 / 参考' : '参考值', type: 'bar', barWidth: 15, data: data.map((item) => item.secondary), itemStyle: { color: dark ? '#5574b9' : '#9eb6f8', borderRadius: [5, 5, 0, 0] } },
      { name: '差异率', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 5, data: data.map((item) => item.rate), lineStyle: { width: 2, color: '#f0a13f' }, itemStyle: { color: '#f0a13f' } },
    ],
  }
})

const categoryOption = computed<EChartsOption>(() => {
  const dark = theme.effective === 'dark'
  const colors = ['#12b886', '#6b9bff', '#b88ef0', '#f0a13f', '#ef6f5e']
  return {
    tooltip: { trigger: 'item', backgroundColor: dark ? '#0d1a26' : '#14293d', borderWidth: 0, textStyle: { color: '#fff', fontSize: 10 } },
    series: [{ type: 'pie', radius: ['54%', '78%'], center: ['50%', '52%'], label: { show: false }, itemStyle: { borderColor: dark ? '#101f2c' : '#fff', borderWidth: 3 }, data: (payload.value?.categories || []).map((item, index) => ({ value: item.value, name: item.name, itemStyle: { color: colors[index % colors.length] } })) }],
  }
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    payload.value = await getAnalyticsPayload(auth.accessToken, mode.value, startDate.value, endDate.value)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '报表数据加载失败'
  } finally {
    loading.value = false
  }
}

function exportCsv() {
  if (!payload.value || !filteredRows.value.length) return
  const keys = Object.keys(filteredRows.value[0] || {})
  const lines = filteredRows.value.map((row) => keys.map((key) => JSON.stringify(String(row[key] ?? ''))).join(','))
  const blob = new Blob([`\uFEFF${keys.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${mode.value}-${startDate.value}-${endDate.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.show(`已导出 ${filteredRows.value.length} 条记录`)
}

function cellValue(row: AnalyticsTableRow, key: string) {
  const value = row[key]
  if (key === 'revenue' || key === 'amount' || key === 'adxCost' || key === 'billCost' || key === 'gap') return currency.format(Number(value))
  if (key === 'fillRate' || key === 'gapRate') return `${Number(value).toFixed(2)}%`
  if (key === 'ecpm') return `¥ ${Number(value).toFixed(2)}`
  if (key === 'requests' || key === 'impressions' || key === 'clicks' || key === 'count') return integer.format(Number(value))
  return String(value ?? '—')
}

watch(() => route.name, () => { specialTab.value = 'DSP 结算'; void load() })
onMounted(load)
</script>

<template>
  <div v-if="payload || loading" class="analytics-page">
    <header class="adx-page-header"><div><p class="adx-page-kicker">{{ payload?.kicker || '数据报表' }}</p><h1 class="adx-page-title">{{ payload?.title || '报表' }}</h1><p class="adx-page-description">{{ payload?.description }}</p></div><div class="adx-page-actions"><label class="analytics-date"><CalendarRange class="adx-icon" /><input v-model="startDate" type="date" /><span>至</span><input v-model="endDate" type="date" /><button type="button" @click="load">查询</button></label><button class="adx-button adx-button--secondary" type="button" @click="load"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button class="adx-button adx-button--primary" type="button" :disabled="!filteredRows.length" @click="exportCsv"><Download class="adx-icon" />导出</button></div></header>
    <div v-if="error" class="analytics-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load">重新加载</button></div>
    <section class="analytics-metrics"><article v-for="metric in payload?.metrics || []" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ format(metric.value, metric.format) }}</strong><small>{{ metric.hint }}</small></article></section>
    <div v-if="mode === 'report-special'" class="analytics-special-tabs"><button v-for="tab in payload?.specialTabs || []" :key="tab" type="button" :class="{ active: specialTab === tab }" @click="specialTab = tab">{{ tab }}</button></div>
    <section class="analytics-main-grid">
      <article class="adx-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">{{ mode === 'event-logs' ? '事件量趋势' : `${payload?.unitLabel || '核心指标'}趋势` }}</h2><p class="adx-panel__meta">{{ startDate }} 至 {{ endDate }}</p></div><span class="adx-status adx-status--success">数据已更新</span></div><EChart v-if="!loading && payload?.trend?.length" :option="trendOption" :height="300" /><div v-else class="analytics-chart-state"><RefreshCw class="adx-icon" /><span>{{ loading ? '数据加载中…' : '当前范围没有趋势数据' }}</span></div></article>
      <aside class="adx-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">{{ mode === 'event-logs' ? '事件类型占比' : '构成占比' }}</h2><p class="adx-panel__meta">按当前报表维度拆分</p></div></div><EChart v-if="!loading && payload?.categories?.length" :option="categoryOption" :height="210" /><div class="analytics-category-list"><div v-for="item in payload?.categories || []" :key="item.name"><span>{{ item.name }}</span><strong>{{ item.share ? `${item.share}%` : compact.format(item.value) }}</strong></div></div></aside>
    </section>
    <section class="adx-panel analytics-table-panel"><div class="adx-panel__head"><div><h2 class="adx-panel__title">{{ mode === 'event-logs' ? '事件日志明细' : (mode === 'report-special' ? specialTab : '明细数据') }}</h2><p class="adx-panel__meta">共 {{ filteredRows.length }} 条记录</p></div><label class="adx-input-shell analytics-search"><Search class="adx-icon" /><input v-model="keyword" placeholder="搜索明细" /></label></div>
      <div v-if="loading" class="analytics-table-loading"><div v-for="index in 7" :key="index" class="adx-skeleton" /></div>
      <div v-else-if="filteredRows.length" class="adx-table-wrap"><table class="adx-table analytics-table"><thead><tr><th v-for="column in tableColumns" :key="column.key">{{ column.label }}</th></tr></thead><tbody><tr v-for="row in filteredRows" :key="row.id"><td v-for="column in tableColumns" :key="column.key"><span :class="{ success: row[column.key] === 'SUCCESS' || row[column.key] === '正常', warning: row[column.key] === '关注' || row[column.key] === 'DEDUPLICATED', danger: row[column.key] === 'FAILED' || row[column.key] === '超阈值' }">{{ cellValue(row, column.key) }}</span></td></tr></tbody></table></div>
      <div v-else class="analytics-empty"><Search class="adx-icon" /><strong>没有匹配的数据</strong><span>调整日期范围或关键词后重试。</span></div>
    </section>
  </div>
</template>

<style scoped>
.analytics-page { min-width: 0; }
.analytics-date { display: flex; align-items: center; gap: 7px; height: 38px; padding: 0 10px; border-radius: 11px; color: var(--adx-text-muted); background: var(--adx-surface-muted); }
.analytics-date .adx-icon { width: 14px; height: 14px; }
.analytics-date input { width: 105px; border: 0; outline: 0; color: var(--adx-text-body); background: transparent; font-size: 9px; }
.analytics-date span { font-size: 8px; }
.analytics-date button { height: 27px; padding: 0 9px; border: 0; border-radius: 8px; color: #fff; background: var(--adx-brand-600); font-size: 8px; }
.analytics-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.analytics-error .adx-icon { width: 15px; height: 15px; }
.analytics-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; }
.analytics-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.analytics-metrics article { min-height: 102px; padding: 14px 15px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.analytics-metrics span { color: var(--adx-text-muted); font-size: 9px; }
.analytics-metrics strong { display: block; margin-top: 12px; font-size: 21px; letter-spacing: -.3px; }
.analytics-metrics small { display: block; margin-top: 7px; color: var(--adx-text-muted); font-size: 8px; }
.analytics-special-tabs { display: flex; gap: 5px; margin-top: 12px; padding: 5px; border-radius: 13px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.analytics-special-tabs button { height: 32px; padding: 0 13px; border: 0; border-radius: 9px; color: var(--adx-text-muted); background: transparent; font-size: 9px; }
.analytics-special-tabs button.active { color: var(--adx-success); background: var(--adx-brand-soft); font-weight: 650; }
.analytics-main-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(330px, .65fr); gap: 12px; margin-top: 12px; }
.analytics-chart-state { display: grid; place-items: center; align-content: center; height: 300px; color: var(--adx-text-muted); font-size: 9px; }
.analytics-chart-state .adx-icon { width: 22px; height: 22px; margin-bottom: 8px; color: var(--adx-success); }
.analytics-category-list { display: grid; gap: 8px; padding: 4px 15px 14px; }
.analytics-category-list > div { display: flex; justify-content: space-between; color: var(--adx-text-muted); font-size: 8px; }
.analytics-category-list strong { color: var(--adx-text-strong); }
.analytics-table-panel { margin-top: 12px; }
.analytics-search { width: 230px; }
.analytics-search input { font-size: 9px; }
.analytics-table-loading { display: grid; gap: 7px; padding: 12px; }
.analytics-table-loading .adx-skeleton { height: 38px; }
.analytics-table .success { color: var(--adx-success); }
.analytics-table .warning { color: var(--adx-warning); }
.analytics-table .danger { color: var(--adx-danger); }
.analytics-empty { display: grid; place-items: center; align-content: center; min-height: 240px; color: var(--adx-text-muted); text-align: center; }
.analytics-empty .adx-icon { width: 28px; height: 28px; color: var(--adx-success); }
.analytics-empty strong { margin-top: 12px; color: var(--adx-text-strong); font-size: 10px; }
.analytics-empty span { margin-top: 5px; font-size: 8px; }
.spinning { animation: analytics-spin .9s linear infinite; }
@keyframes analytics-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) { .analytics-date { display: none; } .analytics-main-grid { grid-template-columns: minmax(0, 1.35fr) minmax(320px, .75fr); } }
</style>
