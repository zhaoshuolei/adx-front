import type { PageResult } from '@/types/api'
import type { ResourceConfig, ResourceRow, ResourceValue } from '@/config/resources'
import { request } from './http'

export interface CatalogQuery {
  page: number
  size: number
  filters?: Record<string, string | number>
}

const mockStore = new Map<string, ResourceRow[]>()

function rowsFor(configKey: string, config: ResourceConfig): ResourceRow[] {
  if (!mockStore.has(configKey)) mockStore.set(configKey, structuredClone(config.mockRows))
  return mockStore.get(configKey) || []
}

function asRows(value: unknown): ResourceRow[] {
  if (Array.isArray(value)) return value as ResourceRow[]
  if (value && typeof value === 'object' && Array.isArray((value as { content?: unknown }).content)) {
    return (value as { content: ResourceRow[] }).content
  }
  return []
}

export async function listCatalogResource(token: string, key: string, config: ResourceConfig, query: CatalogQuery): Promise<PageResult<ResourceRow>> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const filters = query.filters || {}
    const keyword = String(filters.keyword || '').trim().toLowerCase()
    const filtered = rowsFor(key, config).filter((row) => {
      if (keyword) {
        const haystack = Object.values(row).map((value) => Array.isArray(value) ? value.join(' ') : String(value ?? '')).join(' ').toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      return Object.entries(filters).every(([filterKey, value]) => {
        if (filterKey === 'keyword' || value === '' || value === undefined) return true
        const current = row[filterKey]
        if (filterKey === 'enabled') return String(Number(current)) === String(value)
        return String(current) === String(value)
      })
    })
    const start = query.page * query.size
    return {
      content: structuredClone(filtered.slice(start, start + query.size)),
      totalElements: filtered.length,
      page: query.page,
      size: query.size,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.size)),
    }
  }

  const params = new URLSearchParams({ page: String(query.page), size: String(query.size) })
  Object.entries(query.filters || {}).forEach(([filterKey, value]) => {
    if (value !== '' && value !== undefined) params.set(filterKey, String(value))
  })
  const payload = await request<PageResult<ResourceRow> | ResourceRow[]>(`${config.listPath || config.endpoint}?${params.toString()}`, {}, token)
  const content = asRows(payload)
  return {
    content,
    totalElements: Array.isArray(payload) ? content.length : payload.totalElements || content.length,
    page: query.page,
    size: query.size,
    totalPages: Array.isArray(payload) ? 1 : payload.totalPages || 1,
  }
}

export async function createCatalogResource(token: string, key: string, config: ResourceConfig, values: Record<string, ResourceValue>): Promise<ResourceRow> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 380))
    const rows = rowsFor(key, config)
    const row = { id: Math.max(0, ...rows.map((item) => Number(item.id))) + 1, ...values } as ResourceRow
    rows.unshift(row)
    return structuredClone(row)
  }
  return request<ResourceRow>(config.endpoint, { method: 'POST', body: JSON.stringify(values) }, token)
}

export async function updateCatalogResource(token: string, key: string, config: ResourceConfig, id: number, values: Record<string, ResourceValue>): Promise<ResourceRow> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 380))
    const rows = rowsFor(key, config)
    const index = rows.findIndex((item) => Number(item.id) === id)
    if (index < 0) throw new Error(`${config.entityLabel}不存在`)
    rows[index] = { ...rows[index], ...values, id } as ResourceRow
    return structuredClone(rows[index])
  }
  const path = (config.updatePath || `${config.endpoint}/{id}`).replace('{id}', String(id))
  return request<ResourceRow>(path, { method: 'PUT', body: JSON.stringify(values) }, token)
}

export async function deleteCatalogResource(token: string, key: string, config: ResourceConfig, id: number): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 320))
    const rows = rowsFor(key, config)
    const index = rows.findIndex((item) => Number(item.id) === id)
    if (index >= 0) rows.splice(index, 1)
    return
  }
  const path = (config.deletePath || `${config.endpoint}/{id}`).replace('{id}', String(id))
  return request<void>(path, { method: 'DELETE' }, token)
}

export async function toggleCatalogResource(token: string, key: string, config: ResourceConfig, id: number): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 280))
    const row = rowsFor(key, config).find((item) => Number(item.id) === id)
    if (!row) throw new Error(`${config.entityLabel}不存在`)
    const field = config.toggleKey || 'enabled'
    row[field] = !Boolean(row[field])
    if (config.statusKey === 'status') row.status = row[field] ? '已启用' : '已停用'
    return
  }
  if (!config.statusPath) throw new Error('当前资源不支持状态切换')
  const path = config.statusPath.replace('{id}', String(id))
  return request<void>(path, { method: 'PATCH' }, token)
}
