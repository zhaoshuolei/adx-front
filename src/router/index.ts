import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/auth/lenovoid/callback',
    name: 'lenovoid-callback',
    component: () => import('@/views/LenovoCallbackView.vue'),
    meta: { public: true, title: '联想一键登录' },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/overview',
    children: [
      {
        path: 'overview',
        name: 'overview',
        component: () => import('@/views/OverviewView.vue'),
        meta: { title: '投放总览', module: '经营中心', phase: 'P0' },
      },
      {
        path: 'runtime',
        name: 'runtime',
        component: () => import('@/views/RuntimeView.vue'),
        meta: { title: '实时信号', module: '经营中心', phase: 'P0' },
      },
      {
        path: 'revenue',
        name: 'revenue',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: '收益分析', module: '经营中心', phase: 'P1' },
      },
      {
        path: 'reconciliation',
        name: 'reconciliation',
        component: () => import('@/views/ReconciliationView.vue'),
        meta: { title: '三方对账', module: '数据报表', phase: 'P0' },
      },
      {
        path: 'reports/trends',
        name: 'report-trends',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: '核心趋势', module: '数据报表', phase: 'P1' },
      },
      {
        path: 'reports/special',
        name: 'report-special',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: '专项报表', module: '数据报表', phase: 'P1' },
      },
      {
        path: 'event-logs',
        name: 'event-logs',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: '事件上报日志', module: '数据报表', phase: 'P2' },
      },
      {
        path: 'ad-spaces',
        name: 'ad-spaces',
        component: () => import('@/views/AdSpacesView.vue'),
        meta: { title: '广告位管理', module: '广告运营', phase: 'P0' },
      },
      {
        path: 'media',
        name: 'media',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: '媒体与公司', module: '广告运营', phase: 'P0' },
      },
      {
        path: 'ad-sources',
        name: 'ad-sources',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: 'DSP 广告源', module: '广告运营', phase: 'P0' },
      },
      {
        path: 'strategies',
        name: 'strategies',
        component: () => import('@/views/StrategyView.vue'),
        meta: { title: '策略管理', module: '广告运营', phase: 'P0' },
      },
      {
        path: 'fallback-ads',
        name: 'fallback-ads',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: '兜底广告', module: '广告运营', phase: 'P1' },
      },
      {
        path: 'dsp',
        name: 'dsp',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: 'DSP 配置', module: '广告运营', phase: 'P0' },
      },
      {
        path: 'billing/dsp',
        name: 'dsp-billing',
        component: () => import('@/views/BillsView.vue'),
        meta: { title: 'DSP 账单', module: '财务结算', phase: 'P0' },
      },
      {
        path: 'settlements/dsp',
        name: 'dsp-settlement',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: 'DSP 结算', module: '财务结算', phase: 'P1' },
      },
      {
        path: 'settlements/media',
        name: 'media-settlement',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: '媒体结算', module: '财务结算', phase: 'P1' },
      },
      {
        path: 'system/users',
        name: 'users',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: '用户管理', module: '系统设置', phase: 'P0' },
      },
      {
        path: 'system/roles',
        name: 'roles',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: '角色权限', module: '系统设置', phase: 'P0' },
      },
      {
        path: 'system/runtime-config',
        name: 'runtime-config',
        component: () => import('@/views/RuntimeConfigView.vue'),
        meta: { title: '运行时配置', module: '系统设置', phase: 'P0' },
      },
      {
        path: 'system/dictionaries',
        name: 'dictionaries',
        component: () => import('@/views/DictionaryView.vue'),
        meta: { title: '字典管理', module: '系统设置', phase: 'P1' },
      },
      {
        path: 'system/client-sdks',
        name: 'client-sdks',
        component: () => import('@/views/CatalogView.vue'),
        meta: { title: 'Client SDK', module: '系统设置', phase: 'P1' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'overview' }
  return true
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title || 'ADX 管理台')} · ADX`
})

export default router
