import { request } from './http'

export type AnalyticsMode = 'revenue' | 'report-trends' | 'report-special' | 'dsp-settlement' | 'media-settlement' | 'event-logs'

export interface AnalyticsMetric {
  label: string
  value: number
  format: 'currency' | 'number' | 'percent'
  hint: string
}

export interface AnalyticsTrendRow {
  date: string
  primary: number
  secondary: number
  rate: number
}

export interface AnalyticsCategory {
  name: string
  value: number
  share?: number
}

export interface AnalyticsTableRow {
  id: number
  [key: string]: string | number
}

export interface AnalyticsPayload {
  title: string
  kicker: string
  description: string
  unitLabel: string
  metrics: AnalyticsMetric[]
  trend: AnalyticsTrendRow[]
  categories: AnalyticsCategory[]
  rows: AnalyticsTableRow[]
  specialTabs?: string[]
}

const dateAxis = ['09-16', '09-17', '09-18', '09-19', '09-20', '09-21', '09-22']

function mockRevenue(): AnalyticsPayload {
  return {
    title: '收益分析',
    kicker: '经营中心 · 收益洞察',
    description: '分析预估收益、实际结算、eCPM、填充率和 DSP 收益构成。',
    unitLabel: '收益',
    metrics: [
      { label: '预估收益', value: 3_072_000, format: 'currency', hint: '较上周期 +8.4%' },
      { label: '实际结算', value: 2_913_400, format: 'currency', hint: '差异 ¥158,600' },
      { label: '平均 eCPM', value: 17.96, format: 'currency', hint: '较上周期 +2.7%' },
      { label: '有效填充率', value: 84.3, format: 'percent', hint: '目标 85%' },
    ],
    trend: dateAxis.map((date, index) => ({ date, primary: 402800 + index * 13920, secondary: 376200 + index * 13667, rate: 79.6 + index * .72 })),
    categories: [
      { name: '向新 DSP', value: 1_130_000, share: 36.8 },
      { name: '聚点 DSP', value: 841_000, share: 27.4 },
      { name: '云图 DSP', value: 651_000, share: 21.2 },
      { name: '其他渠道', value: 450_000, share: 14.6 },
    ],
    rows: [
      { id: 1, media: '乐商店 Android', requests: 8_420_000, fillRate: 86.4, ecpm: 19.84, revenue: 1_062_480, health: '优' },
      { id: 2, media: '天气通', requests: 6_180_000, fillRate: 88.1, ecpm: 21.36, revenue: 861_740, health: '优' },
      { id: 3, media: '联想浏览器', requests: 4_760_000, fillRate: 81.7, ecpm: 17.52, revenue: 618_930, health: '关注' },
      { id: 4, media: '乐日历', requests: 3_210_000, fillRate: 76.9, ecpm: 15.88, revenue: 382_140, health: '关注' },
    ],
  }
}

function mockTrends(): AnalyticsPayload {
  const base = mockRevenue()
  return {
    ...base,
    title: '核心趋势',
    kicker: '数据报表 · 趋势分析',
    description: '按日期查看收益、填充率、eCPM、CTR 与请求量变化。',
    metrics: [
      { label: '请求量', value: 28_640_000, format: 'number', hint: '较上周期 +4.2%' },
      { label: '曝光量', value: 14_982_000, format: 'number', hint: '较上周期 +3.8%' },
      { label: '点击量', value: 386_420, format: 'number', hint: '较上周期 +6.1%' },
      { label: 'CTR', value: 2.58, format: 'percent', hint: '较上周期 +0.12pp' },
    ],
  }
}

