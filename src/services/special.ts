import { request } from './http'

export interface BillBatch {
  id: number
  fileName: string
  dsp: string
  billingDate: string
  status: 'SUCCESS' | 'PARTIAL_FAILED' | 'FAILED' | 'IMPORTING'
  totalRows: number
  successRows: number
  failedRows: number
  totalCost: number
  importedAt: string
  importedBy: string
}

export interface StrategyGroupMember {
  sourceId: number
  sourceName: string
  weight: number
}

export interface StrategyGroup {
  id: number
  name: string
  rule: string
  timeoutMs: number
  members: StrategyGroupMember[]
}

export interface StrategyPlan {
  id: number
  code: string
  name: string
  bidMode: string
  globalTimeoutMs: number
  refreshAfterMs: number
  maxAgeMs: number
  status: number
  remark: string
  version: number
  publishedVersion?: number
  updatedAt: string
  groups: StrategyGroup[]
}

export interface RuntimeConfigRecord {
  id: number
  configKey: string
  configValue: string
  configType: 'string' | 'int' | 'double' | 'boolean'
  scope: 'engine' | 'admin' | 'shared'
  category: 'immediate' | 'restart'
  description: string
  version: number
  updatedAt: string
  updatedBy: string
}

export interface RuntimeConfigHistory extends RuntimeConfigRecord {
  historyId: number
}

const mockBills: BillBatch[] = [
  { id: 1, fileName: 'xinxin-20260922.csv', dsp: '向新 DSP', billingDate: '2026-09-22', status: 'SUCCESS', totalRows: 1284, successRows: 1284, failedRows: 0, totalCost: 428600, importedAt: '2026-09-22T10:12:00+08:00', importedBy: '系统管理员' },
  { id: 2, fileName: 'judian-20260921.xlsx', dsp: '聚点 DSP', billingDate: '2026-09-21', status: 'PARTIAL_FAILED', totalRows: 986, successRows: 974, failedRows: 12, totalCost: 384300, importedAt: '2026-09-22T09:48:00+08:00', importedBy: '财务' },
  { id: 3, fileName: 'yuntu-20260920.csv', dsp: '云图 DSP', billingDate: '2026-09-20', status: 'SUCCESS', totalRows: 1068, successRows: 1068, failedRows: 0, totalCost: 357000, importedAt: '2026-09-21T11:02:00+08:00', importedBy: '财务' },
  { id: 4, fileName: 'xingyun-20260919.xlsx', dsp: '星云 DSP', billingDate: '2026-09-19', status: 'FAILED', totalRows: 0, successRows: 0, failedRows: 0, totalCost: 0, importedAt: '2026-09-20T10:31:00+08:00', importedBy: '财务' },
]

const mockStrategies: StrategyPlan[] = [
  {
    id: 101, code: 'high_value_users', name: '高价值用户分组', bidMode: 'composite', globalTimeoutMs: 420, refreshAfterMs: 30000, maxAgeMs: 300000, status: 1, remark: '面向高价值用户的优先竞价分组', version: 18, publishedVersion: 248, updatedAt: '2026-09-22T14:32:00+08:00',
    groups: [
      { id: 1, name: '核心渠道', rule: '高价值用户 && Android', timeoutMs: 180, members: [{ sourceId: 201, sourceName: '向新 Store 横幅', weight: 50 }, { sourceId: 202, sourceName: '聚点信息流原生', weight: 50 }] },
      { id: 2, name: '补充渠道', rule: '其他用户', timeoutMs: 120, members: [{ sourceId: 203, sourceName: '云图激励视频', weight: 100 }] },
    ],
  },
  {
    id: 102, code: 'low_latency_bid', name: '低延时竞价方案', bidMode: 'composite', globalTimeoutMs: 350, refreshAfterMs: 20000, maxAgeMs: 180000, status: 1, remark: '控制总超时，优先响应速度', version: 11, publishedVersion: 247, updatedAt: '2026-09-22T13:08:00+08:00',
    groups: [{ id: 3, name: '低延时渠道', rule: 'all', timeoutMs: 260, members: [{ sourceId: 201, sourceName: '向新 Store 横幅', weight: 70 }, { sourceId: 204, sourceName: '星云开屏广告', weight: 30 }] }],
  },
  {
    id: 103, code: 'new_user_rampup', name: '新客冷启动分组', bidMode: 'composite', globalTimeoutMs: 500, refreshAfterMs: 60000, maxAgeMs: 600000, status: 1, remark: '新用户冷启动与流量探索', version: 8, updatedAt: '2026-09-22T11:40:00+08:00', groups: [{ id: 4, name: '探索组', rule: '新客', timeoutMs: 280, members: [{ sourceId: 202, sourceName: '聚点信息流原生', weight: 40 }, { sourceId: 205, sourceName: '极光插屏', weight: 60 }] }],
  },
  {
    id: 104, code: 'video_fallback', name: '视频激励兜底', bidMode: 'composite', globalTimeoutMs: 600, refreshAfterMs: 30000, maxAgeMs: 300000, status: 1, remark: '激励视频场景的兜底竞价', version: 14, publishedVersion: 246, updatedAt: '2026-09-21T16:20:00+08:00', groups: [{ id: 5, name: '视频渠道', rule: 'VIDEO', timeoutMs: 350, members: [{ sourceId: 203, sourceName: '云图激励视频', weight: 100 }] }],
  },
]

