import type {
  DspReconciliationRow,
  MediaReconciliationRow,
  ReconciliationAttribution,
  ReconciliationGapReport,
} from '@/types/api'
import { request } from './http'

export type ReconciliationSource = 'dsp' | 'media'

export interface ReconciliationQuery {
  startDate: string
  endDate: string
  source: ReconciliationSource
  adSlotId?: string
  dsp?: string
}

export interface ReconciliationSummary {
  adxValue: number
  referenceValue: number
  gap: number
  gapRate: number
  mismatchRows: number
  missingRows: number
  matchRate: number
  totalRows: number
}

const dspNames = ['向新 DSP', '聚点 DSP', '云图 DSP', '星云 DSP']
const adSlots = ['banner_home_01', 'feed_detail_02', 'splash_android_cn', 'reward_calendar', 'task_complete_01']

function createDspRows(): DspReconciliationRow[] {
  const rows: DspReconciliationRow[] = []
  for (let day = 0; day < 7; day += 1) {
    for (let index = 0; index < 4; index += 1) {
      const date = `2026-09-${String(16 + day).padStart(2, '0')}`
      const adxCost = Number((38_000 + day * 1_840 + index * 7_600 + Math.sin(day + index) * 1_200).toFixed(2))
      const missing = day === 2 && index === 3
      const factor = 1 + (index === 1 ? 0.026 : index === 3 ? -0.018 : 0.006) + day * 0.0005
      const dspCost = missing ? 0 : Number((adxCost / factor).toFixed(2))
      const adxImpressions = Math.round(adxCost / (16.8 + index * 0.72) * 1000)
      const dspImpressions = missing ? 0 : Math.round(adxImpressions / (1 + (index === 2 ? 0.012 : 0.004)))
      const adxClicks = Math.round(adxImpressions * (0.022 + index * 0.0012))
      const dspClicks = missing ? 0 : Math.round(dspImpressions * (0.0215 + index * 0.001))
      rows.push({
        date,
        adSlotId: adSlots[(index + day) % adSlots.length] || 'banner_home_01',
        dsp: dspNames[index] || '向新 DSP',
        adxImpressions,
        adxClicks,
        adxCost,
        dspImpressions,
        dspClicks,
        dspCost,
        status: missing ? 'REFERENCE_MISSING' : 'OK',
        impressionsGap: missing ? 0 : adxImpressions - dspImpressions,
        clicksGap: missing ? 0 : adxClicks - dspClicks,
        costGap: missing ? 0 : Number((adxCost - dspCost).toFixed(2)),
        impressionsGapRate: missing ? 0 : (adxImpressions - dspImpressions) / dspImpressions,
        clicksGapRate: missing ? 0 : (adxClicks - dspClicks) / dspClicks,
        costGapRate: missing ? 0 : (adxCost - dspCost) / dspCost,
      })
    }
  }
  return rows
}

function createMediaRows(): MediaReconciliationRow[] {
  const rows: MediaReconciliationRow[] = []
  for (let day = 0; day < 7; day += 1) {
    for (let index = 0; index < 5; index += 1) {
      const date = `2026-09-${String(16 + day).padStart(2, '0')}`
      const adxRequests = Math.round(3_800_000 + day * 92_000 + index * 410_000 + Math.cos(day + index) * 96_000)
      const missing = day === 5 && index === 4
      const factor = 1 + (index === 0 ? 0.031 : index === 3 ? -0.017 : 0.004)
      const mediaRequests = missing ? 0 : Math.round(adxRequests / factor)
      const adxFills = Math.round(adxRequests * (0.82 + index * 0.006))
      const mediaFills = missing ? 0 : Math.round(mediaRequests * (0.815 + index * 0.005))
      const adxImpressions = Math.round(adxFills * 0.874)
      const mediaImpressions = missing ? 0 : Math.round(mediaFills * 0.869)
      const adxClicks = Math.round(adxImpressions * 0.0258)
      const mediaClicks = missing ? 0 : Math.round(mediaImpressions * 0.0252)
      rows.push({
        date,
        adSlotId: adSlots[(index + day) % adSlots.length] || 'banner_home_01',
        adxRequests,
        adxFills,
        adxImpressions,
        adxClicks,
        mediaRequests,
        mediaFills,
        mediaImpressions,
        mediaClicks,
        status: missing ? 'REFERENCE_MISSING' : 'OK',
        requestsGap: missing ? 0 : adxRequests - mediaRequests,
        fillsGap: missing ? 0 : adxFills - mediaFills,
        impressionsGap: missing ? 0 : adxImpressions - mediaImpressions,
        clicksGap: missing ? 0 : adxClicks - mediaClicks,
        requestsGapRate: missing ? 0 : (adxRequests - mediaRequests) / mediaRequests,
        fillsGapRate: missing ? 0 : (adxFills - mediaFills) / mediaFills,
        impressionsGapRate: missing ? 0 : (adxImpressions - mediaImpressions) / mediaImpressions,
        clicksGapRate: missing ? 0 : (adxClicks - mediaClicks) / mediaClicks,
      })
    }
  }
  return rows
}

