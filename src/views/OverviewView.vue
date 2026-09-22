<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import {
  Activity,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Download,
  GitBranch,
  PieChart,
  RefreshCw,
  TriangleAlert,
} from 'lucide-vue-next'
import EChart from '@/components/EChart.vue'
import { getOverview } from '@/services/overview'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useToastStore } from '@/stores/toast'
import type { OverviewData } from '@/types/api'

const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToastStore()
const loading = ref(true)
const error = ref('')
const data = ref<OverviewData | null>(null)

const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 })

const kpis = computed(() => {
  const summary = data.value?.summary
  return [
    { label: '预估收益', value: summary ? currency.format(summary.estimatedRevenue) : '—', delta: '+6.8%', hint: '较昨日', icon: CircleDollarSign, tone: 'green' },
    { label: '原始请求', value: summary ? compact.format(summary.origRequests) : '—', delta: '+4.2%', hint: '较昨日', icon: Activity, tone: 'blue' },
    { label: '有效填充率', value: summary ? `${summary.fillRequestRate.toFixed(1)}%` : '—', delta: '-1.3%', hint: '低于目标 85%', icon: PieChart, tone: 'purple', bad: true },
    { label: '实际 eCPM', value: summary ? `¥ ${summary.cpm.toFixed(2)}` : '—', delta: '+2.1%', hint: '较昨日', icon: BadgeDollarSign, tone: 'amber' },
  ]
})

