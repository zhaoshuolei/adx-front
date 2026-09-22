import type {
  AdSize,
  AdSource,
  AdSpace,
  AdSpaceFormValues,
  MediaApp,
  PageResult,
  StrategyProfile,
} from '@/types/api'
import { request } from './http'

export interface AdSpaceQuery {
  page: number
  size: number
  keyword?: string
  mediaId?: number
  status?: 0 | 1
  adStatus?: string
}

const mediaOptions: MediaApp[] = [
  { id: 1, mediaCompanyId: 1, mediaCompanyName: '联想应用', mediaId: 'lenovo_store', appName: '乐商店 Android', appId: 'com.lenovo.leos.store', packageName: 'com.lenovo.leos.store', version: '8.4.1', enabled: true, adSpaceCount: 12 },
  { id: 2, mediaCompanyId: 1, mediaCompanyName: '联想应用', mediaId: 'lenovo_weather', appName: '天气通', appId: 'com.lenovo.weather', packageName: 'com.lenovo.weather', version: '6.8.2', enabled: true, adSpaceCount: 8 },
  { id: 3, mediaCompanyId: 2, mediaCompanyName: '联想浏览器', mediaId: 'lenovo_browser', appName: '联想浏览器', appId: 'com.lenovo.browser', packageName: 'com.lenovo.browser', version: '12.2.0', enabled: true, adSpaceCount: 10 },
  { id: 4, mediaCompanyId: 1, mediaCompanyName: '联想应用', mediaId: 'lenovo_calendar', appName: '乐日历', appId: 'com.lenovo.calendar', packageName: 'com.lenovo.calendar', version: '4.6.3', enabled: true, adSpaceCount: 6 },
  { id: 5, mediaCompanyId: 3, mediaCompanyName: '联想文件', mediaId: 'lenovo_files', appName: '文件管理', appId: 'com.lenovo.files', packageName: 'com.lenovo.files', version: '7.1.5', enabled: true, adSpaceCount: 5 },
]

const adSizes: AdSize[] = [
  { id: 1, name: '640x100 横幅', width: 640, height: 100, sortOrder: 1 },
  { id: 2, name: '1080x1920 开屏', width: 1080, height: 1920, sortOrder: 2 },
  { id: 3, name: '1280x720 激励视频', width: 1280, height: 720, sortOrder: 3 },
  { id: 4, name: '720x1280 插屏', width: 720, height: 1280, sortOrder: 4 },
  { id: 5, name: '360x640 原生', width: 360, height: 640, sortOrder: 5 },
]

const strategyOptions: StrategyProfile[] = [
  { id: 101, code: 'high_value_users', name: '高价值用户分组', status: 1, publishedVersion: 248 },
  { id: 102, code: 'low_latency_bid', name: '低延时竞价方案', status: 1, publishedVersion: 247 },
  { id: 103, code: 'new_user_rampup', name: '新客冷启动分组', status: 1 },
  { id: 104, code: 'video_fallback', name: '视频激励兜底', status: 1, publishedVersion: 246 },
]

const sourceNames = ['向新 Store 横幅', '聚点信息流原生', '云图激励视频', '星云开屏广告', '极光插屏']
const adSourceOptions: AdSource[] = sourceNames.map((sourceName, index) => ({
  id: 201 + index,
  sourceName,
  sourceId: `source_${String(index + 1).padStart(2, '0')}`,
  dspConfigId: 301 + index,
  mediaId: (index % mediaOptions.length) + 1,
  adType: ['BANNER', 'NATIVE', 'VIDEO', 'SPLASH', 'INTERSTITIAL'][index] || 'BANNER',
  adStatus: index === 4 ? 'applying' : 'production',
  actualEcpm: 17.4 + index * 1.18,
  estEcpm: 16.8 + index * 1.06,
  enabled: index === 4 ? 0 : 1,
}))

const adTypes = ['BANNER', 'VIDEO', 'NATIVE', 'SPLASH', 'INTERSTITIAL'] as const
const names = ['首页横幅', '详情信息流', '应用开屏', '签到激励视频', '任务完成页', '频道插屏', '搜索结果原生', '消息中心横幅']

