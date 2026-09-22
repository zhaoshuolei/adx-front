<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import {
  Activity,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Database,
  Gauge,
  GitBranch,
  Radio,
  RefreshCw,
  Send,
  ServerCog,
  TriangleAlert,
  Zap,
} from 'lucide-vue-next'
import EChart from '@/components/EChart.vue'
import {
  deriveRuntimeIncidents,
  getRuntimeStatus,
  maxKafkaLag,
  minuteLabels,
  trafficForEvent,
} from '@/services/runtime'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useToastStore } from '@/stores/toast'
import type { RuntimeIncident, RuntimeStatus } from '@/types/api'

const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToastStore()
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const status = ref<RuntimeStatus | null>(null)
const windowMinutes = ref(60)
const refreshSeconds = ref(15)
const autoRefresh = ref(true)
let refreshTimer = 0

const integer = new Intl.NumberFormat('zh-CN')
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 })

const engineHealthy = computed(() => status.value?.engines.filter((engine) => engine.healthzOk).length || 0)
const engineTotal = computed(() => status.value?.engines.length || 0)
const incidents = computed<RuntimeIncident[]>(() => status.value ? deriveRuntimeIncidents(status.value) : [])
const clusterHealthy = computed(() => engineTotal.value > 0 && engineHealthy.value === engineTotal.value && incidents.value.length === 0)

const requestQps = computed(() => {
  const traffic = status.value?.traffic
  if (!traffic) return 0
  return traffic.requests / Math.max(windowMinutes.value * 60, 1)
})

const fanoutRate = computed(() => {
  const traffic = status.value?.traffic
  return traffic?.requests ? traffic.fanout / traffic.requests : 0
})

const fillRate = computed(() => {
  const traffic = status.value?.traffic
  return traffic?.bids ? traffic.filled / traffic.bids : 0
})

const winRate = computed(() => {
  const traffic = status.value?.traffic
  return traffic?.filled ? traffic.won / traffic.filled : 0
})

const errorRate = computed(() => {
  const traffic = status.value?.traffic
  return traffic?.requests ? traffic.errors / traffic.requests : 0
})

const kafkaLag = computed(() => maxKafkaLag(status.value?.kafkaLags || []))

const metrics = computed(() => [
  { label: '实时请求', value: requestQps.value ? `${compact.format(requestQps.value)}/s` : '—', hint: `${windowMinutes.value} 分钟窗口`, icon: Radio, tone: 'cyan' },
  { label: '扇出倍率', value: fanoutRate.value ? `${fanoutRate.value.toFixed(2)}x` : '—', hint: '竞价请求 / 原始请求', icon: Zap, tone: 'blue' },
  { label: '填充率', value: fillRate.value ? `${(fillRate.value * 100).toFixed(1)}%` : '—', hint: '填充 / 竞价请求', icon: Gauge, tone: 'green' },
  { label: '获胜率', value: winRate.value ? `${(winRate.value * 100).toFixed(1)}%` : '—', hint: '获胜 / 填充', icon: CheckCircle2, tone: 'green' },
  { label: '错误率', value: errorRate.value ? `${(errorRate.value * 100).toFixed(2)}%` : '—', hint: '错误 / 原始请求', icon: CircleAlert, tone: errorRate.value > 0.001 ? 'amber' : 'green' },
  { label: 'Kafka 延迟', value: integer.format(kafkaLag.value), hint: '所有消费组最大值', icon: Database, tone: kafkaLag.value > 1000 ? 'amber' : 'green' },
])

