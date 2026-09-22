import type { CoreTrendItem, OverviewData, ReportSummary, TopItem } from '@/types/api'
import { request } from './http'

const mockSummary: ReportSummary = {
  origRequests: 28642000,
  origAds: 23987600,
  impressions: 14982000,
  clicks: 386420,
  errors: 1284,
  estimatedRevenue: 486320,
  actualRevenue: 458200,
  fillRequestRate: 83.7,
  ctr: 2.58,
  cpm: 18.42,
}

const mockTrend: CoreTrendItem[] = [
  { date: '09-16', fillRate: 79.6, ecpm: 17.2, ctr: 2.28, revenue: 402800 },
  { date: '09-17', fillRate: 81.2, ecpm: 17.8, ctr: 2.35, revenue: 418640 },
  { date: '09-18', fillRate: 80.1, ecpm: 17.4, ctr: 2.31, revenue: 397200 },
  { date: '09-19', fillRate: 82.8, ecpm: 18.1, ctr: 2.42, revenue: 441500 },
  { date: '09-20', fillRate: 84.5, ecpm: 18.6, ctr: 2.51, revenue: 456900 },
  { date: '09-21', fillRate: 85.0, ecpm: 18.8, ctr: 2.55, revenue: 455120 },
  { date: '09-22', fillRate: 83.7, ecpm: 18.42, ctr: 2.58, revenue: 486320 },
]

const mockTop: TopItem[] = [
  { key: '乐商店-首页横幅', revenue: 92614 },
  { key: '天气通-详情信息流', revenue: 78329 },
  { key: '浏览器-开屏', revenue: 65018 },
  { key: '乐日历-激励视频', revenue: 48760 },
  { key: '文件管理-任务完成页', revenue: 31984 },
]

export async function getOverview(token: string): Promise<OverviewData> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 520))
    return { summary: mockSummary, trend: mockTrend, top: mockTop }
  }

  const [summary, trend, top] = await Promise.all([
    request<ReportSummary>('/business/report/summary', {}, token),
    request<CoreTrendItem[]>('/business/report/trend/core', {}, token),
    request<TopItem[]>('/business/report/trend/top?dimension=ad_slot&limit=5', {}, token),
  ])
  return { summary, trend, top }
}
