import type {
  CaptchaResult,
  LenovoIdCallbackRequest,
  LenovoIdLoginResponse,
  LoginRequest,
  TokenResponse,
  UserInfo,
} from '@/types/api'
import { request } from './http'

export const mockMode = import.meta.env.VITE_USE_MOCK === 'true'

function createMockCaptcha(): Promise<CaptchaResult> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 80
    const context = canvas.getContext('2d')
    if (!context) {
      resolve({ captchaId: 'mock-captcha', image: '' })
      return
    }

    context.fillStyle = '#eef7f3'
    context.fillRect(0, 0, canvas.width, canvas.height)
    for (let index = 0; index < 6; index += 1) {
      context.strokeStyle = index % 2 === 0 ? '#b7e6d5' : '#d5e9ff'
      context.beginPath()
      context.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
      context.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
      context.stroke()
    }
    context.fillStyle = '#123b39'
    context.font = 'bold 38px "Cascadia Code", monospace'
    context.fillText('1234', 72, 52)
    resolve({ captchaId: 'mock-captcha', image: canvas.toDataURL('image/png') })
  })
}

export async function getCaptcha(): Promise<CaptchaResult> {
  if (mockMode) return createMockCaptcha()
  return request<CaptchaResult>('/auth/captcha')
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  if (mockMode) {
    await new Promise((resolve) => setTimeout(resolve, 450))
    if (payload.username !== 'admin' || payload.password !== 'admin123' || payload.captchaCode !== '1234') {
      throw new Error('账号、密码或验证码不正确')
    }
    return { accessToken: `mock-token-${Date.now()}`, tokenType: 'Bearer', expiresIn: 900 }
  }
  return request<TokenResponse>('/auth/token', { method: 'POST', body: JSON.stringify(payload) })
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  if (mockMode) return { accessToken: `mock-token-${Date.now()}`, tokenType: 'Bearer', expiresIn: 900 }
  return request<TokenResponse>('/auth/refresh', { method: 'POST' }, token)
}

export async function getCurrentUser(token: string): Promise<UserInfo> {
  if (mockMode) {
    await new Promise((resolve) => setTimeout(resolve, 220))
    return {
      userId: 1,
      username: 'admin',
      displayName: '系统管理员',
      roles: [{ id: 1, code: 'super_admin', name: '超级管理员' }],
    }
  }
  return request<UserInfo>('/user/info', {}, token)
}

export async function exchangeLenovoToken(payload: LenovoIdCallbackRequest): Promise<LenovoIdLoginResponse> {
  if (mockMode) {
    await new Promise((resolve) => setTimeout(resolve, 520))
    if (payload.accessToken.includes('denied')) throw new Error('当前联想账号没有 ADX 访问权限')
    return {
      token: `mock-lenovo-token-${Date.now()}`,
      tokenType: 'Bearer',
      expiresIn: 900,
      userInfo: {
        username: payload.username || 'lenovo_user',
        displayName: payload.displayName || '联想用户',
        email: 'lenovo.user@lenovo.com',
        roles: ['超级管理员'],
      },
    }
  }
  return request<LenovoIdLoginResponse>('/auth/lenovoid/callback', { method: 'POST', body: JSON.stringify(payload) })
}

export async function applyLenovoPermission(payload: LenovoIdCallbackRequest): Promise<string> {
  if (mockMode) {
    await new Promise((resolve) => setTimeout(resolve, 420))
    return '权限申请已提交，等待管理员审批'
  }
  return request<string>('/auth/lenovoid/apply', { method: 'POST', body: JSON.stringify(payload) })
}

const LENOVO_STATE_KEY = 'adx-lenovoid-state'
const LENOVO_REDIRECT_KEY = 'adx-lenovoid-redirect'

export function isLenovoLoginConfigured(): boolean {
  return mockMode || Boolean(import.meta.env.VITE_LENOVO_AUTH_URL?.trim())
}

export function beginLenovoLogin(redirect = '/overview') {
  const state = crypto.randomUUID()
  sessionStorage.setItem(LENOVO_STATE_KEY, state)
  sessionStorage.setItem(LENOVO_REDIRECT_KEY, redirect)

  if (mockMode) {
    const params = new URLSearchParams({
      accessToken: `mock-lenovo-access-${Date.now()}`,
      tokenType: 'Bearer',
      username: 'lenovo_admin',
      displayName: '联想管理员',
      state,
    })
    window.location.assign(`/auth/lenovoid/callback?${params.toString()}`)
    return
  }

  const configuredUrl = import.meta.env.VITE_LENOVO_AUTH_URL?.trim()
  if (!configuredUrl) throw new Error('未配置联想一键登录授权地址，请联系管理员配置 VITE_LENOVO_AUTH_URL')

  const redirectUri = `${window.location.origin}/auth/lenovoid/callback`
  const values: Record<string, string> = {
    redirect_uri: redirectUri,
    state,
    client_id: import.meta.env.VITE_LENOVO_CLIENT_ID?.trim() || '',
    scope: import.meta.env.VITE_LENOVO_SCOPE?.trim() || 'openid profile',
    response_type: import.meta.env.VITE_LENOVO_RESPONSE_TYPE?.trim() || 'token',
  }

  let authorizeUrl = configuredUrl
  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    if (authorizeUrl.includes(placeholder)) {
      authorizeUrl = authorizeUrl.split(placeholder).join(encodeURIComponent(value))
    }
  })

  const url = new URL(authorizeUrl, window.location.origin)
  Object.entries(values).forEach(([key, value]) => {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value)
  })
  window.location.assign(url.toString())
}

export function consumeLenovoLoginState(state?: string | null): string {
  const expected = sessionStorage.getItem(LENOVO_STATE_KEY)
  sessionStorage.removeItem(LENOVO_STATE_KEY)
  if (expected && expected !== state) throw new Error('联想登录状态校验失败，请重新发起登录')
  return sessionStorage.getItem(LENOVO_REDIRECT_KEY) || '/overview'
}

export function clearLenovoLoginRedirect() {
  sessionStorage.removeItem(LENOVO_REDIRECT_KEY)
}
