import type { ApiResponse } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(buildUrl(path), { ...options, headers })
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '网络请求失败')
  }

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null
  if (!response.ok) throw new ApiError(body?.msg || `请求失败 (${response.status})`, response.status)
  if (!body) throw new ApiError('服务返回了无法解析的数据', response.status)
  if (body.code !== 0) throw new ApiError(body.msg || '业务请求失败', response.status)
  return body.data
}