const trafficOption = computed<EChartsOption>(() => {
  const traffic = status.value?.traffic
  const rows = traffic?.perMinute || []
  const dark = theme.effective === 'dark'
  const axisColor = dark ? '#7e93a3' : '#8a96a0'
  return {
    animationDuration: 520,
    grid: { left: 52, right: 22, top: 38, bottom: 34 },
    tooltip: { trigger: 'axis', backgroundColor: dark ? '#0d1a26' : '#14293d', borderWidth: 0, textStyle: { color: '#fff', fontSize: 10 } },
    legend: { top: 3, left: 10, itemWidth: 12, itemHeight: 6, textStyle: { color: axisColor, fontSize: 9 }, data: ['请求', '竞价', '填充', '曝光'] },
    xAxis: { type: 'category', boundaryGap: false, data: minuteLabels(rows), axisLine: { lineStyle: { color: dark ? '#294154' : '#dce4e9' } }, axisTick: { show: false }, axisLabel: { color: axisColor, fontSize: 9 } },
    yAxis: { type: 'value', axisLabel: { color: axisColor, fontSize: 9, formatter: (value: number) => compact.format(value) }, splitLine: { lineStyle: { color: dark ? '#1c3041' : '#edf1f4', type: 'dashed' } } },
    series: [
      { name: '请求', type: 'line', smooth: true, symbol: 'none', data: trafficForEvent(rows, 'request'), lineStyle: { width: 2.4, color: '#12b886' }, areaStyle: { color: dark ? 'rgba(72,217,169,.08)' : 'rgba(18,184,134,.08)' } },
      { name: '竞价', type: 'line', smooth: true, symbol: 'none', data: trafficForEvent(rows, 'bid'), lineStyle: { width: 1.7, color: '#6b9bff' } },
      { name: '填充', type: 'line', smooth: true, symbol: 'none', data: trafficForEvent(rows, 'filled'), lineStyle: { width: 1.7, color: '#b88ef0' } },
      { name: '曝光', type: 'line', smooth: true, symbol: 'none', data: trafficForEvent(rows, 'impression'), lineStyle: { width: 1.7, color: '#f0a13f' } },
    ],
  }
})

const snapshotRows = computed(() => {
  const snapshot = status.value?.snapshots
  return [
    { label: '运行时配置', value: snapshot ? `${snapshot.runtimeConfig} 项` : '—', hint: '引擎启动与在线更新参数' },
    { label: 'DSP 配置', value: snapshot ? `${snapshot.dsp} 个` : '—', hint: '启用渠道与协议配置' },
    { label: '媒体应用', value: snapshot ? `${snapshot.media} 个` : '—', hint: '媒体与应用映射' },
    { label: '广告位快照', value: snapshot ? integer.format(snapshot.adSpace) : '—', hint: '实时下发到引擎' },
    { label: '策略方案', value: snapshot ? `${snapshot.strategyCount} 个` : '—', hint: `当前版本 v${snapshot?.strategyVersion || '—'}` },
  ]
})

function uptime(value: number) {
  const hours = Math.floor(value / 3_600_000)
  const days = Math.floor(hours / 24)
  return days ? `${days}天${hours % 24}小时` : `${hours}小时`
}

function formatServerTime(value?: number) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function scheduleRefresh() {
  window.clearInterval(refreshTimer)
  if (!autoRefresh.value) return
  refreshTimer = window.setInterval(() => { void load(true) }, refreshSeconds.value * 1000)
}