const mockConfigs: RuntimeConfigRecord[] = [
  { id: 1, configKey: 'engine.bid.timeout-ms', configValue: '420', configType: 'int', scope: 'engine', category: 'immediate', description: '单次竞价总超时时间', version: 12, updatedAt: '2026-09-22T15:40:00+08:00', updatedBy: '系统管理员' },
  { id: 2, configKey: 'engine.cache.max-age-ms', configValue: '300000', configType: 'int', scope: 'engine', category: 'immediate', description: '策略缓存硬过期时间', version: 9, updatedAt: '2026-09-22T14:10:00+08:00', updatedBy: '运维' },
  { id: 3, configKey: 'engine.protocol.secret', configValue: '******', configType: 'string', scope: 'engine', category: 'restart', description: '引擎协议签名密钥', version: 4, updatedAt: '2026-09-21T18:20:00+08:00', updatedBy: '系统管理员' },
  { id: 4, configKey: 'admin.report.page-size', configValue: '50', configType: 'int', scope: 'admin', category: 'immediate', description: '报表单页最大记录数', version: 6, updatedAt: '2026-09-20T09:12:00+08:00', updatedBy: '运营管理员' },
  { id: 5, configKey: 'shared.event.batch-size', configValue: '500', configType: 'int', scope: 'shared', category: 'immediate', description: '事件上报批处理大小', version: 7, updatedAt: '2026-09-19T11:05:00+08:00', updatedBy: '运维' },
  { id: 6, configKey: 'engine.feature.material-monitor', configValue: 'true', configType: 'boolean', scope: 'engine', category: 'immediate', description: '是否开启素材监控', version: 3, updatedAt: '2026-09-18T15:33:00+08:00', updatedBy: '运营管理员' },
]

export async function getBillBatches(token: string): Promise<BillBatch[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') { await new Promise((resolve) => setTimeout(resolve, 320)); return structuredClone(mockBills) }
  return request<BillBatch[]>('/business/settlement/dsp-bills', {}, token)
}