function mockSpecial(): AnalyticsPayload {
  return {
    title: '专项报表',
    kicker: '数据报表 · 专项分析',
    description: '提供 DSP 结算、媒体结算、对账差异和转化漏斗专项视图。',
    unitLabel: '金额',
    metrics: [
      { label: 'DSP 结算', value: 2_420_600, format: 'currency', hint: '已导入 DSP 账单' },
      { label: '媒体结算', value: 1_960_400, format: 'currency', hint: '媒体侧成本汇总' },
      { label: '对账差异', value: 86_320, format: 'currency', hint: '差异率 1.8%' },
      { label: '转化率', value: 18.6, format: 'percent', hint: '请求到安装' },
    ],
    trend: dateAxis.map((date, index) => ({ date, primary: 320000 + index * 21400, secondary: 301000 + index * 19800, rate: 2.1 - index * .08 })),
    categories: [
      { name: '点击', value: 386420, share: 42 },
      { name: '下载开始', value: 265800, share: 29 },
      { name: '下载完成', value: 188400, share: 20 },
      { name: '安装', value: 82100, share: 9 },
    ],
    rows: [
      { id: 1, type: 'DSP 结算', dimension: '向新 DSP', amount: 928600, count: 4_820_000, gapRate: 1.2, status: '正常' },
      { id: 2, type: 'DSP 结算', dimension: '聚点 DSP', amount: 741200, count: 3_960_000, gapRate: 2.6, status: '关注' },
      { id: 3, type: '媒体结算', dimension: '乐商店 Android', amount: 862400, count: 6_180_000, gapRate: 0.8, status: '正常' },
      { id: 4, type: '转化漏斗', dimension: '安装完成', amount: 82100, count: 441200, gapRate: 0, status: '正常' },
    ],
    specialTabs: ['DSP 结算', '媒体结算', '对账差异', '转化漏斗'],
  }
}

function mockDspSettlement(): AnalyticsPayload {
  const data = mockSpecial()
  return {
    ...data,
    title: 'DSP 结算',
    kicker: '财务结算 · DSP 收入',
    description: '查看 DSP 维度结算收入、差异、曝光和点击趋势。',
    metrics: [
      { label: 'ADX 消耗', value: 2_420_600, format: 'currency', hint: '胜出 eCPM 汇总' },
      { label: '账单消耗', value: 2_374_800, format: 'currency', hint: 'DSP 账单口径' },
      { label: '结算差异', value: 45_800, format: 'currency', hint: '差异率 1.93%' },
      { label: '差异明细', value: 6, format: 'number', hint: '超过 2% 阈值' },
    ],
    rows: [
      { id: 1, date: '2026-09-22', dsp: '向新 DSP', adxCost: 428600, billCost: 421200, gap: 7400, gapRate: 1.76, status: '正常' },
      { id: 2, date: '2026-09-21', dsp: '聚点 DSP', adxCost: 396800, billCost: 384300, gap: 12500, gapRate: 3.25, status: '超阈值' },
      { id: 3, date: '2026-09-20', dsp: '云图 DSP', adxCost: 362100, billCost: 357000, gap: 5100, gapRate: 1.43, status: '正常' },
      { id: 4, date: '2026-09-19', dsp: '星云 DSP', adxCost: 318900, billCost: 316400, gap: 2500, gapRate: 0.79, status: '正常' },
    ],
  }
}

function mockMediaSettlement(): AnalyticsPayload {
  const data = mockSpecial()
  return {
    ...data,
    title: '媒体结算',
    kicker: '财务结算 · 媒体成本',
    description: '查看媒体和广告位维度的展示、点击与收入结算。',
    metrics: [
      { label: '媒体收入', value: 1_960_400, format: 'currency', hint: 'SDK 捕获口径' },
      { label: '曝光量', value: 8_642_000, format: 'number', hint: '媒体侧汇总' },
      { label: '点击量', value: 218_600, format: 'number', hint: '媒体侧汇总' },
      { label: '平均 eCPM', value: 18.42, format: 'currency', hint: '收入 / 曝光 × 1000' },
    ],
    rows: [
      { id: 1, date: '2026-09-22', adSlotId: 'banner_home_01', impressions: 1_248_000, clicks: 32_640, revenue: 368_420 },
      { id: 2, date: '2026-09-22', adSlotId: 'feed_detail_02', impressions: 986_000, clicks: 25_180, revenue: 294_120 },
      { id: 3, date: '2026-09-21', adSlotId: 'splash_android_cn', impressions: 642_000, clicks: 15_240, revenue: 218_640 },
      { id: 4, date: '2026-09-21', adSlotId: 'reward_calendar', impressions: 482_000, clicks: 11_860, revenue: 154_380 },
    ],
  }
}