function createMockAdSpaces(): AdSpace[] {
  return Array.from({ length: 57 }, (_, index) => {
    const media = mediaOptions[index % mediaOptions.length] || mediaOptions[0]!
    const type = adTypes[index % adTypes.length] || 'BANNER'
    const strategy = strategyOptions[index % strategyOptions.length]
    const boundCount = index % 4
    const requests = Math.round(1_200_000 + index * 67_300 + Math.sin(index) * 120_000)
    return {
      id: 1001 + index,
      mediaId: media.id,
      mediaName: media.appName,
      mediaCompanyName: media.mediaCompanyName,
      mediaPackageName: media.packageName,
      name: `${media.appName}-${names[index % names.length]}`,
      adSlotId: `${type.toLowerCase()}_${media.mediaId}_${String(index + 1).padStart(2, '0')}`,
      appVersion: media.version,
      adType: type,
      adStatus: index % 9 === 0 ? 'TEST' : 'PRODUCTION',
      enabled: index % 7 !== 0,
      templateRendering: index % 3 === 0,
      discountPercent: 80 + index % 18,
      tag: index % 3 === 0 ? '核心流量,品牌安全' : index % 3 === 1 ? '高价值' : '常规',
      priceFloor: Number((8 + index % 11 * 0.8).toFixed(2)),
      strategyProfileId: strategy?.id,
      strategyProfileName: strategy?.name,
      boundSourceNames: sourceNames.slice(0, boundCount),
      todayRequests: requests,
      todayImpressions: Math.round(requests * (0.77 + index % 8 * 0.012)),
      todayClicks: Math.round(requests * (0.018 + index % 6 * 0.0012)),
      createdAt: `2026-0${index % 7 + 1}-${String(index % 26 + 1).padStart(2, '0')}T08:30:00+08:00`,
    }
  })
}

const mockAdSpaces = createMockAdSpaces()

export async function getAdSpaces(token: string, query: AdSpaceQuery): Promise<PageResult<AdSpace>> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 360))
    const keyword = query.keyword?.trim().toLowerCase()
    const filtered = mockAdSpaces.filter((item) => {
      if (keyword && !`${item.name} ${item.adSlotId}`.toLowerCase().includes(keyword)) return false
      if (query.mediaId && item.mediaId !== query.mediaId) return false
      if (query.status !== undefined && Number(item.enabled) !== query.status) return false
      if (query.adStatus && item.adStatus !== query.adStatus) return false
      return true
    })
    const start = query.page * query.size
    return {
      content: filtered.slice(start, start + query.size),
      totalElements: filtered.length,
      page: query.page,
      size: query.size,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.size)),
    }
  }

  const params = new URLSearchParams({ page: String(query.page), size: String(query.size) })
  if (query.keyword) params.set('keyword', query.keyword)
  if (query.mediaId) params.set('mediaId', String(query.mediaId))
  if (query.status !== undefined) params.set('status', String(query.status))
  if (query.adStatus) params.set('adStatus', query.adStatus)
  return request<PageResult<AdSpace>>(`/business/ad-spaces?${params.toString()}`, {}, token)
}

export async function getAdSpace(token: string, id: number): Promise<AdSpace> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const match = mockAdSpaces.find((item) => item.id === id)
    if (!match) throw new Error('广告位不存在')
    return structuredClone(match)
  }
  return request<AdSpace>(`/business/ad-spaces/${id}`, {}, token)
}

export async function createAdSpace(token: string, values: AdSpaceFormValues): Promise<AdSpace> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const media = mediaOptions.find((item) => item.id === values.mediaId) || mediaOptions[0]!
    const created: AdSpace = {
      id: Math.max(...mockAdSpaces.map((item) => item.id)) + 1,
      mediaId: values.mediaId,
      mediaName: media.appName,
      mediaCompanyName: media.mediaCompanyName,
      mediaPackageName: media.packageName,
      name: values.name,
      adSlotId: values.adSlotId,
      appVersion: media.version,
      adType: values.adType,
      adStatus: values.adStatus,
      enabled: values.enabled,
      templateRendering: values.templateRendering,
      discountPercent: values.discount,
      tag: values.tag,
      priceFloor: values.priceFloor,
      strategyProfileId: values.strategyProfileId,
      strategyProfileName: strategyOptions.find((item) => item.id === values.strategyProfileId)?.name,
      boundSourceNames: [],
      todayRequests: 0,
      todayImpressions: 0,
      todayClicks: 0,
      createdAt: new Date().toISOString(),
    }
    mockAdSpaces.unshift(created)
    return structuredClone(created)
  }
  return request<AdSpace>('/business/ad-spaces', { method: 'POST', body: JSON.stringify(values) }, token)
}