async function load(silent = false) {
  if (silent) refreshing.value = true
  else loading.value = true
  error.value = ''
  try {
    status.value = await getRuntimeStatus(auth.accessToken, windowMinutes.value)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '运行状态加载失败'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function selectWindow(minutes: number) {
  windowMinutes.value = minutes
  void load()
}

watch(refreshSeconds, scheduleRefresh)
watch(autoRefresh, scheduleRefresh)

onMounted(() => {
  void load()
  scheduleRefresh()
})
onBeforeUnmount(() => window.clearInterval(refreshTimer))
</script>

<template>
  <div class="runtime-page">
    <header class="adx-page-header">
      <div><p class="adx-page-kicker">经营中心 · 研发与运维视图</p><h1 class="adx-page-title">实时信号</h1><p class="adx-page-description">监控请求、竞价、填充、错误、引擎实例、Kafka 消费与配置快照。<span class="runtime-live"><i :class="{ warning: !clusterHealthy }" />{{ clusterHealthy ? '全链路正常' : '存在待处理信号' }}</span></p></div>
      <div class="adx-page-actions runtime-actions"><div class="runtime-window"><button v-for="minutes in [5, 15, 60]" :key="minutes" type="button" :class="{ active: windowMinutes === minutes }" @click="selectWindow(minutes)">{{ minutes }} 分钟</button></div><button class="adx-button adx-button--secondary" type="button" @click="load(true)"><RefreshCw class="adx-icon" :class="{ spinning: refreshing }" />刷新</button><button class="adx-button adx-button--primary" type="button" @click="toast.show('告警规则创建入口已打开')"><BellRing class="adx-icon" />告警规则</button></div>
    </header>

    <div v-if="error" class="runtime-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load()">重新加载</button></div>

    <div class="runtime-context">
      <div><span class="runtime-cluster-icon"><ServerCog class="adx-icon" /></span><p><strong>生产集群</strong><small>{{ status?.admins.length || 0 }} 个管理实例 · {{ engineTotal }} 个引擎 · 配置版本 v{{ status?.snapshots.strategyVersion || '—' }}</small></p></div>
      <div class="runtime-context__right"><span>服务时间</span><strong>{{ formatServerTime(status?.serverTime) }}</strong></div>
    </div>

    <section class="runtime-metrics">
      <article v-for="metric in metrics" :key="metric.label" class="runtime-metric">
        <template v-if="loading"><div class="adx-skeleton runtime-skeleton-title" /><div class="adx-skeleton runtime-skeleton-value" /><div class="adx-skeleton runtime-skeleton-hint" /></template>
        <template v-else><div class="runtime-metric__top"><span>{{ metric.label }}</span><i :class="metric.tone"><component :is="metric.icon" class="adx-icon" /></i></div><strong>{{ metric.value }}</strong><small>{{ metric.hint }}</small></template>
      </article>
    </section>

    <section class="runtime-main-grid">
      <article class="adx-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">流量瀑布</h2><p class="adx-panel__meta">按分钟聚合 · 最近 {{ windowMinutes }} 分钟</p></div><span class="adx-status adx-status--success"><Activity class="adx-icon" />持续接收</span></div>
        <EChart v-if="status" :option="trafficOption" :height="315" />
        <div v-else class="runtime-chart-skeleton"><div class="adx-skeleton" /></div>
      </article>

      <aside class="adx-panel runtime-incident-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">异常队列</h2><p class="adx-panel__meta">由运行时数据自动推导</p></div><span class="adx-status" :class="incidents.length ? 'adx-status--warning' : 'adx-status--success'">{{ incidents.length }} 项</span></div>
        <div v-if="loading" class="runtime-incident-loading"><div v-for="index in 3" :key="index" class="adx-skeleton" /></div>
        <div v-else-if="incidents.length" class="runtime-incidents"><div v-for="incident in incidents" :key="incident.id" :class="incident.level"><i /><p><strong>{{ incident.title }}</strong><small>{{ incident.detail }}</small></p><time>{{ incident.time }}</time></div></div>
        <div v-else class="runtime-all-clear"><CheckCircle2 class="adx-icon" /><strong>当前没有高风险异常</strong><span>实例、流量与消费组均在正常范围。</span></div>
      </aside>
    </section>

    <section class="runtime-bottom-grid">
      <article class="adx-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">引擎实例</h2><p class="adx-panel__meta">EngineInfo / healthzOk</p></div><span class="adx-status" :class="clusterHealthy ? 'adx-status--success' : 'adx-status--warning'">{{ engineHealthy }} / {{ engineTotal }} 在线</span></div>
        <div class="adx-table-wrap"><table class="adx-table runtime-engine-table"><thead><tr><th>实例</th><th>版本</th><th>来源</th><th>运行时长</th><th>地址</th><th>状态</th></tr></thead><tbody><tr v-for="engine in status?.engines || []" :key="engine.engineId"><td><strong>{{ engine.engineId }}</strong></td><td>{{ engine.version }}</td><td>{{ engine.source }}</td><td>{{ uptime(Date.now() - engine.startedAt) }}</td><td>{{ engine.baseUrl }}</td><td><span class="adx-status" :class="engine.healthzOk ? 'adx-status--success' : 'adx-status--danger'"><i class="runtime-dot" />{{ engine.healthzOk ? 'healthy' : 'unhealthy' }}</span></td></tr></tbody></table></div>
      </article>

      <article class="adx-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">配置快照</h2><p class="adx-panel__meta">当前下发到引擎的配置链路</p></div><button class="adx-button adx-button--secondary" type="button" @click="toast.show('配置推送已触发')"><Send class="adx-icon" />推送</button></div>
        <div class="runtime-snapshot-list"><div v-for="row in snapshotRows" :key="row.label"><span>{{ row.label }}</span><strong>{{ row.value }}</strong><small>{{ row.hint }}</small></div></div>
        <div class="runtime-kafka"><h3><GitBranch class="adx-icon" />Kafka 消费组</h3><div v-for="item in status?.kafkaLags || []" :key="item.group"><span>{{ item.group }}</span><strong :class="{ warning: item.lag > 1000 || item.error }">{{ integer.format(item.lag) }}</strong><i><b :style="{ width: `${Math.min(100, item.lag / 20)}%` }" :class="{ warning: item.lag > 1000 || item.error }" /></i></div></div>
      </article>
    </section>

    <footer class="runtime-footer"><span><i :class="{ warning: !clusterHealthy }" />{{ autoRefresh ? `每 ${refreshSeconds} 秒自动刷新` : '自动刷新已暂停' }}</span><label><input v-model="autoRefresh" type="checkbox" />自动刷新</label><select v-model.number="refreshSeconds" :disabled="!autoRefresh"><option :value="15">15 秒</option><option :value="30">30 秒</option><option :value="60">60 秒</option></select><span v-if="refreshing">正在更新运行时数据…</span></footer>
  </div>
</template>

<style scoped>
.runtime-page { min-width: 0; }
.runtime-actions { align-items: center; }
.runtime-window { display: flex; gap: 3px; padding: 4px; border-radius: 12px; background: var(--adx-surface-muted); }
.runtime-window button { height: 30px; padding: 0 10px; border: 0; border-radius: 9px; color: var(--adx-text-muted); background: transparent; font-size: 9px; }
.runtime-window button.active { color: var(--adx-success); background: var(--adx-surface); box-shadow: var(--adx-shadow-card); font-weight: 650; }
.runtime-live { display: inline-flex; align-items: center; gap: 7px; margin-left: 8px; color: var(--adx-success); font-weight: 650; }
.runtime-live i,
.runtime-footer i { width: 7px; height: 7px; border-radius: 50%; background: var(--adx-brand-500); box-shadow: 0 0 0 4px var(--adx-brand-soft); }
.runtime-live i.warning,
.runtime-footer i.warning { background: var(--adx-warning); box-shadow: 0 0 0 4px var(--adx-warning-soft); }
.runtime-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.runtime-error .adx-icon { width: 15px; height: 15px; }
.runtime-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; font-weight: 650; }
.runtime-context { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 12px; padding: 10px 13px; border-radius: 14px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.runtime-context > div:first-child { display: flex; align-items: center; gap: 10px; }
.runtime-cluster-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--adx-success); background: var(--adx-brand-soft); }
.runtime-cluster-icon .adx-icon { width: 16px; height: 16px; }
.runtime-context p { margin: 0; }
.runtime-context strong { display: block; font-size: 10px; }
.runtime-context small { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; }
.runtime-context__right { text-align: right; }
.runtime-context__right span { display: block; color: var(--adx-text-muted); font-size: 8px; }
.runtime-context__right strong { margin-top: 4px; font-family: "Cascadia Code", Consolas, monospace; font-size: 9px; }
.runtime-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 9px; }
.runtime-metric { min-width: 0; min-height: 105px; padding: 13px 14px; border-radius: 15px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.runtime-metric__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--adx-text-muted); font-size: 9px; }
.runtime-metric__top i { display: grid; flex: 0 0 auto; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--adx-success); background: var(--adx-brand-soft); }
.runtime-metric__top i.cyan,
.runtime-metric__top i.blue { color: var(--adx-info); background: var(--adx-info-soft); }
.runtime-metric__top i.amber { color: var(--adx-warning); background: var(--adx-warning-soft); }
.runtime-metric__top .adx-icon { width: 13px; height: 13px; }
.runtime-metric > strong { display: block; margin-top: 13px; color: var(--adx-text-strong); font-size: 20px; letter-spacing: -.3px; }
.runtime-metric > small { display: block; margin-top: 7px; overflow: hidden; color: var(--adx-text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.runtime-skeleton-title { width: 68px; height: 8px; }
.runtime-skeleton-value { width: 92px; height: 20px; margin-top: 18px; }
.runtime-skeleton-hint { width: 76px; height: 7px; margin-top: 10px; }
.runtime-main-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(360px, .72fr); gap: 12px; margin-top: 12px; }
.runtime-chart-skeleton { height: 315px; padding: 26px; }
.runtime-chart-skeleton > div { height: 100%; }
.runtime-incident-panel { min-width: 0; }
.runtime-incidents { display: grid; max-height: 360px; overflow-y: auto; }
.runtime-incidents > div { display: grid; grid-template-columns: 4px minmax(0, 1fr) auto; gap: 11px; padding: 12px 14px 12px 0; border-top: 1px solid var(--adx-divider); }
.runtime-incidents > div:first-child { border-top: 0; }
.runtime-incidents > div > i { height: 100%; border-radius: 0 4px 4px 0; background: var(--adx-warning); }
.runtime-incidents > div.critical > i { background: var(--adx-danger); }
.runtime-incidents > div.info > i { background: var(--adx-info); }
.runtime-incidents p { margin: 0; }
.runtime-incidents strong { display: block; font-size: 9px; }
.runtime-incidents small { display: block; margin-top: 5px; color: var(--adx-text-muted); font-size: 8px; line-height: 1.5; }
.runtime-incidents time { color: var(--adx-text-muted); font-size: 8px; white-space: nowrap; }
.runtime-incident-loading { display: grid; gap: 10px; padding: 15px; }
.runtime-incident-loading .adx-skeleton { height: 52px; }
.runtime-all-clear { display: grid; place-items: center; min-height: 210px; padding: 20px; color: var(--adx-text-muted); text-align: center; }
.runtime-all-clear .adx-icon { width: 30px; height: 30px; color: var(--adx-success); }
.runtime-all-clear strong { margin-top: 13px; color: var(--adx-text-strong); font-size: 11px; }
.runtime-all-clear span { margin-top: 6px; font-size: 9px; }
.runtime-bottom-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(420px, .75fr); gap: 12px; margin-top: 12px; }
.runtime-engine-table strong { color: var(--adx-text-strong); }
.runtime-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.runtime-snapshot-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; padding: 2px 14px 8px; }
.runtime-snapshot-list > div { padding: 10px 0; border-bottom: 1px solid var(--adx-divider); }
.runtime-snapshot-list span { color: var(--adx-text-muted); font-size: 8px; }
.runtime-snapshot-list strong { float: right; color: var(--adx-text-strong); font-size: 9px; }
.runtime-snapshot-list small { display: block; margin-top: 5px; color: var(--adx-text-muted); font-size: 8px; }
.runtime-kafka { padding: 5px 14px 13px; }
.runtime-kafka h3 { display: flex; align-items: center; gap: 7px; margin: 0 0 8px; font-size: 10px; }
.runtime-kafka h3 .adx-icon { width: 14px; height: 14px; color: var(--adx-success); }
.runtime-kafka > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 0; }
.runtime-kafka span { color: var(--adx-text-muted); font-size: 8px; }
.runtime-kafka strong { font-family: "Cascadia Code", Consolas, monospace; font-size: 9px; }
.runtime-kafka strong.warning { color: var(--adx-warning); }
.runtime-kafka i { grid-column: 1 / -1; height: 4px; overflow: hidden; border-radius: 99px; background: var(--adx-divider); }
.runtime-kafka i b { display: block; height: 100%; border-radius: inherit; background: var(--adx-brand-500); }
.runtime-kafka i b.warning { background: var(--adx-warning); }
.runtime-footer { display: flex; align-items: center; gap: 14px; margin-top: 12px; padding: 9px 12px; border-radius: 12px; color: var(--adx-text-muted); background: var(--adx-surface); box-shadow: var(--adx-shadow-card); font-size: 8px; }
.runtime-footer span:first-child { display: inline-flex; align-items: center; gap: 7px; }
.runtime-footer label { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; }
.runtime-footer input { accent-color: var(--adx-brand-500); }
.runtime-footer select { height: 26px; padding: 0 7px; border: 0; border-radius: 8px; color: var(--adx-text-body); background: var(--adx-surface-muted); font-size: 8px; }
.spinning { animation: runtime-spin .9s linear infinite; }
@keyframes runtime-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) {
  .runtime-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .runtime-main-grid { grid-template-columns: minmax(0, 1.35fr) minmax(340px, .75fr); }
  .runtime-bottom-grid { grid-template-columns: minmax(0, 1.2fr) minmax(380px, .8fr); }
}
</style>
