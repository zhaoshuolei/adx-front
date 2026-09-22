import { defineStore } from 'pinia'

export type ThemePreference = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'adx-theme-preference'

function normalizePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function getSystemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(preference: ThemePreference): EffectiveTheme {
  const effective = preference === 'system' ? getSystemTheme() : preference
  document.documentElement.dataset.theme = effective
  document.documentElement.dataset.themePreference = preference
  return effective
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    preference: normalizePreference(localStorage.getItem(STORAGE_KEY)),
    effective: 'light' as EffectiveTheme,
  }),
  actions: {
    init() {
      this.effective = applyTheme(this.preference)
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.preference === 'system') this.effective = applyTheme('system')
      })
    },
    setPreference(preference: ThemePreference) {
      this.preference = preference
      localStorage.setItem(STORAGE_KEY, preference)
      this.effective = applyTheme(preference)
    },
  },
})
