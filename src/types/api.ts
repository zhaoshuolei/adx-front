export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
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