export async function updateAdSpace(token: string, id: number, values: AdSpaceFormValues): Promise<AdSpace> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const index = mockAdSpaces.findIndex((item) => item.id === id)
    const current = mockAdSpaces[index]
    if (!current || index < 0) throw new Error('广告位不存在')
    const updated: AdSpace = {
      ...current,
      name: values.name,
      adSlotId: values.adSlotId,
      adType: values.adType,
      adStatus: values.adStatus,
      enabled: values.enabled,
      templateRendering: values.templateRendering,
      discountPercent: values.discount,
      tag: values.tag,
      priceFloor: values.priceFloor,
      strategyProfileId: values.strategyProfileId,
      strategyProfileName: strategyOptions.find((item) => item.id === values.strategyProfileId)?.name,
    }
    mockAdSpaces.splice(index, 1, updated)
    return structuredClone(updated)
  }
  const { mediaId: _mediaId, ...payload } = values
  return request<AdSpace>(`/business/ad-spaces/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token)
}

export async function toggleAdSpaceStatus(token: string, id: number): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 260))
    const item = mockAdSpaces.find((adSpace) => adSpace.id === id)
    if (item) item.enabled = !item.enabled
    return
  }
  return request<void>(`/business/ad-spaces/${id}/status`, { method: 'PATCH' }, token)
}

export async function getAdSpaceOptions(token: string): Promise<{ media: MediaApp[]; sizes: AdSize[]; strategies: StrategyProfile[] }> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    return { media: structuredClone(mediaOptions), sizes: structuredClone(adSizes), strategies: structuredClone(strategyOptions) }
  }
  const [mediaPage, sizes, strategyPage] = await Promise.all([
    request<PageResult<MediaApp>>('/business/media?page=0&size=100', {}, token),
    request<AdSize[]>('/business/dictionary/ad-sizes', {}, token),
    request<PageResult<StrategyProfile>>('/business/strategy?page=0&size=100', {}, token),
  ])
  return { media: mediaPage.content, sizes, strategies: strategyPage.content }
}

export async function getBoundAdSources(token: string, adSpaceId: number): Promise<AdSource[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const adSpace = mockAdSpaces.find((item) => item.id === adSpaceId)
    return structuredClone(adSourceOptions.filter((source) => adSpace?.boundSourceNames.includes(source.sourceName)))
  }
  return request<AdSource[]>(`/business/ad-sources/by-ad-space/${adSpaceId}`, {}, token)
}

export async function getAdSourceOptions(token: string): Promise<AdSource[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') return structuredClone(adSourceOptions)
  const page = await request<PageResult<AdSource>>('/business/ad-sources?page=0&size=100', {}, token)
  return page.content
}

export async function updateAdSpaceSources(token: string, adSpaceId: number, currentIds: number[], nextIds: number[]): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((resolve) => setTimeout(resolve, 380))
    const adSpace = mockAdSpaces.find((item) => item.id === adSpaceId)
    if (adSpace) adSpace.boundSourceNames = adSourceOptions.filter((source) => nextIds.includes(source.id)).map((source) => source.sourceName)
    return
  }

  const toBind = nextIds.filter((id) => !currentIds.includes(id))
  const toUnbind = currentIds.filter((id) => !nextIds.includes(id))
  await Promise.all([
    ...toBind.map((id) => request<void>(`/business/ad-sources/${id}/bind-ad-spaces`, { method: 'POST', body: JSON.stringify({ adSpaceIds: [adSpaceId] }) }, token)),
    ...toUnbind.map((id) => request<void>(`/business/ad-sources/${id}/unbind-ad-spaces`, { method: 'POST', body: JSON.stringify({ adSpaceIds: [adSpaceId] }) }, token)),
  ])
}

export const adTypeLabels: Record<string, string> = {
  BANNER: '横幅',
  VIDEO: '激励视频',
  NATIVE: '原生',
  SPLASH: '开屏',
  INTERSTITIAL: '插屏',
}
