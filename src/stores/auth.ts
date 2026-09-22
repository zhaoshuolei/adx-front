import { defineStore } from 'pinia'
import type { LoginRequest, UserInfo } from '@/types/api'
import { getCurrentUser, login as loginRequest, mockMode, refreshToken } from '@/services/auth'

const TOKEN_KEY = 'adx-access-token'
const EXPIRY_KEY = 'adx-access-token-expiry'
const USER_KEY = 'adx-user-info'

function readUser(): UserInfo | null {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? (JSON.parse(value) as UserInfo) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem(TOKEN_KEY) || '',
    expiresAt: Number(localStorage.getItem(EXPIRY_KEY) || 0),
    user: readUser(),
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.expiresAt > Date.now()),
    roleNames: (state) => state.user?.roles.map((role) => role.name || role.code || '').filter(Boolean) || [],
  },
  actions: {
    persistSession(accessToken: string, expiresIn: number, user: UserInfo) {
      this.accessToken = accessToken
      this.expiresAt = Date.now() + expiresIn * 1000
      this.user = user
      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.setItem(EXPIRY_KEY, String(this.expiresAt))
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },
    async login(payload: LoginRequest) {
      this.loading = true
      try {
        const token = await loginRequest(payload)
        const user = await getCurrentUser(token.accessToken)
        this.persistSession(token.accessToken, token.expiresIn, user)
      } finally {
        this.loading = false
      }
    },
    async hydrate() {
      if (!this.accessToken) return false
      if (this.expiresAt > Date.now() + 60_000 && this.user) return true
      try {
        const token = await refreshToken(this.accessToken)
        const user = await getCurrentUser(token.accessToken)
        this.persistSession(token.accessToken, token.expiresIn, user)
        return true
      } catch {
        this.logout()
        return false
      }
    },
    logout() {
      this.accessToken = ''
      this.expiresAt = 0
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(EXPIRY_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})

export { mockMode }
