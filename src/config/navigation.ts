import type { Component } from 'vue'
import {
  Activity,
  BarChart3,
  Building2,
  LayoutDashboard,
  Layers3,
  Network,
  PanelsTopLeft,
  ReceiptText,
  Scale,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-vue-next'

export type ModuleKey = 'operation' | 'reports' | 'advertising' | 'finance' | 'settings'

export interface NavItem {
  title: string
  route: string
  icon: Component
  count?: number
}

export interface NavGroup {
  module: ModuleKey
  label: string
  items: NavItem[]
}

export const modules: Array<{ key: ModuleKey; label: string; route: string }> = [
  { key: 'operation', label: '经营中心', route: '/overview' },
  { key: 'reports', label: '数据报表', route: '/reconciliation' },
  { key: 'advertising', label: '广告运营', route: '/ad-spaces' },
  { key: 'finance', label: '财务结算', route: '/billing/dsp' },
  { key: 'settings', label: '系统设置', route: '/system/users' },
]

export const navigationGroups: NavGroup[] = [
  {
    module: 'operation',
    label: '经营中心',
    items: [
      { title: '投放总览', route: '/overview', icon: LayoutDashboard },
      { title: '实时信号', route: '/runtime', icon: Activity, count: 5 },
    ],
  },
  {
    module: 'reports',
    label: '数据报表',
    items: [
      { title: '三方对账', route: '/reconciliation', icon: Scale, count: 3 },
    ],
  },
  {
    module: 'advertising',
    label: '广告运营',
    items: [
      { title: '广告位管理', route: '/ad-spaces', icon: PanelsTopLeft },
      { title: '媒体与公司', route: '/media', icon: Building2 },
      { title: 'DSP 广告源', route: '/ad-sources', icon: Network },
      { title: '策略管理', route: '/strategies', icon: Layers3, count: 2 },
      { title: 'DSP 配置', route: '/dsp', icon: BarChart3 },
    ],
  },
  {
    module: 'finance',
    label: '财务结算',
    items: [
      { title: 'DSP 账单', route: '/billing/dsp', icon: ReceiptText },
    ],
  },
  {
    module: 'settings',
    label: '系统设置',
    items: [
      { title: '用户管理', route: '/system/users', icon: Users },
      { title: '角色权限', route: '/system/roles', icon: ShieldCheck },
      { title: '运行时配置', route: '/system/runtime-config', icon: SlidersHorizontal },
    ],
  },
]

export function moduleForRoute(path: string): ModuleKey {
  const match = navigationGroups.find((group) => group.items.some((item) => path.startsWith(item.route)))
  return match?.module || 'operation'
}