function createAttributions(): ReconciliationAttribution[] {
  return [
    { id: 1, sourceType: 'DSP', statDate: '2026-09-21', dsp: '聚点 DSP', adSlotId: 'feed_detail_02', metric: 'cost', category: '结算单价差异', adxValue: 18.42, refValue: 17.95, gap: 0.47, suggestion: '核对 DSP 结算单价与返点规则，确认是否按账单周期调整。', computedAt: '2026-09-22T08:30:00+08:00' },
    { id: 2, sourceType: 'DSP', statDate: '2026-09-18', dsp: '星云 DSP', adSlotId: 'reward_calendar', metric: 'impressions', category: '统计时区差异', adxValue: 482640, refValue: 468210, gap: 14430, suggestion: '确认 DSP 账单使用 UTC 还是本地时区，检查跨日切割数据。', computedAt: '2026-09-22T08:30:00+08:00' },
    { id: 3, sourceType: 'MEDIA', statDate: '2026-09-20', adSlotId: 'banner_home_01', metric: 'requests', category: 'SDK 采样差异', adxValue: 4820000, refValue: 4672000, gap: 148000, suggestion: '检查媒体侧请求采样比例与 SDK 初始化窗口。', computedAt: '2026-09-22T08:30:00+08:00' },
    { id: 4, sourceType: 'MEDIA', statDate: '2026-09-19', adSlotId: 'splash_android_cn', metric: 'fills', category: '回传延迟差异', adxValue: 2110000, refValue: 2146000, gap: -36000, suggestion: '等待媒体侧补传后重新计算，确认是否存在跨日回传。', computedAt: '2026-09-22T08:30:00+08:00' },
  ]
}

export function createMockReconciliation(): ReconciliationGapReport {
  return { dsp: createDspRows(), media: createMediaRows(), attributions: createAttributions() }
}

export function summarizeReconciliation(rows: Array<DspReconciliationRow | MediaReconciliationRow>, source: ReconciliationSource): ReconciliationSummary {
  const valid = rows.filter((row) => row.status === 'OK')
  const totalRows = rows.length
  const missingRows = rows.length - valid.length
  const mismatchRows = valid.filter((row) => {
    const rate = source === 'dsp' ? (row as DspReconciliationRow).costGapRate : (row as MediaReconciliationRow).impressionsGapRate
    return Math.abs(rate) > 0.02
  }).length

  if (source === 'dsp') {
    const dspRows = valid as DspReconciliationRow[]
    const adxValue = dspRows.reduce((sum, row) => sum + row.adxCost, 0)
    const referenceValue = dspRows.reduce((sum, row) => sum + row.dspCost, 0)
    const gap = adxValue - referenceValue
    return { adxValue, referenceValue, gap, gapRate: referenceValue ? gap / referenceValue : 0, mismatchRows, missingRows, matchRate: totalRows ? (totalRows - mismatchRows - missingRows) / totalRows : 0, totalRows }
  }

  const mediaRows = valid as MediaReconciliationRow[]
  const adxValue = mediaRows.reduce((sum, row) => sum + row.adxRequests, 0)
  const referenceValue = mediaRows.reduce((sum, row) => sum + row.mediaRequests, 0)
  const gap = adxValue - referenceValue
  return { adxValue, referenceValue, gap, gapRate: referenceValue ? gap / referenceValue : 0, mismatchRows, missingRows, matchRate: totalRows ? (totalRows - mismatchRows - missingRows) / totalRows : 0, totalRows }
}

export async function getReconciliation(token: string, query: ReconciliationQuery): Promise<ReconciliationGapReport> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 480))
    const report = createMockReconciliation()
    const inRange = (date: string) => date >= query.startDate && date <= query.endDate
    return {
      dsp: report.dsp.filter((row) => inRange(row.date) && (!query.dsp || row.dsp === query.dsp)),
      media: report.media.filter((row) => inRange(row.date) && (!query.adSlotId || row.adSlotId === query.adSlotId)),
      attributions: report.attributions.filter((row) => inRange(row.statDate) && (!query.dsp || row.dsp === query.dsp) && (!query.adSlotId || row.adSlotId === query.adSlotId)),
    }
  }
  const params = new URLSearchParams({ startDate: query.startDate, endDate: query.endDate })
  if (query.adSlotId) params.append('adSlotId', query.adSlotId)
  if (query.dsp) params.append('dsp', query.dsp)
  return request<ReconciliationGapReport>(`/business/report/special/reconciliation-gap?${params.toString()}`, {}, token)
}