export async function uploadBill(token: string, payload: { file: File; dsp: string; billingDate: string }): Promise<BillBatch> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 900))
    const batch: BillBatch = { id: Math.max(...mockBills.map((item) => item.id)) + 1, fileName: payload.file.name, dsp: payload.dsp, billingDate: payload.billingDate, status: payload.file.name.endsWith('.xlsx') ? 'PARTIAL_FAILED' : 'SUCCESS', totalRows: 1160, successRows: payload.file.name.endsWith('.xlsx') ? 1148 : 1160, failedRows: payload.file.name.endsWith('.xlsx') ? 12 : 0, totalCost: 396800, importedAt: new Date().toISOString(), importedBy: '系统管理员' }
    mockBills.unshift(batch)
    return structuredClone(batch)
  }
  const body = new FormData()
  body.append('file', payload.file)
  body.append('dsp', payload.dsp)
  body.append('billingDate', payload.billingDate)
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/business/settlement/dsp-bills/import`, { method: 'POST', headers, body })
  const result = await response.json() as { code: number; msg: string; data: BillBatch }
  if (!response.ok || result.code !== 0) throw new Error(result.msg || '账单上传失败')
  return result.data
}

export async function getStrategies(token: string): Promise<StrategyPlan[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') { await new Promise((resolve) => setTimeout(resolve, 340)); return structuredClone(mockStrategies) }
  const page = await request<{ content: StrategyPlan[] }>('/business/strategy?page=0&size=100', {}, token)
  return page.content
}

export async function saveStrategy(token: string, plan: StrategyPlan): Promise<StrategyPlan> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 380))
    const index = mockStrategies.findIndex((item) => item.id === plan.id)
    const next = { ...plan, updatedAt: new Date().toISOString(), version: plan.version + 1 }
    if (index >= 0) mockStrategies.splice(index, 1, next)
    else mockStrategies.unshift({ ...next, id: Math.max(...mockStrategies.map((item) => item.id)) + 1 })
    return structuredClone(next)
  }
  const payload = { name: plan.name, code: plan.code, bidMode: plan.bidMode, globalTimeoutMs: plan.globalTimeoutMs, refreshAfterMs: plan.refreshAfterMs, maxAgeMs: plan.maxAgeMs, status: plan.status, remark: plan.remark }
  return plan.id ? request<StrategyPlan>(`/business/strategy/${plan.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token) : request<StrategyPlan>('/business/strategy', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export async function publishStrategy(token: string, id: number): Promise<number> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 620))
    const plan = mockStrategies.find((item) => item.id === id)
    if (!plan) throw new Error('策略方案不存在')
    plan.publishedVersion = (plan.publishedVersion || 240) + 1
    plan.updatedAt = new Date().toISOString()
    return plan.publishedVersion
  }
  const result = await request<{ publishedVersion?: number; version?: number }>(`/business/strategy/${id}/publish`, { method: 'POST' }, token)
  return result.publishedVersion || result.version || 0
}

export async function getRuntimeConfigs(token: string): Promise<RuntimeConfigRecord[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') { await new Promise((resolve) => setTimeout(resolve, 300)); return structuredClone(mockConfigs) }
  const page = await request<{ content: RuntimeConfigRecord[] }>('/business/engine-config?page=0&size=100', {}, token)
  return page.content
}

export async function updateRuntimeConfig(token: string, record: RuntimeConfigRecord, value: string): Promise<RuntimeConfigRecord> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 360))
    const current = mockConfigs.find((item) => item.id === record.id)
    if (!current) throw new Error('配置不存在')
    current.configValue = value
    current.version += 1
    current.updatedAt = new Date().toISOString()
    current.updatedBy = '系统管理员'
    return structuredClone(current)
  }
  await request<void>(`/business/engine-config/${encodeURIComponent(record.configKey)}`, { method: 'PUT', body: JSON.stringify({ configValue: value, version: record.version }) }, token)
  return { ...record, configValue: value, version: record.version + 1, updatedAt: new Date().toISOString(), updatedBy: '系统管理员' }
}

export async function getRuntimeConfigHistory(token: string, record: RuntimeConfigRecord): Promise<RuntimeConfigHistory[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 280))
    return Array.from({ length: 5 }, (_, index) => ({ ...record, historyId: index + 1, configValue: String(Number(record.configValue || 0) - index * 10), version: Math.max(1, record.version - index - 1), updatedAt: new Date(Date.now() - index * 86400000).toISOString(), updatedBy: index % 2 ? '运维' : '系统管理员' }))
  }
  const page = await request<{ content: RuntimeConfigHistory[] }>(`/business/engine-config/${encodeURIComponent(record.configKey)}/history?page=0&size=20`, {}, token)
  return page.content
}

export async function rollbackRuntimeConfig(token: string, record: RuntimeConfigRecord, history: RuntimeConfigHistory): Promise<RuntimeConfigRecord> {
  return updateRuntimeConfig(token, record, history.configValue)
}
