import type { KafkaLagInfo, MinuteCount, RuntimeIncident, RuntimeStatus, TrafficInfo } from '@/types/api'
import { request } from './http'

function createMinuteTraffic(): MinuteCount[] {
  const events = ['request', 'bid', 'filled', 'impression'] as const
  const end = new Date('2026-09-22T16:34:00+08:00')
  const rows: MinuteCount[] = []
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(end.getTime() - index * 60_000)
    const minute = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    const base = 46_000 + Math.round(Math.sin(index / 2) * 2_400) + (11 - index) * 125
    rows.push(
      { minute, eventType: events[0], count: base },
      { minute, eventType: events[1], count: Math.round(base * 3.55) },
      { minute, eventType: events[2], count: Math.round(base * 3.02) },
      { minute, eventType: events[3], count: Math.round(base * 2.64) },
    )
  }
  return rows
}

function createMockTraffic(): TrafficInfo {
  return {
    requests: 166_398_000,
    fanout: 590_712_900,
    bids: 502_142_000,
    filled: 427_462_000,
    won: 379_884_000,
    errors: 299_516,
    eventTypes: [
      { eventType: 'request', count: 166_398_000 },
      { eventType: 'bid', count: 502_142_000 },
      { eventType: 'filled', count: 427_462_000 },
      { eventType: 'impression', count: 379_884_000 },
    ],
    perMinute: createMinuteTraffic(),
  }
}

export function createMockRuntime(): RuntimeStatus {
  return {
    serverTime: Date.now(),
    windowMinutes: 60,
    admins: [
      { instanceId: 'admin-01', startedAt: Date.now() - 96_000_000, uptimeMs: 96_000_000, local: true },
      { instanceId: 'admin-02', startedAt: Date.now() - 84_000_000, uptimeMs: 84_000_000, local: false },
    ],
    engines: Array.from({ length: 12 }, (_, index) => ({
      engineId: `engine-${String(index + 1).padStart(2, '0')}`,
      baseUrl: `http://10.20.4.${20 + index}:8081`,
      startedAt: Date.now() - (40 + index) * 3_600_000,
      version: index === 6 ? 'v2.18.3' : 'v2.18.4',
      source: index === 6 ? 'rolling-update' : 'deployment',
      healthzOk: index !== 6,
    })),
    snapshots: {
      runtimeConfig: 86,
      dsp: 20,
      media: 48,
      adSpace: 2846,
      strategyCount: 34,
      strategyVersion: 248,
    },
    kafkaLags: [
      { group: 'track-events', lag: 1248, error: '' },
      { group: 'report-aggregate', lag: 286, error: '' },
      { group: 'billing-import', lag: 0, error: '' },
    ],
    traffic: createMockTraffic(),
  }
}

export function deriveRuntimeIncidents(status: RuntimeStatus): RuntimeIncident[] {
  const incidents: RuntimeIncident[] = []
  const now = new Date(status.serverTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  status.engines.filter((engine) => !engine.healthzOk).forEach((engine) => {
    incidents.push({
      id: `engine-${engine.engineId}`,
      level: 'critical',
      title: `${engine.engineId} 健康检查失败`,
      detail: `${engine.baseUrl} · ${engine.version} · 等待重新探测`,
      time: now,
    })
  })

  status.kafkaLags.forEach((lag, index) => {
    if (lag.error) {
      incidents.push({ id: `kafka-error-${index}`, level: 'critical', title: `${lag.group} 消费异常`, detail: lag.error, time: now })
    } else if (lag.lag > 1000) {
      incidents.push({ id: `kafka-lag-${index}`, level: 'warning', title: `${lag.group} 消费延迟升高`, detail: `当前积压 ${lag.lag.toLocaleString('zh-CN')} 条，等待自动恢复。`, time: now })
    }
  })

  const errorRate = status.traffic.requests ? status.traffic.errors / status.traffic.requests : 0
  if (errorRate > 0.001) {
    incidents.push({ id: 'traffic-error-rate', level: 'warning', title: '请求错误率高于基线', detail: `窗口错误率 ${(errorRate * 100).toFixed(2)}%，请检查 DSP 响应。`, time: now })
  }
  return incidents
}

export async function getRuntimeStatus(token: string, minutes: number): Promise<RuntimeStatus> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 420))
    return { ...createMockRuntime(), windowMinutes: minutes }
  }
  return request<RuntimeStatus>(`/business/runtime/status?minutes=${minutes}`, {}, token)
}

export function trafficForEvent(rows: MinuteCount[], eventType: string): number[] {
  return rows.filter((row) => row.eventType === eventType).map((row) => row.count)
}

export function minuteLabels(rows: MinuteCount[]): string[] {
  return [...new Set(rows.map((row) => row.minute))]
}

export function maxKafkaLag(rows: KafkaLagInfo[]): number {
  return rows.reduce((max, row) => Math.max(max, row.lag), 0)
}
