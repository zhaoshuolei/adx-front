<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LogOut,
  MonitorCog,
  MoonStar,
  PanelLeft,
  Sun,
  SunMoon,
  UserRound,
} from 'lucide-vue-next'
import { modules, navigationGroups, moduleForRoute, type ModuleKey } from '@/config/navigation'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreference } from '@/stores/theme'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToastStore()
const { user } = storeToRefs(auth)
const { preference, effective } = storeToRefs(theme)

const accountControl = ref<HTMLElement | null>(null)
const accountOpen = ref(false)
const themeOpen = ref(false)
const collapsed = ref(localStorage.getItem('adx-sidebar-collapsed') === '1')
const activeModule = ref<ModuleKey>(moduleForRoute(route.path))

const pageTitle = computed(() => String(route.meta.title || 'ADX 管理台'))
const currentModuleLabel = computed(() => modules.find((item) => item.key === activeModule.value)?.label || '经营中心')
const initials = computed(() => (user.value?.displayName || '系统管理员').slice(0, 2))
const roleLabel = computed(() => auth.roleNames[0] || '管理员')

const themeNames: Record<ThemePreference, string> = { light: '浅色', dark: '深色', system: '跟随系统' }
const themeOptions = [
  { value: 'light' as const, label: '浅色', hint: '始终保持明亮界面', icon: Sun },
  { value: 'dark' as const, label: '深色', hint: '降低暗光环境亮度', icon: MoonStar },
  { value: 'system' as const, label: '跟随系统', hint: '自动匹配设备外观', icon: MonitorCog },
]

watch(() => route.path, (path) => { activeModule.value = moduleForRoute(path) })

function toggleSidebar() {
  collapsed.value = !collapsed.value
  localStorage.setItem('adx-sidebar-collapsed', collapsed.value ? '1' : '0')
  toast.show(collapsed.value ? '主导航已收起' : '主导航已展开')
}

function navigateModule(module: (typeof modules)[number]) {
  activeModule.value = module.key
  void router.push(module.route)
}

function navigateGroup(group: (typeof navigationGroups)[number]) {
  activeModule.value = group.module
  const first = group.items[0]
  if (first) void router.push(first.route)
}

function selectTheme(value: ThemePreference) {
  theme.setPreference(value)
  themeOpen.value = false
  accountOpen.value = false
  toast.show(`界面主题已切换为${themeNames[value]}`)
}

function logout() {
  auth.logout()
  accountOpen.value = false
  void router.replace('/login')
}

function handleDocumentClick(event: MouseEvent) {
  if (!accountControl.value?.contains(event.target as Node)) {
    accountOpen.value = false
    themeOpen.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    accountOpen.value = false
    themeOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="adx-app-shell" :class="{ 'is-sidebar-collapsed': collapsed }">
    <div class="adx-side-header">
      <span class="adx-brand-mark"><Box class="adx-icon" /></span>
      <span class="adx-brand-copy"><strong>ADX 管理中心</strong><span>Advertising OS</span></span>
    </div>

    <header class="adx-topbar">
      <button class="adx-collapse-button" type="button" :aria-label="collapsed ? '展开主导航' : '收起主导航'" @click="toggleSidebar">
        <PanelLeft class="adx-icon" />
      </button>
      <div class="adx-breadcrumb"><span>{{ currentModuleLabel }}</span><ChevronRight class="adx-icon" /><strong>{{ pageTitle }}</strong></div>
      <nav class="adx-module-tabs" aria-label="一级导航">
        <button v-for="module in modules" :key="module.key" class="adx-module-tab" :class="{ active: activeModule === module.key }" type="button" @click="navigateModule(module)">{{ module.label }}</button>
      </nav>
      <div class="adx-top-actions"><span class="adx-status adx-status--success">生产环境</span></div>
    </header>

    <aside class="adx-sidebar" id="mainSidebar">
      <nav>
        <div v-for="group in navigationGroups" :key="group.module" class="adx-nav-group">
          <div class="adx-nav-label">{{ group.label }}</div>
          <div class="adx-nav-branch" :class="{ 'is-open': activeModule === group.module }">
            <button class="adx-nav-item adx-nav-parent" :class="{ active: activeModule === group.module }" type="button" @click="navigateGroup(group)">
              <component :is="group.items[0]?.icon" class="adx-icon" />
              <span>{{ group.items.length > 1 ? group.label : group.items[0]?.title }}</span>
              <ChevronDown v-if="group.items.length > 1" class="adx-nav-chevron" />
            </button>
            <div v-if="group.items.length > 1" class="adx-subnav">
              <button v-for="item in group.items" :key="item.route" class="adx-subnav-item" :class="{ active: route.path.startsWith(item.route) }" type="button" @click="router.push(item.route)">
                <span>{{ item.title }}</span><small v-if="item.count">{{ item.count }}</small>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div ref="accountControl" class="adx-account-control">
        <button class="adx-account-card" type="button" :aria-expanded="accountOpen" aria-controls="accountMenu" @click.stop="accountOpen = !accountOpen; themeOpen = false">
          <span class="adx-account-card__avatar">{{ initials }}</span>
          <span class="adx-account-card__copy"><strong>{{ user?.displayName || '系统管理员' }}</strong><small>{{ roleLabel }}</small></span>
          <ChevronUp class="adx-account-card__arrow" :class="{ rotated: accountOpen }" />
        </button>

        <div v-if="accountOpen" id="accountMenu" class="adx-account-menu" role="menu">
          <div class="adx-account-menu__head">
            <span class="adx-account-menu__avatar">{{ initials }}</span>
            <span><strong>{{ user?.displayName || '系统管理员' }}</strong><small>@{{ user?.username || 'admin' }}</small></span>
          </div>
          <div class="adx-account-menu__divider" />
          <button class="adx-account-menu__item" type="button" @click="toast.show('个人资料将在用户中心实现'); accountOpen = false"><UserRound class="adx-icon" /><span>个人资料</span><i /></button>
          <button class="adx-account-menu__item has-submenu" type="button" :aria-expanded="themeOpen" @click.stop="themeOpen = !themeOpen"><SunMoon class="adx-icon" /><span>主题设置</span><small>{{ themeNames[preference] }}</small><ChevronRight class="adx-icon" /></button>
          <div v-if="themeOpen" class="adx-theme-menu" role="menu">
            <button v-for="option in themeOptions" :key="option.value" class="adx-theme-option" :class="{ active: preference === option.value }" type="button" @click="selectTheme(option.value)">
              <span class="adx-theme-option__icon"><component :is="option.icon" class="adx-icon" /></span>
              <span class="adx-theme-option__copy"><strong>{{ option.label }}</strong><small>{{ option.hint }}</small></span>
              <Check v-if="preference === option.value" class="adx-icon" />
            </button>
          </div>
          <button class="adx-account-menu__item" type="button" @click="toast.show('当前没有新的通知'); accountOpen = false"><Bell class="adx-icon" /><span>通知中心</span><small class="adx-menu-count">3</small><i /></button>
          <div class="adx-account-menu__divider" />
          <button class="adx-account-menu__item danger" type="button" @click="logout"><LogOut class="adx-icon" /><span>退出登录</span><i /></button>
        </div>
      </div>
    </aside>

    <main class="adx-workspace">
      <RouterView />
    </main>
  </div>
</template>
