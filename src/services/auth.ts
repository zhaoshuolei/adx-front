import type { CaptchaResult, LoginRequest, TokenResponse, UserInfo } from '@/types/api'
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
