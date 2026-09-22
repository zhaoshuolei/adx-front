export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface PageResult<T> {
  content: T[]
  totalElements: number
  page: number
  size: number
  totalPages: number
}

export interface CaptchaResult {
  captchaId: string
  image: string
}

export interface LoginRequest {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface UserRole {
  id?: number
  code?: string
  name?: string
}

export interface UserInfo {
  userId: number
  username: string
  displayName: string
  roles: UserRole[]
}

export interface ReportSummary {
  origRequests: number
  origAds: number
  impressions: number
  clicks: number
  errors: number
  estimatedRevenue: number
  actualRevenue: number
  fillRequestRate: number
  ctr: number
  cpm: number
}

export interface CoreTrendItem {
  date: string
  fillRate: number
  ecpm: number
  ctr: number
  revenue: number
}

export interface TopItem {
  key: string
  revenue: number
}

export interface OverviewData {
  summary: ReportSummary
  trend: CoreTrendItem[]
  top: TopItem[]
}

export interface AdminInstance {
  instanceId: string
  startedAt: number
  uptimeMs: number
  local: boolean
}

export interface EngineInfo {
  engineId: string
  baseUrl: string
  startedAt: number
  version: string
  source: string
  healthzOk: boolean
}

export interface SnapshotInfo {
  runtimeConfig: number
  dsp: number
  media: number
  adSpace: number
  strategyCount: number
  strategyVersion: number
}

export interface KafkaLagInfo {
  group: string
  lag: number
  error?: string
}

export interface EventTypeCount {
  eventType: string
  count: number
}

export interface MinuteCount {
  minute: string
  eventType: string
  count: number
}

export interface TrafficInfo {
  requests: number
  fanout: number
  bids: number
  filled: number
  won: number
  errors: number
  eventTypes: EventTypeCount[]
  perMinute: MinuteCount[]
}

export interface RuntimeStatus {
  serverTime: number
  windowMinutes: number
  admins: AdminInstance[]
  engines: EngineInfo[]
  snapshots: SnapshotInfo
  kafkaLags: KafkaLagInfo[]
  traffic: TrafficInfo
}

export interface RuntimeIncident {
  id: string
  level: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  time: string
}

export interface DspReconciliationRow {
  date: string
  adSlotId: string
  dsp: string
  adxImpressions: number
  adxClicks: number
  adxCost: number
  dspImpressions: number
  dspClicks: number
  dspCost: number
  status: 'OK' | 'REFERENCE_MISSING'
  impressionsGap: number
  clicksGap: number
  costGap: number
  impressionsGapRate: number
  clicksGapRate: number
  costGapRate: number
}

export interface MediaReconciliationRow {
  date: string
  adSlotId: string
  adxRequests: number
  adxFills: number
  adxImpressions: number
  adxClicks: number
  mediaRequests: number
  mediaFills: number
  mediaImpressions: number
  mediaClicks: number
  status: 'OK' | 'REFERENCE_MISSING'
  requestsGap: number
  fillsGap: number
  impressionsGap: number
  clicksGap: number
  requestsGapRate: number
  fillsGapRate: number
  impressionsGapRate: number
  clicksGapRate: number
}

export interface ReconciliationAttribution {
  id: number
  sourceType: 'DSP' | 'MEDIA'
  statDate: string
  dsp?: string
  adSlotId: string
  metric: string
  category: string
  adxValue: number
  refValue: number
  gap: number
  suggestion: string
  computedAt: string
}

export interface ReconciliationGapReport {
  dsp: DspReconciliationRow[]
  media: MediaReconciliationRow[]
  attributions: ReconciliationAttribution[]
}

export type AdType = 'BANNER' | 'VIDEO' | 'NATIVE' | 'SPLASH' | 'INTERSTITIAL'
export type AdStatus = 'PRODUCTION' | 'TEST'

export interface AdSpace {
  id: number
  mediaId: number
  mediaName: string
  mediaCompanyName: string
  mediaPackageName: string
  name: string
  adSlotId: string
  appVersion: string
  adType: AdType
  adStatus: AdStatus
  enabled: boolean
  templateRendering: boolean
  discountPercent: number
  tag: string
  priceFloor: number
  strategyProfileId?: number
  strategyProfileName?: string
  boundSourceNames: string[]
  todayRequests: number
  todayImpressions: number
  todayClicks: number
  createdAt: string
}

export interface AdSpaceFormValues {
  mediaId: number
  name: string
  adSlotId: string
  adType: AdType
  adStatus: AdStatus
  enabled: boolean
  templateRendering: boolean
  discount: number
  tag: string
  priceFloor: number
  adSizeId?: number
  strategyProfileId?: number
}

export interface AdSize {
  id: number
  name: string
  width: number
  height: number
  sortOrder: number
}

export interface MediaApp {
  id: number
  mediaCompanyId: number
  mediaCompanyName: string
  mediaId: string
  appName: string
  appId: string
  packageName: string
  version: string
  enabled: boolean
  adSpaceCount: number
}

export interface StrategyProfile {
  id: number
  code: string
  name: string
  status: number
  publishedVersion?: number
}

export interface AdSource {
  id: number
  sourceName: string
  sourceId: string
  dspConfigId: number
  mediaId: number
  adType: string
  adStatus: string
  actualEcpm?: number
  estEcpm?: number
  enabled: number
}