const trendOption = computed<EChartsOption>(() => {
  const trend = data.value?.trend || []
  const dark = theme.effective === 'dark'
  return {
    animationDuration: 650,
    grid: { left: 48, right: 48, top: 24, bottom: 32 },
    tooltip: { trigger: 'axis', backgroundColor: dark ? '#0d1a26' : '#14293d', borderWidth: 0, textStyle: { color: '#fff', fontSize: 10 } },
    xAxis: { type: 'category', boundaryGap: false, data: trend.map((item) => item.date), axisLine: { lineStyle: { color: dark ? '#294154' : '#dce4e9' } }, axisTick: { show: false }, axisLabel: { color: dark ? '#7e93a3' : '#8a96a0', fontSize: 9 } },
    yAxis: [
      { type: 'value', axisLabel: { color: dark ? '#7e93a3' : '#8a96a0', fontSize: 9, formatter: (value: number) => `${Math.round(value / 1000)}k` }, splitLine: { lineStyle: { color: dark ? '#1c3041' : '#edf1f4' } } },
      { type: 'value', min: 70, max: 92, axisLabel: { color: dark ? '#7e93a3' : '#8a96a0', fontSize: 9, formatter: '{value}%' }, splitLine: { show: false } },
    ],
    series: [
      { name: '收益', type: 'line', smooth: true, symbolSize: 6, data: trend.map((item) => item.revenue), lineStyle: { width: 3, color: '#12b886' }, itemStyle: { color: '#12b886' }, areaStyle: { color: 'rgba(18,184,134,.12)' } },
      { name: '填充率', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', data: trend.map((item) => item.fillRate), lineStyle: { width: 2, color: '#6b9bff' } },
    ],
  }
})

const healthOption = computed<EChartsOption>(() => {
  const dark = theme.effective === 'dark'
  return {
    series: [{ type: 'pie', radius: ['72%', '88%'], silent: true, label: { show: true, position: 'center', formatter: '92\n健康分', color: dark ? '#dce7ef' : '#203443', fontSize: 16, fontWeight: 700, lineHeight: 20 }, data: [{ value: 92, itemStyle: { color: '#12b886' } }, { value: 8, itemStyle: { color: dark ? '#203447' : '#e9eef2' } }] }],
  }
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await getOverview(auth.accessToken)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '总览数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="overview-page">
    <header class="adx-page-header">
      <div><p class="adx-page-kicker">经营中心 · 数据概览</p><h1 class="adx-page-title">投放总览</h1><p class="adx-page-description">经营数据每 60 秒刷新 · 统计日期 2026-09-22 · <span class="overview-live"><i />数据链路正常</span></p></div>
      <div class="adx-page-actions"><button class="adx-button adx-button--secondary" type="button" @click="toast.show('时间范围选择器待接入')"><CalendarDays class="adx-icon" />09-16 至 09-22</button><button class="adx-button adx-button--secondary" type="button" @click="load"><RefreshCw class="adx-icon" :class="{ spinning: loading }" />刷新</button><button class="adx-button adx-button--primary" type="button" @click="toast.show('导出任务已创建')"><Download class="adx-icon" />导出报表</button></div>
    </header>

    <div v-if="error" class="overview-error"><CircleAlert class="adx-icon" /><span>{{ error }}</span><button type="button" @click="load">重新加载</button></div>

    <section class="overview-kpis">
      <article v-for="item in kpis" :key="item.label" class="overview-kpi">
        <template v-if="loading"><div class="adx-skeleton kpi-skeleton-title" /><div class="adx-skeleton kpi-skeleton-value" /><div class="adx-skeleton kpi-skeleton-foot" /></template>
        <template v-else><div class="overview-kpi__top">{{ item.label }}<span class="overview-kpi__icon" :class="item.tone"><component :is="item.icon" class="adx-icon" /></span></div><div class="overview-kpi__value">{{ item.value }}</div><div class="overview-kpi__foot"><b :class="{ bad: item.bad }">{{ item.delta }}</b>{{ item.hint }}</div></template>
      </article>
    </section>

    <section class="overview-main-grid">
      <article class="adx-panel overview-trend-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">收益与填充趋势</h2><p class="adx-panel__meta">2026-09-16 至 2026-09-22</p></div><div class="overview-legend"><span><i class="green" />收益</span><span><i class="blue" />填充率</span></div></div>
        <EChart v-if="!loading && data" :option="trendOption" :height="290" />
        <div v-else class="overview-chart-skeleton"><div class="adx-skeleton" /></div>
      </article>

      <aside class="adx-panel overview-risk-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">投放风险</h2><p class="adx-panel__meta">跨链路异常汇总</p></div><span class="adx-status adx-status--warning">2 项处理中</span></div>
        <div class="overview-risk-body"><EChart :option="healthOption" :height="132" class="overview-health-chart" /><div class="overview-risk-list"><div><span>DSP 接口</span><strong>18 / 20</strong><i><b style="width:90%" /></i></div><div><span>广告位错误</span><strong>14 个</strong><i><b class="warning" style="width:58%" /></i></div><div><span>配置一致</span><strong>11 / 12</strong><i><b style="width:92%" /></i></div></div></div>
        <div class="overview-task-list"><div><span class="overview-task-icon danger"><TriangleAlert class="adx-icon" /></span><p><strong>Cloud DSP 错误率升高</strong><small>近 30 分钟 4.8%，已影响 14 个广告位。</small></p><time>4 分钟前</time></div><div><span class="overview-task-icon warning"><GitBranch class="adx-icon" /></span><p><strong>engine-07 策略同步延迟</strong><small>当前落后版本 12 秒，正在自动重试。</small></p><time>9 分钟前</time></div><div><span class="overview-task-icon success"><CheckCircle2 class="adx-icon" /></span><p><strong>DSP 日账单校验完成</strong><small>差异金额 ¥326.40，已进入对账队列。</small></p><time>今天 09:18</time></div></div>
      </aside>
    </section>

    <section class="overview-bottom-grid">
      <article class="adx-panel overview-top-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">广告位表现</h2><p class="adx-panel__meta">按今日收益排序</p></div><button class="adx-button adx-button--secondary" type="button" @click="toast.show('进入广告位管理')">全部广告位</button></div>
        <div class="adx-table-wrap"><table class="adx-table overview-table"><thead><tr><th>广告位</th><th>媒体</th><th>请求</th><th>填充率</th><th>收益</th><th>状态</th></tr></thead><tbody><tr v-for="(item, index) in data?.top || []" :key="item.key"><td><strong>{{ item.key }}</strong><small>ad_slot_{{ String(index + 1).padStart(2, '0') }}</small></td><td>{{ ['乐商店 Android', '天气通', '联想浏览器', '乐日历', '文件管理'][index] || '媒体应用' }}</td><td>{{ ['4.82M', '3.96M', '2.11M', '1.48M', '986K'][index] || '—' }}</td><td>{{ [86.4, 88.1, 81.7, 76.9, 82.6][index] || 0 }}%</td><td>{{ currency.format(item.revenue) }}</td><td><span class="adx-status" :class="index === 0 || index === 3 ? 'adx-status--warning' : 'adx-status--success'">{{ index === 0 || index === 3 ? '观察' : '投放中' }}</span></td></tr></tbody></table></div>
      </article>

      <article class="adx-panel">
        <div class="adx-panel__head"><div><h2 class="adx-panel__title">策略同步</h2><p class="adx-panel__meta">最近发布与生效状态</p></div><button class="adx-button adx-button--secondary" type="button" @click="toast.show('打开策略发布流程')">发布策略</button></div>
        <div class="overview-sync-list"><div><strong>高价值用户分组</strong><span class="adx-status adx-status--success">已发布</span><p>v248 · 绑定 18 个广告位 · 14:32</p></div><div><strong>低延时竞价方案</strong><span class="adx-status adx-status--success">已发布</span><p>v247 · 全局超时 350ms · 13:08</p></div><div><strong>新客冷启动分组</strong><span class="adx-status adx-status--warning">待发布</span><p>v248 · 等待二次确认 · 草稿</p></div><div><strong>视频激励兜底</strong><span class="adx-status adx-status--warning">同步中</span><p>engine-07 正在重新拉取配置</p></div></div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.overview-page { min-width: 0; }
.overview-live { display: inline-flex; align-items: center; gap: 7px; margin-left: 8px; color: var(--adx-success); font-weight: 650; }
.overview-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--adx-brand-500); box-shadow: 0 0 0 4px var(--adx-brand-soft); }
.overview-error { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; color: var(--adx-danger); background: var(--adx-danger-soft); font-size: 10px; }
.overview-error .adx-icon { width: 15px; height: 15px; }
.overview-error button { margin-left: auto; border: 0; color: inherit; background: transparent; font-size: 9px; font-weight: 650; }
.overview-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 11px; }
.overview-kpi { min-height: 118px; padding: 15px 16px; border-radius: 16px; background: var(--adx-surface); box-shadow: var(--adx-shadow-card); }
.overview-kpi__top { display: flex; align-items: center; justify-content: space-between; color: var(--adx-text-muted); font-size: 10px; }
.overview-kpi__icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; color: var(--adx-success); background: var(--adx-brand-soft); }
.overview-kpi__icon.blue { color: var(--adx-info); background: var(--adx-info-soft); }
.overview-kpi__icon.purple { color: #8064dc; background: #f0ecff; }
.overview-kpi__icon.amber { color: var(--adx-warning); background: var(--adx-warning-soft); }
.overview-kpi__icon .adx-icon { width: 14px; height: 14px; }
.overview-kpi__value { margin-top: 13px; font-size: 25px; font-weight: 680; letter-spacing: -.4px; }
.overview-kpi__foot { display: flex; align-items: center; gap: 6px; margin-top: 8px; color: var(--adx-text-muted); font-size: 9px; }
.overview-kpi__foot b { color: var(--adx-success); font-weight: 700; }
.overview-kpi__foot b.bad { color: var(--adx-danger); }
.kpi-skeleton-title { width: 76px; height: 9px; }
.kpi-skeleton-value { width: 120px; height: 25px; margin-top: 20px; }
.kpi-skeleton-foot { width: 88px; height: 8px; margin-top: 12px; }
.overview-main-grid { display: grid; grid-template-columns: minmax(0, 1.58fr) minmax(350px, .72fr); gap: 12px; margin-top: 12px; }
.overview-legend { display: flex; gap: 12px; color: var(--adx-text-muted); font-size: 9px; }
.overview-legend span { display: inline-flex; align-items: center; gap: 5px; }
.overview-legend i { width: 7px; height: 7px; border-radius: 3px; background: #12b886; }
.overview-legend i.blue { background: #6b9bff; }
.overview-chart-skeleton { height: 290px; padding: 20px; }
.overview-chart-skeleton > div { height: 100%; }
.overview-risk-panel { min-width: 0; }
.overview-risk-body { display: grid; grid-template-columns: 132px minmax(0, 1fr); align-items: center; min-height: 138px; padding: 4px 15px 6px; }
.overview-health-chart { width: 118px; }
.overview-risk-list { display: grid; gap: 11px; }
.overview-risk-list > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.overview-risk-list span { color: var(--adx-text-muted); font-size: 9px; }
.overview-risk-list strong { color: var(--adx-text-strong); font-size: 10px; }
.overview-risk-list i { grid-column: 1 / -1; height: 4px; overflow: hidden; border-radius: 99px; background: var(--adx-divider); }
.overview-risk-list i b { display: block; height: 100%; border-radius: inherit; background: var(--adx-brand-500); }
.overview-risk-list i b.warning { background: #f0a13f; }
.overview-task-list { display: grid; }
.overview-task-list > div { display: grid; grid-template-columns: 29px minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 10px 15px; border-top: 1px solid var(--adx-divider); }
.overview-task-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; color: var(--adx-warning); background: var(--adx-warning-soft); }
.overview-task-icon.danger { color: var(--adx-danger); background: var(--adx-danger-soft); }
.overview-task-icon.success { color: var(--adx-success); background: var(--adx-success-soft); }
.overview-task-icon .adx-icon { width: 14px; height: 14px; }
.overview-task-list p { margin: 0; }
.overview-task-list strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.overview-task-list small { display: block; margin-top: 4px; color: var(--adx-text-muted); font-size: 8px; line-height: 1.45; }
.overview-task-list time { color: var(--adx-text-muted); font-size: 8px; white-space: nowrap; }
.overview-bottom-grid { display: grid; grid-template-columns: minmax(0, 1.42fr) minmax(360px, .72fr); gap: 12px; margin-top: 12px; }
.overview-table td strong { display: block; color: var(--adx-text-strong); font-size: 9px; }
.overview-table td small { display: block; margin-top: 3px; color: var(--adx-text-muted); font-size: 8px; }
.overview-sync-list { display: grid; padding: 2px 0; }
.overview-sync-list > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 11px 15px; border-top: 1px solid var(--adx-divider); }
.overview-sync-list > div:first-child { border-top: 0; }
.overview-sync-list strong { font-size: 9px; }
.overview-sync-list p { grid-column: 1 / -1; margin: 3px 0 0; color: var(--adx-text-muted); font-size: 8px; }
.spinning { animation: overview-spin .9s linear infinite; }
@keyframes overview-spin { to { transform: rotate(360deg); } }
@media (max-width: 1260px) { .overview-main-grid { grid-template-columns: minmax(0, 1.35fr) minmax(330px, .75fr); } .overview-bottom-grid { grid-template-columns: minmax(0, 1.25fr) minmax(340px, .75fr); } }
</style>