function mockEventLogs(): AnalyticsPayload {
  return {
    title: '事件上报日志',
    kicker: '数据报表 · 链路可靠性',
    description: '分析 track 链路的成功、去重、失败与重试记录。',
    unitLabel: '事件数',
    metrics: [
      { label: '事件总量', value: 1_286_420, format: 'number', hint: '最近 24 小时' },
      { label: '成功上报', value: 1_279_860, format: 'number', hint: '成功率 99.49%' },
      { label: '重复事件', value: 5_124, format: 'number', hint: '去重处理' },
      { label: '失败事件', value: 1_436, format: 'number', hint: '失败率 0.11%' },
    ],
    trend: dateAxis.map((date, index) => ({ date, primary: 168000 + index * 9400, secondary: 168000 + index * 9400 - 1200, rate: .11 - index * .003 })),
    categories: [
      { name: 'impression', value: 486200, share: 37.8 },
      { name: 'click', value: 286400, share: 22.3 },
      { name: 'request', value: 268900, share: 20.9 },
      { name: 'video', value: 244920, share: 19.0 },
    ],
    rows: [
      { id: 1, occurredAt: '2026-09-22 16:31:18', requestId: 'req_8f2a91', eventType: 'impression', adSlotId: 'banner_home_01', dsp: '向新 DSP', status: 'SUCCESS', retryCount: 0, errorMessage: '' },
      { id: 2, occurredAt: '2026-09-22 16:31:17', requestId: 'req_8f2a90', eventType: 'click', adSlotId: 'feed_detail_02', dsp: '聚点 DSP', status: 'DEDUPLICATED', retryCount: 0, errorMessage: '重复事件已忽略' },
      { id: 3, occurredAt: '2026-09-22 16:31:16', requestId: 'req_8f2a8f', eventType: 'video_finish', adSlotId: 'reward_calendar', dsp: '星云 DSP', status: 'FAILED', retryCount: 2, errorMessage: 'Downstream timeout' },
      { id: 4, occurredAt: '2026-09-22 16:31:15', requestId: 'req_8f2a8e', eventType: 'request', adSlotId: 'splash_android_cn', dsp: '云图 DSP', status: 'SUCCESS', retryCount: 1, errorMessage: '' },
    ],
  }
}

export async function getAnalyticsPayload(token: string, mode: AnalyticsMode, startDate: string, endDate: string): Promise<AnalyticsPayload> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 420))
    if (mode === 'revenue') return mockRevenue()
    if (mode === 'report-trends') return mockTrends()
    if (mode === 'report-special') return mockSpecial()
    if (mode === 'dsp-settlement') return mockDspSettlement()
    if (mode === 'media-settlement') return mockMediaSettlement()
    return mockEventLogs()
  }

  if (mode === 'event-logs') {
    const payload = await request<{ content: AnalyticsTableRow[] }>(`/business/track-report/logs?startDate=${startDate}&endDate=${endDate}`, {}, token)
    const data = mockEventLogs()
    return { ...data, rows: payload.content }
  }

  const path = mode === 'revenue'
    ? `/business/report/trend/core?startDate=${startDate}&endDate=${endDate}`
    : mode === 'report-trends'
      ? `/business/report/trend?startDate=${startDate}&endDate=${endDate}`
      : mode === 'dsp-settlement'
        ? `/business/report/special/dsp-settlement?startDate=${startDate}&endDate=${endDate}`
        : mode === 'media-settlement'
          ? `/business/report/special/media-settlement?startDate=${startDate}&endDate=${endDate}`
          : `/business/report/special/conversion-funnel?startDate=${startDate}&endDate=${endDate}`
  const payload = await request<unknown>(path, {}, token)
  const data = mode === 'revenue' ? mockRevenue() : mode === 'report-trends' ? mockTrends() : mode === 'report-special' ? mockSpecial() : mode === 'dsp-settlement' ? mockDspSettlement() : mockMediaSettlement()
  const rows = Array.isArray(payload) ? payload as AnalyticsTableRow[] : (payload && typeof payload === 'object' && Array.isArray((payload as { content?: unknown }).content)) ? (payload as { content: AnalyticsTableRow[] }).content : data.rows
  return { ...data, rows }
}
